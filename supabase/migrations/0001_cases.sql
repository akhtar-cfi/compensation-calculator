-- Case agent: judgments pulled from the Indian Kanoon API, verified extractions, precedents,
-- human reviews (mirrored from a Google Sheet), the paid-call ledger and the agent's runs.
--
-- Access model: this database is private. Row level security is enabled on every table and NO
-- policies are created, so the anon and authenticated roles can read or write nothing. The agent
-- uses the service role key, which bypasses RLS. Views are created with security_invoker so they
-- apply the caller's RLS (a view owned by postgres would otherwise expose the tables), and the
-- client roles' grants are revoked as a second lock. Full judgment text lives only here.

-- Judgments as fetched (full text; never copied to the public repo or the Sheet).
create table public.judgments (
  tid bigint primary key,
  title text,
  court text,
  doctype text,
  state_code text,
  court_level text check (court_level in ('sc', 'hc', 'tribunal')),
  decision_date date,
  url text,
  numcitedby int,
  text text,
  text_sha256 text,
  fetched_at timestamptz not null default now(),
  run_id uuid
);
create index judgments_state_level on public.judgments (state_code, court_level);

-- Structured extraction of an award (payload) with the verbatim quotes behind it (evidence).
create table public.extractions (
  id uuid primary key default gen_random_uuid(),
  tid bigint not null references public.judgments (tid) on delete cascade,
  schema_version int not null,
  payload jsonb not null,
  evidence jsonb not null default '[]'::jsonb,
  verify_status text not null check (verify_status in ('verified', 'partial', 'failed')),
  verifier_report jsonb,
  run_id uuid,
  created_at timestamptz not null default now(),
  unique (tid, schema_version)
);

-- A judgment's holding, where it lays down law (mostly Supreme Court and High Courts).
create table public.precedents (
  tid bigint primary key references public.judgments (tid) on delete cascade,
  binding_scope text not null check (binding_scope in ('all_india', 'state', 'none')),
  state_code text,
  topics text[] not null default '{}',
  holding text,
  para text,
  quote text,
  departs_from_rules boolean not null default false,
  rule_id text,
  created_at timestamptz not null default now()
);

-- Human review of an extraction (target_id = extractions.id) or a precedent (target_id = tid).
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('extraction', 'precedent')),
  target_id text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'needs_fix')),
  reviewer text,
  notes text,
  source text not null default 'sheet',
  updated_at timestamptz not null default now(),
  unique (target_kind, target_id)
);

-- Every uncached, paid Indian Kanoon call. ledger_key is set only for rows imported from a local
-- ledger.jsonl, so re-importing the same ledger adds nothing.
create table public.ik_calls (
  id bigserial primary key,
  at timestamptz not null default now(),
  endpoint text not null,
  path text not null,
  cost numeric(8, 2) not null,
  run_id uuid,
  ledger_key text unique
);
create index ik_calls_at on public.ik_calls (at);

-- One row per agent run; slot holds the rotation cursor the next run continues from.
create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  slot jsonb,
  spend numeric(8, 2) not null default 0,
  fetched int not null default 0,
  extracted int not null default 0,
  verified int not null default 0,
  failed int not null default 0,
  notes text,
  error text
);
create index agent_runs_started on public.agent_runs (started_at desc);

alter table public.judgments enable row level security;
alter table public.extractions enable row level security;
alter table public.precedents enable row level security;
alter table public.reviews enable row level security;
alter table public.ik_calls enable row level security;
alter table public.agent_runs enable row level security;

-- A date from a JSON text value, or null when it is missing or not a valid date.
create function public.try_date(t text) returns date
language plpgsql stable set search_path = '' as $$
begin
  return t::date;
exception when others then
  return null;
end $$;

-- Extractions and precedents still waiting for a human decision (no approved/rejected review).
create view public.review_queue with (security_invoker = true) as
select 'extraction'::text as target_kind, e.id::text as target_id, e.tid,
       coalesce(r.status, 'pending') as status, r.notes, e.created_at
from public.extractions e
left join public.reviews r on r.target_kind = 'extraction' and r.target_id = e.id::text
where r.status is null or r.status not in ('approved', 'rejected')
union all
select 'precedent', p.tid::text, p.tid, coalesce(r.status, 'pending'), r.notes, p.created_at
from public.precedents p
left join public.reviews r on r.target_kind = 'precedent' and r.target_id = p.tid::text
where r.status is null or r.status not in ('approved', 'rejected');

-- Judgments that have no extraction yet; SC first, then HCs, then tribunals, newest first.
create view public.pending_extraction with (security_invoker = true) as
select j.tid, j.title, j.court, j.state_code, j.court_level, j.decision_date,
       case j.court_level when 'sc' then 0 when 'hc' then 1 else 2 end as priority
from public.judgments j
where not exists (select 1 from public.extractions e where e.tid = j.tid);

-- Practice by state and court level, from the latest usable, non-failed extraction of each
-- judgment that a reviewer has not rejected. The state is the one the claim came from when the
-- extraction records it (so a Supreme Court appeal counts for its state), else the court's.
-- Days and rates are medians (percentile_cont ignores nulls).
create view public.state_practice with (security_invoker = true) as
with latest as (
  select distinct on (e.tid) e.*
  from public.extractions e
  order by e.tid, e.schema_version desc
)
select coalesce(e.payload ->> 'state_code', j.state_code) as state_code, j.court_level, count(*)::int as n,
  percentile_cont(0.5) within group (
    order by public.try_date(e.payload ->> 'award_date') - public.try_date(e.payload ->> 'accident_date')
  ) as median_days_accident_to_award,
  percentile_cont(0.5) within group (
    order by public.try_date(e.payload ->> 'award_date') - public.try_date(e.payload ->> 'filing_date')
  ) as median_days_filing_to_award,
  percentile_cont(0.5) within group (
    order by case when jsonb_typeof(e.payload -> 'interest_rate_pct') = 'number'
                  then (e.payload ->> 'interest_rate_pct')::numeric end
  ) as median_interest_rate_pct
from latest e
join public.judgments j on j.tid = e.tid
where e.verify_status <> 'failed'
  and coalesce(e.payload ->> 'usable', 'true') <> 'false'
  and not exists (
    select 1 from public.reviews r
    where r.target_kind = 'extraction' and r.target_id = e.id::text and r.status = 'rejected'
  )
group by 1, 2;

-- Indian Kanoon spend per calendar day in India (Asia/Kolkata).
create view public.ik_spend_daily with (security_invoker = true) as
select (at at time zone 'Asia/Kolkata')::date as day, count(*)::int as calls, sum(cost) as spend
from public.ik_calls
group by 1;

-- Rupees spent on Indian Kanoon so far today (Asia/Kolkata). The daily budget reads this before
-- every paid call, so the cap holds across processes.
create function public.ik_spend_today() returns numeric
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(cost), 0)
  from public.ik_calls
  where at >= ((now() at time zone 'Asia/Kolkata')::date)::timestamp at time zone 'Asia/Kolkata'
$$;

revoke all on public.judgments, public.extractions, public.precedents, public.reviews,
  public.ik_calls, public.agent_runs from anon, authenticated;
revoke all on public.review_queue, public.pending_extraction, public.state_practice,
  public.ik_spend_daily from anon, authenticated;
revoke all on sequence public.ik_calls_id_seq from anon, authenticated;
revoke execute on function public.ik_spend_today(), public.try_date(text) from public, anon, authenticated;
grant execute on function public.ik_spend_today(), public.try_date(text) to service_role;

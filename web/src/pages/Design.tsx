import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { HardHat, House, Landmark } from "lucide-preact";
import { Button, LinkButton, Notice, Page } from "../components/ui";
import {
  Checkbox,
  Counter,
  DateInput,
  MoneyInput,
  MonthYear,
  Radios,
  Reveal,
  Select,
  TextInput,
} from "../components/form";
import { AnswerPanel, Checklist, Disclosure, RangeBar } from "../components/result";
import { COMPONENTS, DEVIATIONS, EVIDENCE, PRINCIPLES } from "../design/catalog";

const DEMOS = new Set([
  "Radio chips (row / stack / grid)",
  "Month and year",
  "Select",
  "Date input (day / month / year)",
  "Money input",
  "Number input",
  "Counter",
  "Checkbox",
  "Reveal",
  "Inline errors and 'answers left'",
  "Notice (info / caution / stop)",
  "Estimate card",
  "Range",
  "Accordion",
  "Checklist",
  "Buttons",
]);

/** Live examples for the gallery, keyed by component name (the real components, in throwaway state). */
function Demo(props: { name: string }) {
  const [radio, setRadio] = useState("");
  const [yn, setYn] = useState("");
  const [work, setWork] = useState("");
  const [month, setMonth] = useState("2025-6-");
  const [sel, setSel] = useState("");
  const [date, setDate] = useState("2025-6-15");
  const [money, setMoney] = useState("250000");
  const [num, setNum] = useState("35");
  const [count, setCount] = useState("");
  const [box, setBox] = useState(false);
  switch (props.name) {
    case "Radio chips (row / stack / grid)":
      return (
        <div class="grid gap-6">
          <Radios
            id="demo-work"
            layout="grid"
            label="What work did they do?"
            value={work}
            onChange={setWork}
            options={[
              { value: "permanent", label: "Permanent job", icon: Landmark },
              { value: "informal", label: "Daily wage or informal work", icon: HardHat },
              { value: "homemaker", label: "Homemaker", icon: House },
            ]}
          />
          <Radios
            id="demo-radio"
            layout="stack"
            label="Was the vehicle that caused the accident identified?"
            value={radio}
            onChange={setRadio}
            options={[
              { value: "insured", label: "Yes, and it was insured" },
              {
                value: "untraced",
                label: "No, it was never traced",
                hint: "A hit-and-run: the claim goes to a different scheme",
              },
            ]}
          />
          <Radios
            id="demo-yn"
            label="Was the person married?"
            value={yn}
            onChange={setYn}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </div>
      );
    case "Month and year":
      return (
        <MonthYear
          id="demo-month"
          label="When did the accident happen?"
          hint="Month and year are enough."
          fromYear={2020}
          toYear={2026}
          value={month}
          onInput={setMonth}
        />
      );
    case "Select":
      return (
        <Select
          id="demo-select"
          label="Occupation"
          value={sel}
          onChange={setSel}
          options={[
            { value: "", label: "Not in this list, or not sure" },
            { value: "driver", label: "Driver" },
            { value: "mason", label: "Mason" },
          ]}
        />
      );
    case "Date input (day / month / year)":
      return (
        <DateInput
          id="demo-date"
          label="Date the claim was filed"
          hint="For example, 15 6 2025"
          value={date}
          onInput={setDate}
        />
      );
    case "Money input":
      return (
        <MoneyInput id="demo-money" label="Monthly salary" per="a month" value={money} onInput={setMoney} />
      );
    case "Number input":
      return (
        <TextInput
          id="demo-num"
          numeric
          width="xs"
          suffix="years"
          label="Age at the time of the accident"
          value={num}
          onInput={setNum}
        />
      );
    case "Counter":
      return (
        <Counter
          id="demo-count"
          noun="children"
          label="Children who are claimants"
          value={count}
          onInput={setCount}
        />
      );
    case "Checkbox":
      return (
        <Checkbox id="demo-box" label="Needs an attendant permanently" checked={box} onChange={setBox} />
      );
    case "Reveal":
      return (
        <Reveal>
          <MoneyInput
            id="demo-reveal"
            label="Income in the latest return (₹ a year)"
            per="a year"
            value="400000"
            onInput={() => undefined}
          />
        </Reveal>
      );
    case "Inline errors and 'answers left'":
      return (
        <div class="grid gap-4">
          <TextInput
            id="demo-err"
            numeric
            width="xs"
            label="Age at the time of the accident"
            error="Enter a number between 0 and 120."
            value="250"
            onInput={() => undefined}
          />
          <p class="text-sm font-semibold">3 answers still needed</p>
        </div>
      );
    case "Notice (info / caution / stop)":
      return (
        <div class="grid gap-3">
          <Notice severity="stop" title="The claim for full compensation has lapsed">
            Shown only for an answer that ends the claim.
          </Notice>
          <Notice severity="caution" title="The minimum wage may be out of date">
            Something that can change the number.
          </Notice>
          <Notice severity="info" title="Not a prediction">
            Context.
          </Notice>
        </div>
      );
    case "Estimate card":
      return (
        <AnswerPanel
          approx="₹56 lakh"
          exact={5557500}
          meaning="What the Supreme Court's method gives on these facts."
        />
      );
    case "Range":
      return <RangeBar conservative={3457315} standard={5557500} claimantMax={5589000} />;
    case "Accordion":
      return (
        <Disclosure id="demo-disc" title="How it is built">
          <p class="text-muted-foreground">Secondary detail, opened on demand and always printed.</p>
        </Disclosure>
      );
    case "Checklist":
      return <Checklist items={["FIR and the police Detailed Accident Report (DAR)", "Proof of age"]} />;
    case "Buttons":
      return (
        <div class="flex flex-wrap gap-3">
          <Button arrow>Continue</Button>
          <Button secondary>Copy summary</Button>
          <LinkButton href="#/design" secondary>
            How it is calculated
          </LinkButton>
        </div>
      );
    default:
      return null;
  }
}

function Block(props: { title: string; children: ComponentChildren }) {
  return (
    <section class="mt-12">
      <h2 class="font-heading text-xl font-bold tracking-tight">{props.title}</h2>
      <div class="mt-4">{props.children}</div>
    </section>
  );
}

/** The design system, live: principles, evidence, deviations and every component with its rules. */
export function Design() {
  return (
    <div class="bg-subtle">
      <Page narrow>
        <p class="text-xs font-semibold tracking-[0.2em] text-brand uppercase">Design system</p>
        <h1
          id="page-title"
          tabIndex={-1}
          class="mt-3 font-heading text-3xl font-bold tracking-tight outline-none sm:text-4xl"
        >
          How this tool is designed
        </h1>
        <p class="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          The components used on this site, when to use each one, and why. The tokens are crashfreeindia.org's
          own. Generated from the same catalogue as docs/ui-design-system.md in the repository.
        </p>

        <Block title="Evidence">
          <ul class="grid gap-3">
            {EVIDENCE.map((e) => (
              <li key={e.source} class="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p class="text-foreground">{e.finding}</p>
                <p class="mt-1 text-sm text-muted-foreground">{e.source}</p>
                <p class="mt-2 text-sm font-medium text-foreground">{e.consequence}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Principles">
          <ul class="grid gap-3 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <li key={p.title} class="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p class="font-semibold text-foreground">{p.title}</p>
                <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </li>
            ))}
          </ul>
        </Block>

        <Block title="Components">
          <div class="grid gap-6">
            {COMPONENTS.map((c) => (
              <article
                key={c.name}
                class="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
                data-component={c.name}
              >
                <h3 class="font-heading text-lg font-semibold">{c.name}</h3>
                <dl class="mt-2 grid gap-1 text-sm">
                  <div>
                    <dt class="inline font-semibold">Use for: </dt>
                    <dd class="inline text-muted-foreground">{c.use}</dd>
                  </div>
                  <div>
                    <dt class="inline font-semibold">Not for: </dt>
                    <dd class="inline text-muted-foreground">{c.avoid}</dd>
                  </div>
                </dl>
                <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {c.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                {DEMOS.has(c.name) && (
                  <div class="mt-4 rounded-lg border border-dashed border-border bg-subtle p-3 sm:p-4">
                    <Demo name={c.name} />
                  </div>
                )}
              </article>
            ))}
          </div>
        </Block>

        <Block title="Deviations from the website's design system">
          <ul class="grid gap-3">
            {DEVIATIONS.map((d) => (
              <li key={d.what} class="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p class="font-semibold text-foreground">{d.what}</p>
                <p class="mt-1 text-sm text-muted-foreground">{d.why}</p>
              </li>
            ))}
          </ul>
        </Block>
      </Page>
    </div>
  );
}

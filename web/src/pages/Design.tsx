import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Button, LinkButton, Notice, ToolPage } from "../components/ui";
import {
  Checkbox,
  Counter,
  DateInput,
  ErrorSummary,
  MoneyInput,
  Radios,
  Reveal,
  Select,
  TextInput,
} from "../components/form";
import { AnswerPanel, Checklist, Disclosure, RangeBar, SummaryList } from "../components/result";
import { COMPONENTS, DEVIATIONS, EVIDENCE, PRINCIPLES } from "../design/catalog";

const DEMOS = new Set([
  "Radios (large / compact)",
  "Select",
  "Date input (day / month / year)",
  "Money input",
  "Number input",
  "Counter",
  "Checkbox",
  "Reveal",
  "Error summary and inline errors",
  "Check your answers",
  "Notice (info / caution / stop)",
  "Answer panel",
  "Range",
  "Disclosure",
  "Checklist",
  "Buttons",
]);

/** Live examples for the gallery, keyed by component name (the real components, in throwaway state). */
function Demo(props: { name: string }) {
  const [radio, setRadio] = useState("");
  const [yn, setYn] = useState("");
  const [sel, setSel] = useState("");
  const [date, setDate] = useState("2025-6-15");
  const [money, setMoney] = useState("250000");
  const [num, setNum] = useState("35");
  const [count, setCount] = useState("");
  const [box, setBox] = useState(false);
  switch (props.name) {
    case "Radios (large / compact)":
      return (
        <div class="grid gap-6">
          <Radios
            id="demo-radio"
            label="What happened to the person?"
            value={radio}
            onChange={setRadio}
            options={[
              { value: "death", label: "They died" },
              {
                value: "injury",
                label: "They were injured",
                hint: "Any injury, with or without a disability certificate",
              },
            ]}
          />
          <Radios
            id="demo-yn"
            size="compact"
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
    case "Select":
      return (
        <Select
          id="demo-select"
          label="State where the claim is filed"
          value={sel}
          onChange={setSel}
          options={[
            { value: "", label: "Choose" },
            { value: "DL", label: "Delhi" },
            { value: "HR", label: "Haryana" },
          ]}
        />
      );
    case "Date input (day / month / year)":
      return (
        <DateInput
          id="demo-date"
          label="When did the accident happen?"
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
    case "Error summary and inline errors":
      return (
        <div>
          <ErrorSummary
            items={[
              { id: "demo-err", message: "Age at the time of the accident: Please answer this question." },
            ]}
          />
          <TextInput
            id="demo-err"
            numeric
            width="xs"
            label="Age at the time of the accident"
            error="Please answer this question."
            value=""
            onInput={() => undefined}
          />
        </div>
      );
    case "Check your answers":
      return (
        <SummaryList
          change="Change"
          rows={[
            { id: "a", key: "What happened to the person?", value: "They died", href: "#/design" },
            { id: "b", key: "When did the accident happen?", value: "15/06/2025", href: "#/design" },
          ]}
        />
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
    case "Answer panel":
      return (
        <AnswerPanel
          approx="₹56 lakh"
          exact={5557500}
          meaning="What the Supreme Court's method gives on these facts."
        />
      );
    case "Range":
      return (
        <RangeBar
          conservative={3457315}
          standard={5557500}
          claimantMax={5589000}
          labels={{ conservative: "Conservative", standard: "Standard", claimantMax: "Claimant's best case" }}
        />
      );
    case "Disclosure":
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
          <Button secondary>Start again</Button>
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
      <h2 class="font-heading text-2xl font-bold tracking-tight">{props.title}</h2>
      <div class="mt-4">{props.children}</div>
    </section>
  );
}

/** The design system, live: principles, evidence, deviations and every component with its rules. */
export function Design() {
  return (
    <ToolPage wide>
      <p class="text-xs font-medium tracking-[0.25em] text-brand">DESIGN SYSTEM</p>
      <h1
        id="page-title"
        tabIndex={-1}
        class="mt-3 font-heading text-3xl font-bold tracking-tight outline-none sm:text-4xl"
      >
        How this tool is designed
      </h1>
      <p class="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
        The components used on this site, when to use each one, and why. Generated from the same catalogue as
        docs/ui-design-system.md in the repository.
      </p>

      <Block title="Evidence">
        <ul class="grid gap-3">
          {EVIDENCE.map((e) => (
            <li key={e.source} class="rounded-2xl border border-border p-4">
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
            <li key={p.title} class="rounded-2xl border border-border p-4">
              <p class="font-semibold text-foreground">{p.title}</p>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Components">
        <div class="grid gap-6">
          {COMPONENTS.map((c) => (
            <article key={c.name} class="rounded-2xl border border-border p-4 sm:p-5" data-component={c.name}>
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
                <div class="mt-4 rounded-xl bg-brand-lite p-3 sm:p-4">
                  <Demo name={c.name} />
                </div>
              )}
            </article>
          ))}
        </div>
      </Block>

      <Block title="Deviations from the Crashfree India design system">
        <ul class="grid gap-3">
          {DEVIATIONS.map((d) => (
            <li key={d.what} class="rounded-2xl border border-border p-4">
              <p class="font-semibold text-foreground">{d.what}</p>
              <p class="mt-1 text-sm text-muted-foreground">{d.why}</p>
            </li>
          ))}
        </ul>
      </Block>
    </ToolPage>
  );
}

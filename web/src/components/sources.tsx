import { rules } from "../data";

const SPECIAL: Record<string, string> = {
  mv_act_1988: "MV Act 1988",
  delhi_awards_backtest_2026: "Delhi awards back-test",
};

/** Short display name for a source id: "pranay_sethi_2017" -> "Pranay Sethi (2017)". */
export function shortSource(id: string): string {
  if (SPECIAL[id]) return SPECIAL[id];
  const m = /^(.*)_(\d{4})$/.exec(id);
  const words = (m ? m[1]! : id).split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return m ? `${words.join(" ")} (${m[2]})` : words.join(" ");
}

/** Links each cited source to its primary text, as listed in rules/sources.yaml. */
export function SourceLinks(props: { ids: readonly string[] }) {
  return (
    <>
      {props.ids.map((id, i) => {
        const s = rules.sources.find((x) => x.id === id);
        const label = shortSource(id);
        return (
          <span key={id}>
            {i > 0 && ", "}
            {s?.url ? (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.title}
                class="text-brand underline underline-offset-2"
              >
                {label}
              </a>
            ) : (
              <span title={s?.title}>{label}</span>
            )}
          </span>
        );
      })}
    </>
  );
}

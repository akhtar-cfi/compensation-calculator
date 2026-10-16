import type { Warning, WarningCode } from "./types.js";

/** Collects warnings, one per code (first message wins). */
export class WarningSink {
  private readonly items = new Map<WarningCode, Warning>();
  add(code: WarningCode, severity: Warning["severity"], message: string, vars?: Warning["vars"]): void {
    if (!this.items.has(code))
      this.items.set(code, vars ? { code, severity, message, vars } : { code, severity, message });
  }
  list(): Warning[] {
    const rank = { stop: 0, caution: 1, info: 2 } as const;
    return [...this.items.values()].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }
}

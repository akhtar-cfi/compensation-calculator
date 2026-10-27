/**
 * The four ways of answering, offered on the first screen. One set of answers is shared by all four: switching keeps
 * every answer. This phone remembers only which one was chosen (localStorage holds this one word, never an answer).
 */
export const MODES = ["slow", "chat", "all", "detail"] as const;
export type Mode = (typeof MODES)[number];

export const isMode = (x: unknown): x is Mode => (MODES as readonly unknown[]).includes(x);

export const modeHref = (m: Mode): string => `#/${m}`;

/** Where the chosen way of answering is remembered on this phone. */
export const MODE_KEY = "mact-calculator.mode";

export const parseStoredMode = (raw: string | null): Mode | undefined => (isMode(raw) ? raw : undefined);

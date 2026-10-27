/**
 * Settings for the case agent, read from the environment. Values are never printed: errors name the
 * variable, and `describeConfig` shows only the Supabase host and whether each key is set.
 */
export interface SupabaseConfig {
  supabaseUrl: string;
  serviceRoleKey: string;
}
export interface AgentConfig extends SupabaseConfig {
  ikToken: string;
}

export type Env = Record<string, string | undefined>;

export class ConfigError extends Error {}

const HINTS: Record<string, string> = {
  SUPABASE_URL: "the project URL, e.g. https://<project-ref>.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "the service role key from the Supabase project's API settings",
  IK_API_TOKEN: "the Indian Kanoon API token",
};

function need(env: Env, name: string): string {
  const v = env[name]?.trim();
  if (!v) throw new ConfigError(`${name} is not set (${HINTS[name] ?? "required"}).`);
  return v;
}

/** Supabase settings only (enough for every command that does not call Indian Kanoon). */
export function readSupabaseConfig(env: Env = process.env): SupabaseConfig {
  const url = need(env, "SUPABASE_URL");
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ConfigError(`SUPABASE_URL is not a valid URL (${HINTS["SUPABASE_URL"]}).`);
  }
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1")
    throw new ConfigError("SUPABASE_URL must use https.");
  return { supabaseUrl: url.replace(/\/+$/, ""), serviceRoleKey: need(env, "SUPABASE_SERVICE_ROLE_KEY") };
}

/** Every setting the daily fetch needs. */
export function readAgentConfig(env: Env = process.env): AgentConfig {
  return { ...readSupabaseConfig(env), ikToken: need(env, "IK_API_TOKEN") };
}

/** True when both Supabase variables are present (used by --dry-run, which can run without them). */
export const hasSupabaseConfig = (env: Env = process.env): boolean =>
  Boolean(env["SUPABASE_URL"]?.trim() && env["SUPABASE_SERVICE_ROLE_KEY"]?.trim());

/** A one-line, secret-free description of the configuration. */
export function describeConfig(c: Partial<AgentConfig>): string {
  const host = c.supabaseUrl ? new URL(c.supabaseUrl).host : "unset";
  return `supabase ${host} · service key ${c.serviceRoleKey ? "set" : "unset"} · IK token ${c.ikToken ? "set" : "unset"}`;
}

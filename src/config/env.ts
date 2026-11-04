/**
 * Environment validation. Dependency-free on purpose so it runs anywhere.
 * Errors list variable NAMES only, never values (secrets must not leak into logs).
 */
export const APP_ENVS = ["local", "development", "staging", "production"] as const;
export type AppEnv = (typeof APP_ENVS)[number];

export class ConfigError extends Error {
  readonly problems: readonly string[];
  constructor(problems: readonly string[]) {
    super(`Invalid configuration: ${problems.join("; ")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

export interface ServerEnv {
  readonly appEnv: AppEnv;
  readonly appUrl: string;
  readonly supabaseUrl: string;
  readonly supabaseAnonKey: string;
  readonly supabaseServiceRoleKey: string;
  readonly databaseUrl: string;
  readonly cronSecret: string;
  /** null = not approved yet (decision D1). Registration must stay closed when null. */
  readonly minAge: number | null;
  readonly geminiApiKey: string | undefined;
}

/**
 * Decision D1 safe default: an 18 floor applies in local/development/staging
 * ONLY. In production the value must be explicitly configured after legal
 * approval; until then this returns null and registration stays disabled.
 */
export function resolveMinAge(appEnv: AppEnv, raw: string | undefined): number | null {
  if (raw !== undefined && raw !== "") {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 18 || n > 99) {
      throw new ConfigError(["REGISTRATION_MIN_AGE must be a whole number between 18 and 99"]);
    }
    return n;
  }
  return appEnv === "production" ? null : 18;
}

type Source = Record<string, string | undefined>;

export function parseServerEnv(source: Source): ServerEnv {
  const problems: string[] = [];
  const need = (name: string): string => {
    const v = source[name];
    if (v === undefined || v.trim() === "") {
      problems.push(`${name} is required`);
      return "";
    }
    return v;
  };

  const appEnvRaw = need("APP_ENV");
  const appEnv = (APP_ENVS as readonly string[]).includes(appEnvRaw) ? (appEnvRaw as AppEnv) : "local";
  if (appEnvRaw !== "" && !(APP_ENVS as readonly string[]).includes(appEnvRaw)) {
    problems.push(`APP_ENV must be one of ${APP_ENVS.join(", ")}`);
  }

  const env = {
    appUrl: need("NEXT_PUBLIC_APP_URL"),
    supabaseUrl: need("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: need("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: need("SUPABASE_SERVICE_ROLE_KEY"),
    databaseUrl: need("DATABASE_URL"),
    cronSecret: need("CRON_SECRET"),
  };

  if (env.cronSecret !== "" && env.cronSecret.length < 32) {
    problems.push("CRON_SECRET must be at least 32 characters");
  }
  if (appEnv === "production" && env.appUrl !== "" && !env.appUrl.startsWith("https://")) {
    problems.push("NEXT_PUBLIC_APP_URL must be https in production");
  }

  let minAge: number | null = null;
  try {
    minAge = resolveMinAge(appEnv, source["REGISTRATION_MIN_AGE"]);
  } catch (e) {
    problems.push(
      e instanceof ConfigError
        ? (e.problems[0] ?? "invalid REGISTRATION_MIN_AGE")
        : "invalid REGISTRATION_MIN_AGE",
    );
  }

  if (problems.length > 0) throw new ConfigError(problems);

  return { appEnv, ...env, minAge, geminiApiKey: source["GEMINI_API_KEY"] || undefined };
}

import type { AppEnv } from "../../config/env.ts";

/**
 * Feature flags (handbook ADM-012, App. A). Registry holds the SAFE DEFAULT
 * for every flag (decisions D7, D9, D12, D14: everything risky is off).
 * Database rows (admin.feature_flags) may override per environment/country;
 * the most specific matching row wins.
 */
export const FLAG_DEFAULTS = {
  "registration.open": false,
  "ai.profile_writing": false,
  "ai.profile_summary": false,
  "ai.recommendation_explanations": false,
  "ai.conversation_starters": false,
  "messaging.chat_images": false,
  "messaging.read_receipts": false,
  "discovery.filter_religion": false,
  "premium.manual_grants": true,
  "analytics.first_party": true,
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;

export interface FlagRow {
  readonly key: string;
  readonly enabled: boolean;
  /** null = all environments */
  readonly environment: AppEnv | null;
  /** ISO country code, null = all countries */
  readonly country: string | null;
}

export interface FlagContext {
  readonly env: AppEnv;
  readonly country?: string;
}

export function isEnabled(key: FlagKey, ctx: FlagContext, rows: readonly FlagRow[] = []): boolean {
  let best: { score: number; enabled: boolean } | null = null;
  for (const row of rows) {
    if (row.key !== key) continue;
    if (row.environment !== null && row.environment !== ctx.env) continue;
    if (row.country !== null && row.country !== ctx.country) continue;
    const score = (row.environment !== null ? 1 : 0) + (row.country !== null ? 2 : 0);
    if (best === null || score > best.score) best = { score, enabled: row.enabled };
  }
  return best !== null ? best.enabled : FLAG_DEFAULTS[key];
}

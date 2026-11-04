import { test } from "node:test";
import assert from "node:assert/strict";

import { AppError } from "../../src/server/http/errors.ts";
import { fail, ok } from "../../src/server/http/envelope.ts";
import { apiHandler, resolveCorrelationId } from "../../src/server/http/api-handler.ts";
import { createLogger, redact } from "../../src/server/observability/logger.ts";
import { ConfigError, parseServerEnv, resolveMinAge } from "../../src/config/env.ts";
import { FLAG_DEFAULTS, isEnabled, type FlagRow } from "../../src/server/flags/flags.ts";

const meta = { correlationId: "test-correlation-1" };

// ---------- envelope & errors ----------
test("ok() wraps data in the success envelope with no-store caching", async () => {
  const res = ok({ a: 1 }, meta);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");
  assert.deepEqual(await res.json(), { success: true, data: { a: 1 }, meta });
});

test("fail() maps AppError to its status and stable code", async () => {
  const res = fail(new AppError("RATE_LIMITED", "Slow down."), meta);
  assert.equal(res.status, 429);
  const body = (await res.json()) as { success: boolean; error: { code: string } };
  assert.equal(body.success, false);
  assert.equal(body.error.code, "RATE_LIMITED");
});

test("fail() never leaks internal error text for unknown errors", async () => {
  const res = fail(new Error('relation "identity.accounts" does not exist at SELECT secret'), meta);
  assert.equal(res.status, 500);
  const text = await res.text();
  assert.ok(!text.includes("identity.accounts"));
  assert.ok(!text.includes("SELECT"));
  assert.ok(text.includes("INTERNAL"));
});

// ---------- api handler ----------
test("resolveCorrelationId accepts valid ids and replaces malformed ones", () => {
  const good = new Request("http://x/", { headers: { "x-correlation-id": "abc-12345678" } });
  assert.equal(resolveCorrelationId(good), "abc-12345678");
  const bad = new Request("http://x/", { headers: { "x-correlation-id": "<script>alert(1)</script>" } });
  assert.notEqual(resolveCorrelationId(bad), "<script>alert(1)</script>");
});

test("apiHandler returns the envelope and echoes the correlation id header", async () => {
  const lines: string[] = [];
  const h = apiHandler(
    async () => ({ data: { hello: "world" } }),
    createLogger((l) => lines.push(l)),
  );
  const res = await h(new Request("http://x/api/v1/t", { headers: { "x-correlation-id": "corr-id-0001" } }));
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("x-correlation-id"), "corr-id-0001");
  assert.equal(lines.length, 1);
});

test("apiHandler converts thrown errors safely and logs only the error type", async () => {
  const lines: string[] = [];
  const h = apiHandler(
    async () => {
      throw new Error("password=hunter2 for user a@b.com");
    },
    createLogger((l) => lines.push(l)),
  );
  const res = await h(new Request("http://x/api/v1/t"));
  assert.equal(res.status, 500);
  const logged = lines.join("\n");
  assert.ok(!logged.includes("hunter2"));
  assert.ok(!logged.includes("a@b.com"));
});

// ---------- logger redaction ----------
test("redact masks sensitive keys, emails and phone-like numbers", () => {
  const out = redact({
    userId: "u1",
    phone: "+919876543210",
    nested: { token: "abc", note: "reach me at jane@example.com or +91 98765 43210" },
  }) as Record<string, any>;
  assert.equal(out.userId, "u1");
  assert.equal(out.phone, "[redacted]");
  assert.equal(out.nested.token, "[redacted]");
  assert.ok(!out.nested.note.includes("jane@example.com"));
  assert.ok(!out.nested.note.includes("98765"));
});

// ---------- env ----------
const validEnv = {
  APP_ENV: "staging",
  NEXT_PUBLIC_APP_URL: "https://staging.example.test",
  NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.test",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  DATABASE_URL: "postgres://u:p@h/db",
  CRON_SECRET: "x".repeat(32),
};

test("parseServerEnv accepts a complete configuration", () => {
  const env = parseServerEnv(validEnv);
  assert.equal(env.appEnv, "staging");
  assert.equal(env.minAge, 18);
});

test("parseServerEnv reports missing names but never values", () => {
  try {
    parseServerEnv({ APP_ENV: "local", CRON_SECRET: "super-secret-short" });
    assert.fail("should throw");
  } catch (e) {
    assert.ok(e instanceof ConfigError);
    assert.ok(e.message.includes("DATABASE_URL is required"));
    assert.ok(!e.message.includes("super-secret-short"));
  }
});

test("D1: production has NO default minimum age (registration must stay closed)", () => {
  assert.equal(resolveMinAge("production", undefined), null);
  assert.equal(resolveMinAge("staging", undefined), 18);
  assert.equal(resolveMinAge("production", "21"), 21);
});

test("minimum age below 18 is rejected", () => {
  assert.throws(() => resolveMinAge("local", "16"), ConfigError);
});

test("production requires https app URL", () => {
  assert.throws(
    () => parseServerEnv({ ...validEnv, APP_ENV: "production", NEXT_PUBLIC_APP_URL: "http://x.test" }),
    ConfigError,
  );
});

// ---------- flags ----------
test("all AI, chat-image and religion-filter flags default OFF (D7, D12, D14)", () => {
  for (const k of [
    "ai.profile_writing",
    "ai.profile_summary",
    "ai.recommendation_explanations",
    "ai.conversation_starters",
    "messaging.chat_images",
    "discovery.filter_religion",
    "registration.open",
  ] as const) {
    assert.equal(FLAG_DEFAULTS[k], false, k);
  }
});

test("flag rows override defaults; most specific row wins", () => {
  const rows: FlagRow[] = [
    { key: "ai.profile_writing", enabled: true, environment: null, country: null },
    { key: "ai.profile_writing", enabled: false, environment: "staging", country: "IN" },
  ];
  assert.equal(isEnabled("ai.profile_writing", { env: "production", country: "IN" }, rows), true);
  assert.equal(isEnabled("ai.profile_writing", { env: "staging", country: "IN" }, rows), false);
  assert.equal(isEnabled("ai.profile_summary", { env: "local" }, rows), false);
});

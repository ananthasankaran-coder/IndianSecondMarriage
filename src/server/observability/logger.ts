/**
 * Structured JSON logger with PII/secret redaction (handbook §12.2, App. B).
 * Redaction is by key name AND by value shape, so accidental logging of an
 * email or phone number inside free text is still masked.
 */
const SENSITIVE_KEY =
  /(phone|mobile|email|token|secret|password|authorization|cookie|api[-_]?key|service[-_]?role|dob|birth|otp|jwt|message|body)/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const LONG_DIGITS = /\+?\d[\d\s().-]{8,}\d/g;
const MAX_DEPTH = 5;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return "[truncated]";
  if (typeof value === "string") {
    return value.replace(EMAIL, "[redacted]").replace(LONG_DIGITS, "[redacted]");
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogSink = (line: string) => void;

export interface Logger {
  log(level: LogLevel, event: string, fields?: Record<string, unknown>): void;
}

export function createLogger(
  sink: LogSink = (l) => console.log(l),
  base: Record<string, unknown> = {},
): Logger {
  return {
    log(level, event, fields = {}) {
      const record = redact({ ts: new Date().toISOString(), level, event, ...base, ...fields });
      sink(JSON.stringify(record));
    },
  };
}

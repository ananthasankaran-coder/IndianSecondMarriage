import { fail, ok, type Meta } from "./envelope.ts";
import { AppError } from "./errors.ts";
import { createLogger, type Logger } from "../observability/logger.ts";

const CORRELATION_ID = /^[A-Za-z0-9-]{8,64}$/;

/** Accept a well-formed inbound correlation id, otherwise mint one. */
export function resolveCorrelationId(req: Request): string {
  const inbound = req.headers.get("x-correlation-id");
  return inbound !== null && CORRELATION_ID.test(inbound) ? inbound : crypto.randomUUID();
}

export interface ApiContext {
  readonly req: Request;
  readonly meta: Meta;
  readonly log: Logger;
}

export type ApiResult<T> = {
  readonly data: T;
  readonly status?: number;
  readonly nextCursor?: string | null;
};

/**
 * Wraps a route handler: correlation id, uniform envelope, safe errors,
 * structured logging. Every /api/v1 route must use this wrapper.
 */
export function apiHandler<T>(
  handler: (ctx: ApiContext) => Promise<ApiResult<T>>,
  logger: Logger = createLogger(),
): (req: Request) => Promise<Response> {
  return async (req) => {
    const correlationId = resolveCorrelationId(req);
    const meta: Meta = { correlationId };
    const log: Logger = {
      log: (level, event, fields) => logger.log(level, event, { correlationId, ...fields }),
    };
    const started = Date.now();
    try {
      const result = await handler({ req, meta, log });
      const responseMeta: Meta =
        result.nextCursor === undefined ? meta : { correlationId, nextCursor: result.nextCursor };
      log.log("info", "api.request", {
        method: req.method,
        path: new URL(req.url).pathname,
        status: result.status ?? 200,
        ms: Date.now() - started,
      });
      return ok(result.data, responseMeta, result.status ?? 200);
    } catch (err) {
      const known = err instanceof AppError;
      log.log(known ? "warn" : "error", "api.error", {
        method: req.method,
        path: new URL(req.url).pathname,
        code: known ? err.code : "INTERNAL",
        // Unknown errors: log the class name only, never message/stack (may contain SQL or PII).
        errorType: err instanceof Error ? err.name : typeof err,
        ms: Date.now() - started,
      });
      return fail(err, meta);
    }
  };
}

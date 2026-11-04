import { AppError, type ErrorDetail } from "./errors.ts";

/** Response envelopes per handbook §10.4. */
export interface Meta {
  readonly correlationId: string;
  readonly nextCursor?: string | null;
}

export interface SuccessBody<T> {
  readonly success: true;
  readonly data: T;
  readonly meta: Meta;
}

export interface ErrorBody {
  readonly success: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly ErrorDetail[];
  };
  readonly meta: Meta;
}

const BASE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

export function ok<T>(data: T, meta: Meta, status = 200): Response {
  const body: SuccessBody<T> = { success: true, data, meta };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, "x-correlation-id": meta.correlationId },
  });
}

/**
 * Converts ANY thrown value to a safe error response. Non-AppError values are
 * reported as INTERNAL with a generic message so stack traces, SQL errors and
 * provider details never reach the client.
 */
export function fail(err: unknown, meta: Meta): Response {
  const appErr =
    err instanceof AppError ? err : new AppError("INTERNAL", "Something went wrong. Please try again.");
  const body: ErrorBody = {
    success: false,
    error: {
      code: appErr.code,
      message: appErr.message,
      ...(appErr.details ? { details: appErr.details } : {}),
    },
    meta,
  };
  return new Response(JSON.stringify(body), {
    status: appErr.status,
    headers: { ...BASE_HEADERS, "x-correlation-id": meta.correlationId },
  });
}

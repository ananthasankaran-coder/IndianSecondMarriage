/**
 * Stable API error catalogue (handbook §10.4). Codes are a public contract:
 * never rename; only add. Messages are safe for end users; internal detail
 * must never be placed in `message` or `details`.
 */
export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  FEATURE_DISABLED: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export interface ErrorDetail {
  readonly field?: string;
  readonly issue: string;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details: readonly ErrorDetail[] | undefined;

  constructor(code: ErrorCode, message: string, details?: readonly ErrorDetail[]) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.details = details;
  }

  get status(): number {
    return ERROR_STATUS[this.code];
  }
}

export type ErrorCode =
  | 'VALIDATION_FAIL'
  | 'AUTH_FAIL'
  | 'RATE_LIMITED'
  | 'COOKIE_DECRYPT_FAIL'
  | 'UPSTREAM_FAIL'
  | 'EXTERNAL_API_FAIL'
  | 'CONFIG_FAIL'
  | 'NOT_FOUND'
  | 'TOS_VIOLATION'
  | 'UNKNOWN';

export class AppError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown> | undefined;
  cause?: unknown;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    cause?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}

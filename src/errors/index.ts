// --- Base Error ---

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
  }
}

// --- Client Errors (4xx) ---

export class ValidationError extends AppError {
  public readonly details?: unknown;

  constructor(message: string = "Validation failed", details?: unknown) {
    super(message, 400, "VALIDATION_ERROR");
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Resource already exists") {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string = "Too many requests. Please try again shortly.",
  ) {
    super(message, 429, "RATE_LIMIT_EXCEEDED");
  }
}

// --- Server Errors (5xx) ---

export class ExternalServiceError extends AppError {
  constructor(message: string = "External service unavailable") {
    super(message, 502, "EXTERNAL_SERVICE_ERROR");
  }
}

// --- Domain-Specific Errors (migrated from utils/errors.ts) ---

export class ServiceError extends AppError {
  constructor(message: string, statusCode: number = 500, code: string = "SERVICE_ERROR") {
    super(message, statusCode, code);
  }
}

export class TriageError extends ServiceError {
  constructor(message: string) {
    super(message, 500, "TRIAGE_ERROR");
  }
}

export class OutlineError extends ServiceError {
  constructor(message: string) {
    super(message, 500, "OUTLINE_ERROR");
  }
}

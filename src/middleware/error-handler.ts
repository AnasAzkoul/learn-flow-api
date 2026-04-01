import type { ErrorHandler } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { AppError, ValidationError } from "../errors/index.js";

export const errorHandler: ErrorHandler = (error, c) => {
  // AppError hierarchy (includes ServiceError, TriageError, OutlineError, etc.)
  if (error instanceof AppError) {
    return c.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          ...(error instanceof ValidationError && error.details
            ? { details: error.details }
            : {}),
        },
      },
      error.statusCode as 400,
    );
  }

  // Anthropic SDK errors
  if (error instanceof Anthropic.RateLimitError) {
    return c.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message:
            "Service is temporarily overloaded. Please try again shortly.",
        },
      },
      429,
    );
  }

  if (error instanceof Anthropic.AuthenticationError) {
    console.error("Anthropic API authentication failed:", error.message);
    return c.json(
      {
        success: false,
        error: {
          code: "CONFIG_ERROR",
          message: "Internal server configuration error.",
        },
      },
      500,
    );
  }

  if (error instanceof Anthropic.APIError) {
    console.error("Anthropic API error:", error.message);
    return c.json(
      {
        success: false,
        error: {
          code: "EXTERNAL_SERVICE_ERROR",
          message: "Failed to reach external service. Please try again.",
        },
      },
      502,
    );
  }

  // Unknown errors
  console.error("Unhandled error:", error);
  return c.json(
    {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    500,
  );
};

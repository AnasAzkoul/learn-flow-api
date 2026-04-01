import type { ZodSchema } from "zod";
import { zValidator } from "@hono/zod-validator";
import { ValidationError } from "../errors/index.js";

export const validate = <T>(
  target: "json" | "query" | "param",
  schema: ZodSchema<T>,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      throw new ValidationError(
        `${target} validation failed`,
        result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      );
    }
  });

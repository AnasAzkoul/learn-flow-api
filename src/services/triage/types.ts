import z from "zod";

// --- Flat API Schema (what we send to the Anthropic API) ---
// The Anthropic API does not support `$defs` with `anyOf` in JSON schemas,
// which is what z.discriminatedUnion() generates. So we use a flat schema
// for the API call and narrow the response into typed variants afterwards.

export const triageApiSchema = z.object({
  verdict: z
    .enum(["single", "multi", "rejected"])
    .describe("The triage decision"),
  // Fields for verdict: "single"
  title: z
    .string()
    .nullable()
    .optional()
    .describe(
      "A refined, specific course title in the user's language. Required when verdict is 'single', null otherwise.",
    ),
  description: z
    .string()
    .nullable()
    .optional()
    .describe(
      "2-3 sentence description of what the course covers, in the user's language. Required when verdict is 'single', null otherwise.",
    ),
  // Fields for verdict: "single" and "multi"
  reasoning: z
    .string()
    .nullable()
    .optional()
    .describe(
      "1-2 sentence explanation for the user, in their language. Required when verdict is 'single' or 'multi', null otherwise.",
    ),
  // Fields for verdict: "multi"
  originalSubject: z
    .string()
    .nullable()
    .optional()
    .describe(
      "The broad topic the user requested, in their original language. Required when verdict is 'multi', null otherwise.",
    ),
  suggestedCourses: z
    .array(
      z.object({
        title: z
          .string()
          .describe("Specific course title in the user's language"),
        description: z
          .string()
          .describe(
            "2-3 sentence description of what this course covers, in the user's language",
          ),
        order: z
          .number()
          .int()
          .describe(
            "Position in the recommended learning sequence, starting at 1",
          ),
      }),
    )
    .nullable()
    .optional()
    .describe(
      "Ordered list of 2-10 suggested courses. Required when verdict is 'multi', null otherwise.",
    ),
  // Fields for verdict: "rejected"
  reason: z
    .enum(["nonsensical", "inappropriate", "not_educational", "too_vague"])
    .nullable()
    .optional()
    .describe("Rejection category. Required when verdict is 'rejected', null otherwise."),
  message: z
    .string()
    .nullable()
    .optional()
    .describe(
      "A polite, user-facing explanation of why the topic was rejected, in the user's language. Required when verdict is 'rejected', null otherwise.",
    ),
});

// --- Typed Response Types (what the route returns to the frontend) ---

export interface SingleCourseResponse {
  verdict: "single";
  title: string;
  description: string;
  reasoning: string;
}

export interface MultiCourseResponse {
  verdict: "multi";
  originalSubject: string;
  reasoning: string;
  suggestedCourses: {
    title: string;
    description: string;
    order: number;
  }[];
}

export interface RejectedResponse {
  verdict: "rejected";
  reason: "nonsensical" | "inappropriate" | "not_educational" | "too_vague";
  message: string;
}

export type TriageResponse =
  | SingleCourseResponse
  | MultiCourseResponse
  | RejectedResponse;

// --- Triage Input Type ---

export interface TriageInput {
  subject: string;
  knowledge: "novis" | "adept" | "expert";
  depth: "primer" | "deep_dive" | "monolith";
}

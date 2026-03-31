import z from "zod";

// --- Flat API Schema (what we send to the Anthropic API) ---
// Kept flat (no discriminatedUnion / $defs) to match Anthropic's structured output constraints.

export const outlineApiSchema = z.object({
  courseTitle: z
    .string()
    .describe("The refined course title in the user's language"),
  courseDescription: z
    .string()
    .describe("2-3 sentence course overview in the user's language"),
  learningObjectives: z
    .array(z.string())
    .describe(
      "3-6 specific, measurable learning outcomes in the user's language",
    ),
  prerequisites: z
    .array(z.string())
    .describe("0-5 prerequisites. Empty array if none needed"),
  modules: z
    .array(
      z.object({
        title: z.string().describe("Module title in the user's language"),
        description: z
          .string()
          .describe("1-2 sentence module summary in the user's language"),
        order: z
          .number()
          .int()
          .describe("Position in the module sequence, starting at 1"),
        lessons: z
          .array(
            z.object({
              title: z
                .string()
                .describe("Lesson title in the user's language"),
              description: z
                .string()
                .describe("1 sentence lesson summary in the user's language"),
              type: z
                .enum(["theory", "hands_on", "project", "quiz"])
                .describe("Pedagogical type of this lesson"),
              order: z
                .number()
                .int()
                .describe("Position within the module, starting at 1"),
            }),
          )
          .describe("Ordered lessons within this module"),
      }),
    )
    .describe("Ordered modules that make up the course"),
});

// --- TypeScript Types ---

export interface OutlineLesson {
  title: string;
  description: string;
  type: "theory" | "hands_on" | "project" | "quiz";
  order: number;
}

export interface OutlineModule {
  title: string;
  description: string;
  order: number;
  lessons: OutlineLesson[];
}

export interface CourseOutline {
  courseTitle: string;
  courseDescription: string;
  learningObjectives: string[];
  prerequisites: string[];
  modules: OutlineModule[];
}

export interface OutlineInput {
  // From triage result
  title: string;
  description: string;
  // Original user request
  subject: string;
  knowledge: "novis" | "adept" | "expert";
  depth: "primer" | "deep_dive" | "monolith";
  // From user profile
  learningStyle: string;
  educationalLevel: string;
  occupation: string;
}

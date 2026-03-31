import z from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../../utils/anthropic.js";
import { OutlineError } from "../../utils/errors.js";
import { outlineApiSchema } from "./types.js";
import { OUTLINE_SYSTEM_PROMPT } from "./prompts.js";
import type { OutlineInput, CourseOutline } from "./types.js";

export type { CourseOutline, OutlineInput } from "./types.js";

// --- Narrowing / Validation ---

function narrowOutlineResponse(
  raw: z.infer<typeof outlineApiSchema>,
): CourseOutline {
  console.log(
    "[outline] Raw Claude response:",
    JSON.stringify(raw, null, 2),
  );

  if (raw.modules.length === 0) {
    throw new OutlineError("Outline has no modules");
  }

  for (let i = 0; i < raw.modules.length; i++) {
    const mod = raw.modules[i];

    if (mod.lessons.length < 2) {
      throw new OutlineError(
        `Module "${mod.title}" has fewer than 2 lessons`,
      );
    }

    if (mod.order !== i + 1) {
      throw new OutlineError(
        `Module order gap: expected ${i + 1}, got ${mod.order}`,
      );
    }
  }

  return raw;
}

// --- Outline Service Function ---

export async function generateCourseOutline(
  input: OutlineInput,
): Promise<CourseOutline> {
  const userMessage = `Generate a detailed course outline for the following validated course.

Course title: ${input.title}
Course description: ${input.description}

Original user request: ${input.subject}
Knowledge level: ${input.knowledge}
Desired depth: ${input.depth}

Learner profile:
- Learning style: ${input.learningStyle}
- Educational level: ${input.educationalLevel}
- Occupation: ${input.occupation}`;

  const response = await anthropic.messages.parse({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    system: OUTLINE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: {
      format: zodOutputFormat(outlineApiSchema),
    },
  });

  if (!response.parsed_output) {
    throw new OutlineError("Failed to parse outline response from Claude");
  }

  return narrowOutlineResponse(response.parsed_output);
}

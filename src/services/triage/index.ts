import z from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "../../utils/anthropic.js";
import {
  TriageError,
  RateLimitError,
  ExternalServiceError,
  AppError,
} from "../../errors/index.js";
import { triageApiSchema } from "./types.js";
import { TRIAGE_SYSTEM_PROMPT } from "./prompts.js";
import type { TriageInput, TriageResponse } from "./types.js";

export type { TriageResponse, TriageInput } from "./types.js";

// --- Narrowing Function ---

function narrowTriageResponse(
  raw: z.infer<typeof triageApiSchema>,
): TriageResponse {
  console.log("[triage] Raw Claude response:", JSON.stringify(raw, null, 2));

  switch (raw.verdict) {
    case "single": {
      if (
        raw.title == null ||
        raw.description == null ||
        raw.reasoning == null
      ) {
        throw new TriageError(
          `Invalid single verdict: title=${raw.title}, description=${raw.description}, reasoning=${raw.reasoning}`,
        );
      }
      return {
        verdict: "single",
        title: raw.title,
        description: raw.description,
        reasoning: raw.reasoning,
      };
    }
    case "multi": {
      if (raw.originalSubject == null || raw.suggestedCourses == null) {
        throw new TriageError(
          `Invalid multi verdict: originalSubject=${raw.originalSubject}, suggestedCourses=${raw.suggestedCourses}`,
        );
      }
      if (raw.suggestedCourses.length < 2) {
        throw new TriageError(
          `Invalid multi verdict: suggestedCourses has ${raw.suggestedCourses.length} items, need at least 2`,
        );
      }
      return {
        verdict: "multi",
        originalSubject: raw.originalSubject,
        reasoning:
          raw.reasoning ??
          "This topic is broad and covers multiple distinct areas, so it has been split into focused courses.",
        suggestedCourses: raw.suggestedCourses,
      };
    }
    case "rejected": {
      if (raw.reason == null || raw.message == null) {
        throw new TriageError(
          `Invalid rejected verdict: reason=${raw.reason}, message=${raw.message}`,
        );
      }
      return {
        verdict: "rejected",
        reason: raw.reason,
        message: raw.message,
      };
    }
  }
}

// --- Triage Service Function ---

export async function evaluateTopicScope(
  input: TriageInput,
): Promise<TriageResponse> {
  const userMessage = `Evaluate whether the following topic is appropriate for a single course or needs to be split.

  Topic: ${input.subject}
  Knowledge level: ${input.knowledge}
  Desired depth: ${input.depth}`;

  let response;
  try {
    response = await anthropic.messages.parse({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      system: TRIAGE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      output_config: {
        format: zodOutputFormat(triageApiSchema),
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new RateLimitError(
        "Service is temporarily overloaded. Please try again shortly.",
      );
    }
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic API authentication failed:", error.message);
      throw new AppError("Internal server configuration error.", 500, "CONFIG_ERROR");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error:", error.message);
      throw new ExternalServiceError(
        "Failed to evaluate topic. Please try again.",
      );
    }
    throw error;
  }

  if (!response.parsed_output) {
    throw new TriageError("Failed to parse triage response from Claude");
  }

  return narrowTriageResponse(response.parsed_output);
}

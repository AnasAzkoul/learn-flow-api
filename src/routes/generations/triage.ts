import { Hono } from "hono";
import Anthropic from "@anthropic-ai/sdk";
import { evaluateTopicScope } from "../../services/triage/index.js";
import { TriageError } from "../../errors/index.js";
import { validate } from "../../validators/validate.js";
import { generationInputSchema } from "../../validators/generation.validators.js";

const triage = new Hono();

triage.post("/", validate("json", generationInputSchema), async (c) => {
  const { subject, knowledge, depth } = c.req.valid("json");

  try {
    const result = await evaluateTopicScope({ subject, knowledge, depth });
    return c.json(result);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return c.json(
        { error: "Service is temporarily overloaded. Please try again shortly." },
        429,
      );
    }

    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Anthropic API authentication failed:", error.message);
      return c.json(
        { error: "Internal server configuration error." },
        500,
      );
    }

    if (error instanceof Anthropic.APIError) {
      console.error("Anthropic API error:", error.message);
      return c.json(
        { error: "Failed to evaluate topic. Please try again." },
        502,
      );
    }

    if (error instanceof TriageError) {
      console.error("Triage validation error:", error.message);
      return c.json(
        { error: "Failed to process the topic evaluation. Please try again." },
        500,
      );
    }

    console.error("Unexpected triage error:", error);
    return c.json(
      { error: "An unexpected error occurred. Please try again." },
      500,
    );
  }
});

export { triage };

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { requireEnv } from "./env.js";

export const anthropic = new Anthropic({
  apiKey: requireEnv("ANTHROPIC_API_KEY"),
});

import { Hono } from "hono";
import { evaluateTopicScope } from "../../services/triage/index.js";
import { validate } from "../../validators/validate.js";
import { generationInputSchema } from "../../validators/generation.validators.js";
import { success } from "../../utils/response.js";

const triage = new Hono();

triage.post("/", validate("json", generationInputSchema), async (c) => {
  const input = c.req.valid("json");
  const result = await evaluateTopicScope(input);
  return success(c, result);
});

export { triage };

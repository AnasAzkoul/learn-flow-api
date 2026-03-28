import { Hono } from "hono";
import z from "zod";
import { zValidator } from "@hono/zod-validator";

const generations = new Hono();

const triageSchema = z.object({
  subject: z
    .string()
    .describe("This is the subject of the course the user wants to learn"),
  knowledge: z.enum(["novis", "adept", "expert"]),
  depth: z.enum(["primer", "deep dive", "monolith"]),
});

generations.post("/triage", (c) => {
  const body = c.req.json();

  return c.json(body);
});

export { generations };

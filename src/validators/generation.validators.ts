import z from "zod";

export const generationInputSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(500, "Subject must be 500 characters or less"),
  knowledge: z.enum(["novis", "adept", "expert"]),
  depth: z.enum(["primer", "deep_dive", "monolith"]),
});

export type GenerationInput = z.infer<typeof generationInputSchema>;

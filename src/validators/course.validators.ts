import z from "zod";

export const createCourseSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().min(1, "Description is required").max(2000),
  subject: z.string().min(1, "Subject is required").max(500),
  knowledge: z.enum(["novis", "adept", "expert"]),
  depth: z.enum(["primer", "deep_dive", "monolith"]),
});

export const updateCourseSchema = createCourseSchema.partial();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

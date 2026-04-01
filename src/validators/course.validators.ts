import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { course } from "../schemas/courses.schema.js";

const baseCourseSchema = createInsertSchema(course, {
  title: (schema) => schema.min(1, "Title is required").max(200),
  description: (schema) => schema.min(1, "Description is required").max(2000),
  subject: (schema) => schema.min(1, "Subject is required").max(500),
});

export const createCourseSchema = baseCourseSchema.pick({
  title: true,
  description: true,
  subject: true,
  knowledge: true,
  depth: true,
});

export const updateCourseSchema = createCourseSchema.partial();

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;

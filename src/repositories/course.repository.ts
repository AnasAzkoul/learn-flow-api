import { eq, desc, asc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { course, module, lesson } from "../schemas/courses.schema.js";
import { getOffset } from "../utils/pagination.js";
import type { PaginationParams } from "../utils/pagination.js";
import type { CourseOutline } from "../services/outline/types.js";

// --- Types ---

interface CreateCourseData {
  userId: string;
  title: string;
  description: string;
  subject: string;
  knowledge: "novis" | "adept" | "expert";
  depth: "primer" | "deep_dive" | "monolith";
  learningObjectives: string[];
  prerequisites: string[];
}

// --- Repository Functions ---

export async function createCourseWithOutline(
  data: CreateCourseData,
  outline: CourseOutline,
) {
  return db.transaction(async (tx) => {
    const [newCourse] = await tx
      .insert(course)
      .values({
        userId: data.userId,
        title: data.title,
        description: data.description,
        subject: data.subject,
        knowledge: data.knowledge,
        depth: data.depth,
        learningObjectives: data.learningObjectives,
        prerequisites: data.prerequisites,
        status: "completed",
      })
      .returning();

    if (!newCourse) {
      throw new Error("Failed to insert course");
    }

    const newModules = await tx
      .insert(module)
      .values(
        outline.modules.map((mod) => ({
          courseId: newCourse.id,
          title: mod.title,
          description: mod.description,
          order: mod.order,
        })),
      )
      .returning();

    await tx.insert(lesson).values(
      outline.modules.flatMap((mod, i) => {
        const savedModule = newModules[i];
        if (!savedModule) {
          throw new Error(`Module at index ${i} was not inserted`);
        }
        return mod.lessons.map((les) => ({
          moduleId: savedModule.id,
          title: les.title,
          description: les.description,
          type: les.type,
          order: les.order,
        }));
      }),
    );

    return newCourse;
  });
}

export async function findById(id: string) {
  const [result] = await db.select().from(course).where(eq(course.id, id));
  return result;
}

export async function findAllByUserId(
  userId: string,
  params: PaginationParams,
) {
  const offset = getOffset(params.page, params.limit);
  const orderBy = params.order === "asc" ? asc(course.createdAt) : desc(course.createdAt);

  const [data, [countResult]] = await Promise.all([
    db
      .select()
      .from(course)
      .where(eq(course.userId, userId))
      .orderBy(orderBy)
      .limit(params.limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(course)
      .where(eq(course.userId, userId)),
  ]);

  const total = countResult?.total ?? 0;

  return { data, total };
}

export async function updateById(
  id: string,
  data: {
    title?: string | undefined;
    description?: string | undefined;
    subject?: string | undefined;
    knowledge?: "novis" | "adept" | "expert" | undefined;
    depth?: "primer" | "deep_dive" | "monolith" | undefined;
  },
) {
  const [result] = await db
    .update(course)
    .set(data)
    .where(eq(course.id, id))
    .returning();
  return result;
}

export async function removeById(id: string) {
  const [result] = await db
    .delete(course)
    .where(eq(course.id, id))
    .returning();
  return result;
}

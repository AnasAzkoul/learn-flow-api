import { relations } from "drizzle-orm";
import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { user } from "./auth.schema.ts";

export const knowledgeLevelEnum = pgEnum("knowledge_level", [
  "novis",
  "adept",
  "expert",
]);

export const courseDepthEnum = pgEnum("course_depth", [
  "primer",
  "deep_dive",
  "monolith",
]);

export const courseStatusEnum = pgEnum("course_status", [
  "generating",
  "completed",
  "failed",
]);

export const lessonTypeEnum = pgEnum("lesson_type", [
  "theory",
  "hands_on",
  "project",
  "quiz",
]);

export const course = pgTable(
  "course",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    subject: text("subject").notNull(),
    knowledge: knowledgeLevelEnum("knowledge").notNull(),
    depth: courseDepthEnum("depth").notNull(),
    learningObjectives: text("learning_objectives").array().notNull(),
    prerequisites: text("prerequisites").array().notNull(),
    status: courseStatusEnum("status").default("generating").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("course_userId_idx").on(table.userId)],
);

export const module = pgTable(
  "module",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    courseId: text("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("module_courseId_idx").on(table.courseId)],
);

export const lesson = pgTable(
  "lesson",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    moduleId: text("module_id")
      .notNull()
      .references(() => module.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: lessonTypeEnum("type").notNull(),
    order: integer("order").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("lesson_moduleId_idx").on(table.moduleId)],
);

// --- Relations ---

export const courseRelations = relations(course, ({ one, many }) => ({
  user: one(user, { fields: [course.userId], references: [user.id] }),
  modules: many(module),
}));

export const moduleRelations = relations(module, ({ one, many }) => ({
  course: one(course, { fields: [module.courseId], references: [course.id] }),
  lessons: many(lesson),
}));

export const lessonRelations = relations(lesson, ({ one }) => ({
  module: one(module, { fields: [lesson.moduleId], references: [module.id] }),
}));

import { Hono } from "hono";
import z from "zod";
import { zValidator } from "@hono/zod-validator";
import Anthropic from "@anthropic-ai/sdk";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { evaluateTopicScope } from "../../services/triage/index.js";
import { generateCourseOutline } from "../../services/outline/index.js";
import { createSSEResponse } from "../../utils/sse.js";
import { TriageError } from "../../utils/errors.js";
import { OutlineError } from "../../utils/errors.js";
import { db } from "../../db/index.js";
import { course, module, lesson } from "../../schemas/courses.schema.js";
import type { User, Session } from "../../utils/types.js";

const outlineInputSchema = z.object({
  subject: z
    .string()
    .min(1, "Subject is required")
    .max(500, "Subject must be 500 characters or less"),
  knowledge: z.enum(["novis", "adept", "expert"]),
  depth: z.enum(["primer", "deep_dive", "monolith"]),
});

const outline = new Hono<{
  Variables: { user: User; session: Session };
}>();

outline.post(
  "/",
  authMiddleware,
  zValidator("json", outlineInputSchema),
  async (c) => {
    const { subject, knowledge, depth } = c.req.valid("json");
    const user = c.get("user");

    return createSSEResponse(c, async (send) => {
      // --- Step 1: Triage ---
      await send({ type: "triage:start" });

      let triageResult;
      try {
        triageResult = await evaluateTopicScope({ subject, knowledge, depth });
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
          await send({
            type: "error",
            data: {
              message:
                "Service is temporarily overloaded. Please try again shortly.",
            },
          });
          return;
        }
        if (error instanceof Anthropic.AuthenticationError) {
          console.error("Anthropic API authentication failed:", error.message);
          await send({
            type: "error",
            data: { message: "Internal server configuration error." },
          });
          return;
        }
        if (error instanceof Anthropic.APIError) {
          console.error("Anthropic API error:", error.message);
          await send({
            type: "error",
            data: {
              message: "Failed to evaluate topic. Please try again.",
            },
          });
          return;
        }
        if (error instanceof TriageError) {
          console.error("Triage validation error:", error.message);
          await send({
            type: "error",
            data: {
              message:
                "Failed to process the topic evaluation. Please try again.",
            },
          });
          return;
        }
        throw error;
      }

      await send({
        type: "triage:complete",
        data: { verdict: triageResult.verdict },
      });

      // --- Step 2: Handle non-single verdicts ---
      if (triageResult.verdict === "multi") {
        await send({ type: "multi", data: triageResult });
        return;
      }
      if (triageResult.verdict === "rejected") {
        await send({ type: "rejected", data: triageResult });
        return;
      }

      // --- Step 3: Generate outline ---
      await send({ type: "outline:start" });

      let outlineResult;
      try {
        outlineResult = await generateCourseOutline({
          title: triageResult.title,
          description: triageResult.description,
          subject,
          knowledge,
          depth,
          learningStyle: user.learningStyle ?? "conversational",
          educationalLevel: user.educationalLevel ?? "degree",
          occupation: user.occupation ?? "student",
        });
      } catch (error) {
        if (error instanceof Anthropic.RateLimitError) {
          await send({
            type: "error",
            data: {
              message:
                "Service is temporarily overloaded. Please try again shortly.",
            },
          });
          return;
        }
        if (error instanceof Anthropic.APIError) {
          console.error("Anthropic API error:", error.message);
          await send({
            type: "error",
            data: {
              message: "Failed to generate course outline. Please try again.",
            },
          });
          return;
        }
        if (error instanceof OutlineError) {
          console.error("Outline validation error:", error.message);
          await send({
            type: "error",
            data: {
              message:
                "Failed to process the course outline. Please try again.",
            },
          });
          return;
        }
        throw error;
      }

      // --- Step 4: Save to DB ---
      let savedCourse;
      try {
        savedCourse = await db.transaction(async (tx) => {
          const [newCourse] = await tx
            .insert(course)
            .values({
              userId: user.id,
              title: outlineResult.courseTitle,
              description: outlineResult.courseDescription,
              subject,
              knowledge,
              depth,
              learningObjectives: outlineResult.learningObjectives,
              prerequisites: outlineResult.prerequisites,
              status: "completed",
            })
            .returning();

          const newModules = await tx
            .insert(module)
            .values(
              outlineResult.modules.map((mod) => ({
                courseId: newCourse.id,
                title: mod.title,
                description: mod.description,
                order: mod.order,
              })),
            )
            .returning();

          await tx.insert(lesson).values(
            outlineResult.modules.flatMap((mod, i) =>
              mod.lessons.map((les) => ({
                moduleId: newModules[i].id,
                title: les.title,
                description: les.description,
                type: les.type,
                order: les.order,
              })),
            ),
          );

          return newCourse;
        });
      } catch (error) {
        console.error("Failed to save course:", error);
        await send({
          type: "error",
          data: {
            message: "Failed to save the course. Please try again.",
          },
        });
        return;
      }

      // --- Step 5: Send result ---
      await send({
        type: "outline:complete",
        data: {
          courseId: savedCourse.id,
          ...outlineResult,
        },
      });
    });
  },
);

export { outline };

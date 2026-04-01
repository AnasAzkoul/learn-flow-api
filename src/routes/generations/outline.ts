import { Hono } from "hono";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { evaluateTopicScope } from "../../services/triage/index.js";
import { generateCourseOutline } from "../../services/outline/index.js";
import { createSSEResponse } from "../../utils/sse.js";
import { AppError } from "../../errors/index.js";
import { createCourseWithOutline } from "../../repositories/course.repository.js";
import { validate } from "../../validators/validate.js";
import { generationInputSchema } from "../../validators/generation.validators.js";
import type { User, Session } from "../../utils/types.js";

const outline = new Hono<{
  Variables: { user: User; session: Session };
}>();

outline.use(authMiddleware);

outline.post("/", validate("json", generationInputSchema), async (c) => {
  const { subject, knowledge, depth } = c.req.valid("json");
  const user = c.get("user");

  return createSSEResponse(c, async (send) => {
    // --- Step 1: Triage ---
    await send({ type: "triage:start" });

    let triageResult;
    try {
      triageResult = await evaluateTopicScope({ subject, knowledge, depth });
    } catch (error) {
      if (error instanceof AppError) {
        await send({ type: "error", data: { message: error.message } });
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
      if (error instanceof AppError) {
        await send({ type: "error", data: { message: error.message } });
        return;
      }
      throw error;
    }

    // --- Step 4: Save to DB ---
    let savedCourse;
    try {
      savedCourse = await createCourseWithOutline(
        {
          userId: user.id,
          title: outlineResult.courseTitle,
          description: outlineResult.courseDescription,
          subject,
          knowledge,
          depth,
          learningObjectives: outlineResult.learningObjectives,
          prerequisites: outlineResult.prerequisites,
        },
        outlineResult,
      );
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
});

export { outline };

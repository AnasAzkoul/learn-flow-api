import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware.js";
import * as courseService from "../services/course.service.js";
import { validate } from "../validators/validate.js";
import { idParamSchema, paginationQuerySchema } from "../validators/common.validators.js";
import { updateCourseSchema } from "../validators/course.validators.js";
import { success, noContent } from "../utils/response.js";
import type { User, Session } from "../utils/types.js";

const courses = new Hono<{
  Variables: { user: User; session: Session };
}>();

courses.use(authMiddleware);

courses.get("/", validate("query", paginationQuerySchema), async (c) => {
  const user = c.get("user");
  const { page, limit, order } = c.req.valid("query");

  const { courses: data, meta } = await courseService.getCoursesByUser(
    user.id,
    { page, limit, order },
  );

  return success(c, data, meta);
});

courses.get("/:id", validate("param", idParamSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");

  const course = await courseService.getCourseById(id, user.id);

  return success(c, course);
});

courses.patch(
  "/:id",
  validate("param", idParamSchema),
  validate("json", updateCourseSchema),
  async (c) => {
    const user = c.get("user");
    const { id } = c.req.valid("param");
    const data = c.req.valid("json");

    const updated = await courseService.updateCourse(id, user.id, data);

    return success(c, updated);
  },
);

courses.delete("/:id", validate("param", idParamSchema), async (c) => {
  const user = c.get("user");
  const { id } = c.req.valid("param");

  await courseService.deleteCourse(id, user.id);

  return noContent(c);
});

export { courses };

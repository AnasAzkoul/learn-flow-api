import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

const courses = new Hono();

courses.get("/", (c) => {
  return c.json({ courses: [] });
});

courses.get("/:id", (c) => {
  const id = c.req.param("id");
  return c.json({ id });
});

courses.post("/", (c) => {
  const body = c.req.json();

  return c.json(body);
});

export { courses };

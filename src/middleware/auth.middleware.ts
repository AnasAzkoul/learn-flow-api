import { createMiddleware } from "hono/factory";
import { auth } from "../utils/auth.ts";

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: "Unautherized" }, 401);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

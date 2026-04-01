import { createMiddleware } from "hono/factory";
import { auth } from "../utils/auth.ts";
import { UnauthorizedError } from "../errors/index.js";

export const authMiddleware = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    throw new UnauthorizedError("Authentication required");
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

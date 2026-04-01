import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorHandler } from "./middleware/error-handler.js";
import { courses } from "./routes/courses.js";
import { generations } from "./routes/generations/index.js";
import { auth } from "./utils/auth.ts";
import type { User, Session } from "./utils/types.ts";

const app = new Hono<{
  Variables: { user: User; session: Session };
}>();

// Global error handler — catches all unhandled errors and returns envelope format
app.onError(errorHandler);

// TODO: apply authMiddleware to protected authenticted routes

app.use(
  "/api/v1/*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(
  "/api/auth/*",
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Auth routes (outside versioning - auth endpoints rarely change)
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

const v1 = new Hono();
v1.route("/courses", courses);
v1.route("/generations", generations);

app.route("/api/v1", v1);

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);

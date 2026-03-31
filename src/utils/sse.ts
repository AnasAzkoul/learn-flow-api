import { streamSSE } from "hono/streaming";
import type { Context } from "hono";
import type { SSEStreamingApi } from "hono/streaming";
import type { CourseOutline } from "../services/outline/types.js";
import type {
  MultiCourseResponse,
  RejectedResponse,
} from "../services/triage/types.js";

// --- SSE Event Types ---

type SSEEvent =
  | { type: "triage:start" }
  | { type: "triage:complete"; data: { verdict: string } }
  | { type: "outline:start" }
  | { type: "outline:complete"; data: CourseOutline & { courseId: string } }
  | { type: "multi"; data: MultiCourseResponse }
  | { type: "rejected"; data: RejectedResponse }
  | { type: "error"; data: { message: string } };

// --- Helpers ---

async function sendEvent(
  stream: SSEStreamingApi,
  event: SSEEvent,
): Promise<void> {
  const data = "data" in event ? event.data : {};
  await stream.writeSSE({
    event: event.type,
    data: JSON.stringify(data),
  });
}

function createSSEResponse(
  c: Context,
  callback: (send: (event: SSEEvent) => Promise<void>) => Promise<void>,
): Response {
  return streamSSE(
    c,
    async (stream) => {
      const send = (event: SSEEvent) => sendEvent(stream, event);
      await callback(send);
    },
    async (error, stream) => {
      console.error("SSE stream error:", error);
      await sendEvent(stream, {
        type: "error",
        data: { message: "An unexpected error occurred" },
      });
    },
  );
}

export { createSSEResponse, type SSEEvent };

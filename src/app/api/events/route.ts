import { NextRequest } from "next/server";
import {
  subscribeToSse,
  getRecentSseEvents,
  type SseBroadcastEvent,
} from "@/lib/sseBroker";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      function sendEvent(event: SseBroadcastEvent) {
        try {
          const payload = `event: ${event.type}\ndata: ${JSON.stringify(
            event
          )}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Stream closed
        }
      }

      // Send initial connection handshake
      sendEvent({
        id: `sse-init-${Date.now()}`,
        type: "connected",
        timestamp: new Date().toISOString(),
        message: "Connected to OmniSync Real-Time Event Stream (SSE)",
        meta: {
          recentBufferedEvents: getRecentSseEvents().length,
        },
      });

      const unsubscribe = subscribeToSse((evt) => {
        sendEvent(evt);
      });

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`)
          );
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 20_000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

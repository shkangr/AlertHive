import { auth } from '@/lib/auth';
import { incidentEvents, type IncidentEvent } from '@/lib/event-emitter';

export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL_MS = 30_000;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ userId: session.user?.id })}\n\n`)
      );

      // Listen for incident updates
      const handler = (event: IncidentEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: incident\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Client disconnected
          cleanup();
        }
      };

      unsubscribe = incidentEvents.onIncidentUpdate(handler);

      // Heartbeat to keep connection alive
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          cleanup();
        }
      }, HEARTBEAT_INTERVAL_MS);

      function cleanup() {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }
    },
    cancel() {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

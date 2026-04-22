import { MedusaResponse } from "@medusajs/framework"

import { messageBus } from "../message-bus"

/**
 * Opens an SSE response for the given conversation_id and keeps it open
 * until the client disconnects. Callers are expected to have already
 * performed any auth / participant checks before invoking this helper.
 *
 * The stream emits:
 *   - `: keep-alive\n\n` comments every 30s so proxies don't drop idle conns
 *   - `event: message.created\ndata: {json}\n\n` on every new message
 */
export function startConversationStream(
  res: MedusaResponse,
  conversationId: string
): void {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no") // disable nginx response buffering

  // Initial ack so the client's EventSource.onopen fires immediately.
  res.write(`: connected\n\n`)
  if (typeof (res as any).flush === "function") (res as any).flush()

  const unsubscribe = messageBus.subscribe(conversationId, (payload) => {
    try {
      res.write(`event: ${payload.event}\n`)
      res.write(`data: ${JSON.stringify(payload.data)}\n\n`)
      if (typeof (res as any).flush === "function") (res as any).flush()
    } catch {
      // write after close; the close handler below will tidy up
    }
  })

  const keepAlive = setInterval(() => {
    try {
      res.write(`: keep-alive ${Date.now()}\n\n`)
      if (typeof (res as any).flush === "function") (res as any).flush()
    } catch {
      clearInterval(keepAlive)
    }
  }, 30_000)

  const cleanup = () => {
    clearInterval(keepAlive)
    unsubscribe()
  }

  ;(res as any).on?.("close", cleanup)
  ;(res as any).on?.("error", cleanup)
}

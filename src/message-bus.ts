import { EventEmitter } from "events"

/**
 * Single-process in-memory pub/sub for messaging events.
 * Backend emits on this bus; SSE endpoints subscribe per conversation.
 *
 * Keyed by conversation_id so SSE listeners only receive events for the
 * conversation they're watching.
 *
 * NOTE: works on a single Medusa process (PM2 fork mode on the VPS).
 * If we horizontally scale later, swap this for a Redis pub/sub adapter
 * with the same interface.
 */

export type MessageBusPayload = {
  event: "message.created" | "conversation.read"
  conversation_id: string
  data: Record<string, unknown>
}

class MessageBusSingleton {
  private emitter = new EventEmitter()

  constructor() {
    // SSE fan-out across many concurrent subscribers per conversation can
    // exceed the default 10-listener limit quickly — lift it.
    this.emitter.setMaxListeners(1024)
  }

  publish(payload: MessageBusPayload): void {
    this.emitter.emit(payload.conversation_id, payload)
  }

  subscribe(
    conversationId: string,
    listener: (payload: MessageBusPayload) => void
  ): () => void {
    this.emitter.on(conversationId, listener)
    return () => this.emitter.off(conversationId, listener)
  }
}

// Re-exported as a module-level singleton so every subscriber and every
// SSE route shares the same EventEmitter instance.
export const messageBus = new MessageBusSingleton()

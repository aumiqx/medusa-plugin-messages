import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"

import { MessageEvents } from "../events"
import { messageBus } from "../message-bus"

/**
 * Bridges Medusa's workflow event bus → the in-process messageBus used by
 * SSE subscribers. Workflows emit messages.message.created after success
 * (via emitEventStep); this subscriber catches that and fans it out to
 * any open SSE connections subscribed to the conversation.
 */
export default async function messageBroadcastHandler({
  event,
}: SubscriberArgs<{
  message_id: string
  conversation_id: string
  author_actor_type: "customer" | "seller" | "admin"
  author_actor_id: string
}>) {
  const { data } = event
  if (!data?.conversation_id) return

  messageBus.publish({
    event: "message.created",
    conversation_id: data.conversation_id,
    data: {
      message_id: data.message_id,
      author_actor_type: data.author_actor_type,
      author_actor_id: data.author_actor_id,
    },
  })
}

export const config: SubscriberConfig = {
  event: MessageEvents.MESSAGE_CREATED,
  context: { subscriberId: "messages-broadcast-sse" },
}

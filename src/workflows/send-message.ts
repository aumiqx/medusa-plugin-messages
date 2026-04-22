import {
  WorkflowResponse,
  createWorkflow,
  transform,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

import { MessageEvents } from "../events"
import { createMessageStep } from "./steps"

export type SendMessageWorkflowInput = {
  conversation_id: string
  author_actor_type: "customer" | "seller" | "admin"
  author_actor_id: string
  body: string
  metadata?: Record<string, unknown> | null
}

export const sendMessageWorkflow = createWorkflow(
  "send-message",
  (input: SendMessageWorkflowInput) => {
    const result = createMessageStep({
      conversation_id: input.conversation_id,
      author_actor_type: input.author_actor_type,
      author_actor_id: input.author_actor_id,
      body: input.body,
      metadata: input.metadata,
    })

    emitEventStep({
      eventName: MessageEvents.MESSAGE_CREATED,
      data: transform(result, (r) => ({
        message_id: r.message.id,
        conversation_id: r.message.conversation_id,
        author_actor_type: r.message.author_actor_type,
        author_actor_id: r.message.author_actor_id,
      })),
    })

    return new WorkflowResponse(result)
  }
)

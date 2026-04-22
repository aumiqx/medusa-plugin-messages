import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../modules/messages"

export type CreateMessageInput = {
  conversation_id: string
  author_actor_type: "customer" | "seller" | "admin"
  author_actor_id: string
  body: string
  metadata?: Record<string, unknown> | null
}

export type CreateMessageOutput = {
  message: {
    id: string
    conversation_id: string
    author_actor_type: "customer" | "seller" | "admin"
    author_actor_id: string
    body: string
    created_at: Date
  }
}

export const createMessageStep = createStep(
  "create-message",
  async (input: CreateMessageInput, { container }) => {
    const service =
      container.resolve<MessagesModuleService>(MESSAGES_MODULE)

    const trimmed = (input.body ?? "").trim()
    if (!trimmed) {
      throw new Error("Message body cannot be empty")
    }

    const message = await service.createMessages({
      conversation_id: input.conversation_id,
      author_actor_type: input.author_actor_type,
      author_actor_id: input.author_actor_id,
      body: trimmed,
      metadata: input.metadata ?? null,
    })

    await service.updateConversations({
      selector: { id: input.conversation_id },
      data: { last_message_at: message.created_at },
    })

    return new StepResponse(
      {
        message: {
          id: message.id,
          conversation_id: message.conversation_id ?? input.conversation_id,
          author_actor_type: message.author_actor_type,
          author_actor_id: message.author_actor_id,
          body: message.body,
          created_at: message.created_at,
        },
      },
      message.id
    )
  },
  async (messageId, { container }) => {
    if (!messageId) return
    const service =
      container.resolve<MessagesModuleService>(MESSAGES_MODULE)
    await service.deleteMessages([messageId])
  }
)

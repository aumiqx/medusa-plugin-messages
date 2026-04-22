import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../modules/messages"

export type FindOrCreateConversationInput = {
  type: "order_customer_vendor" | "vendor_admin"
  order_id?: string | null
  seller_id?: string | null
  customer_id?: string | null
  subject?: string | null
  metadata?: Record<string, unknown> | null
}

export type FindOrCreateConversationOutput = {
  conversation: { id: string }
  created: boolean
}

export const findOrCreateConversationStep = createStep(
  "find-or-create-conversation",
  async (input: FindOrCreateConversationInput, { container }) => {
    const service =
      container.resolve<MessagesModuleService>(MESSAGES_MODULE)

    const filters: Record<string, unknown> = { type: input.type }
    if (input.order_id !== undefined) filters.order_id = input.order_id
    if (input.seller_id !== undefined) filters.seller_id = input.seller_id
    if (input.customer_id !== undefined)
      filters.customer_id = input.customer_id

    const existing = await service.listConversations(filters, { take: 1 })

    if (existing.length > 0) {
      return new StepResponse(
        { conversation: { id: existing[0].id }, created: false },
        null
      )
    }

    const conversation = await service.createConversations({
      type: input.type,
      order_id: input.order_id ?? null,
      seller_id: input.seller_id ?? null,
      customer_id: input.customer_id ?? null,
      subject: input.subject ?? null,
      metadata: input.metadata ?? null,
    })

    return new StepResponse(
      { conversation: { id: conversation.id }, created: true },
      conversation.id
    )
  },
  async (createdId, { container }) => {
    if (!createdId) return
    const service =
      container.resolve<MessagesModuleService>(MESSAGES_MODULE)
    await service.deleteConversations([createdId])
  }
)

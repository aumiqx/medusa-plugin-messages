import {
  WorkflowResponse,
  createWorkflow,
  transform,
  when,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

import { MessageEvents } from "../events"
import {
  ensureParticipantsStep,
  findOrCreateConversationStep,
  type Participant,
} from "./steps"

export type CreateOrGetConversationWorkflowInput = {
  type: "order_customer_vendor" | "vendor_admin"
  order_id?: string | null
  seller_id?: string | null
  customer_id?: string | null
  subject?: string | null
  participants: Participant[]
  metadata?: Record<string, unknown> | null
}

export const createOrGetConversationWorkflow = createWorkflow(
  "create-or-get-conversation",
  (input: CreateOrGetConversationWorkflowInput) => {
    const result = findOrCreateConversationStep({
      type: input.type,
      order_id: input.order_id,
      seller_id: input.seller_id,
      customer_id: input.customer_id,
      subject: input.subject,
      metadata: input.metadata,
    })

    ensureParticipantsStep({
      conversation_id: result.conversation.id,
      participants: input.participants,
    })

    when({ result }, ({ result }) => result.created).then(() => {
      emitEventStep({
        eventName: MessageEvents.CONVERSATION_CREATED,
        data: transform({ result, input }, ({ result, input }) => ({
          conversation_id: result.conversation.id,
          type: input.type,
          order_id: input.order_id ?? null,
          seller_id: input.seller_id ?? null,
          customer_id: input.customer_id ?? null,
        })),
      })
    })

    return new WorkflowResponse(result)
  }
)

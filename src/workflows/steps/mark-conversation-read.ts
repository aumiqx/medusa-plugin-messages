import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../modules/messages"

export type MarkConversationReadInput = {
  conversation_id: string
  actor_type: "customer" | "seller" | "admin"
  actor_id: string
}

export const markConversationReadStep = createStep(
  "mark-conversation-read",
  async (input: MarkConversationReadInput, { container }) => {
    const service =
      container.resolve<MessagesModuleService>(MESSAGES_MODULE)

    const now = new Date()

    await service.updateConversationParticipants({
      selector: {
        conversation_id: input.conversation_id,
        actor_type: input.actor_type,
        actor_id: input.actor_id,
      },
      data: { last_read_at: now, last_seen_at: now },
    })

    return new StepResponse({ read_at: now }, null)
  }
)

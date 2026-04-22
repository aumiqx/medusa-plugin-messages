import { StepResponse, createStep } from "@medusajs/framework/workflows-sdk"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../modules/messages"

export type Participant = {
  actor_type: "customer" | "seller" | "admin"
  actor_id: string
}

export type EnsureParticipantsInput = {
  conversation_id: string
  participants: Participant[]
}

export const ensureParticipantsStep = createStep(
  "ensure-conversation-participants",
  async (input: EnsureParticipantsInput, { container }) => {
    const service =
      container.resolve<MessagesModuleService>(MESSAGES_MODULE)

    const existing = await service.listConversationParticipants({
      conversation_id: input.conversation_id,
    })

    const existingKeys = new Set(
      existing.map((p) => `${p.actor_type}:${p.actor_id}`)
    )

    const toCreate = input.participants.filter(
      (p) => !existingKeys.has(`${p.actor_type}:${p.actor_id}`)
    )

    if (toCreate.length === 0) {
      return new StepResponse({ created: [] as string[] }, [])
    }

    const created = await service.createConversationParticipants(
      toCreate.map((p) => ({
        actor_type: p.actor_type,
        actor_id: p.actor_id,
        conversation_id: input.conversation_id,
      }))
    )

    const createdArray = Array.isArray(created) ? created : [created]
    const createdIds = createdArray.map((c) => c.id)

    return new StepResponse({ created: createdIds }, createdIds)
  },
  async (createdIds, { container }) => {
    if (!createdIds || createdIds.length === 0) return
    const service =
      container.resolve<MessagesModuleService>(MESSAGES_MODULE)
    await service.deleteConversationParticipants(createdIds)
  }
)

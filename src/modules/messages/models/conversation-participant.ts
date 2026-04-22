import { model } from "@medusajs/framework/utils"

import Conversation from "./conversation"

export const PARTICIPANT_ACTOR_TYPES = [
  "customer",
  "seller",
  "admin",
] as const

export type ParticipantActorType = (typeof PARTICIPANT_ACTOR_TYPES)[number]

export const ConversationParticipant = model.define(
  "conversation_participant",
  {
    id: model.id({ prefix: "cpart" }).primaryKey(),
    actor_type: model.enum([...PARTICIPANT_ACTOR_TYPES]),
    actor_id: model.text(),
    last_read_at: model.dateTime().nullable(),
    last_seen_at: model.dateTime().nullable(),
    conversation: model.belongsTo(() => Conversation, {
      mappedBy: "participants",
    }),
  }
)

export default ConversationParticipant

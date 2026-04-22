import { model } from "@medusajs/framework/utils"

import Conversation from "./conversation"
import { PARTICIPANT_ACTOR_TYPES } from "./conversation-participant"

export const Message = model.define("message", {
  id: model.id({ prefix: "msg" }).primaryKey(),
  author_actor_type: model.enum([...PARTICIPANT_ACTOR_TYPES]),
  author_actor_id: model.text(),
  body: model.text(),
  metadata: model.json().nullable(),
  conversation: model.belongsTo(() => Conversation, {
    mappedBy: "messages",
  }),
})

export default Message

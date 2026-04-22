import { model } from "@medusajs/framework/utils"

import ConversationParticipant from "./conversation-participant"
import Message from "./message"

export const CONVERSATION_TYPES = [
  "order_customer_vendor",
  "vendor_admin",
] as const

export type ConversationType = (typeof CONVERSATION_TYPES)[number]

export const Conversation = model
  .define("conversation", {
    id: model.id({ prefix: "conv" }).primaryKey(),
    type: model.enum([...CONVERSATION_TYPES]),
    order_id: model.text().nullable(),
    seller_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    subject: model.text().nullable(),
    last_message_at: model.dateTime().nullable(),
    metadata: model.json().nullable(),
    participants: model.hasMany(() => ConversationParticipant),
    messages: model.hasMany(() => Message),
  })
  .cascades({
    delete: ["participants", "messages"],
  })

export default Conversation

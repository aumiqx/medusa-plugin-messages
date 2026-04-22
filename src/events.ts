export const MessageEvents = {
  CONVERSATION_CREATED: "messages.conversation.created",
  MESSAGE_CREATED: "messages.message.created",
  CONVERSATION_READ: "messages.conversation.read",
} as const

export type MessageEvent = (typeof MessageEvents)[keyof typeof MessageEvents]

import { Module } from "@medusajs/framework/utils"

import MessagesModuleService from "./service"

export const MESSAGES_MODULE = "messages"
export { MessagesModuleService }
export {
  CONVERSATION_TYPES,
  PARTICIPANT_ACTOR_TYPES,
} from "./models"

export default Module(MESSAGES_MODULE, {
  service: MessagesModuleService,
})

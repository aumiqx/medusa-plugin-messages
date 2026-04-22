import { MedusaService } from "@medusajs/framework/utils"

import {
  Conversation,
  ConversationParticipant,
  Message,
} from "./models"

class MessagesModuleService extends MedusaService({
  Conversation,
  ConversationParticipant,
  Message,
}) {}

export default MessagesModuleService

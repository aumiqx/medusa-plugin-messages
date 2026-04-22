import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../../../../modules/messages"
import { startConversationStream } from "../../../../sse"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.id

  // Admin sees every conversation — only check it exists.
  const service = req.scope.resolve<MessagesModuleService>(MESSAGES_MODULE)
  const [conv] = await service.listConversations({ id }, { take: 1 })
  if (!conv) {
    res.status(404).json({ message: "Conversation not found" })
    return
  }

  startConversationStream(res, id)
}

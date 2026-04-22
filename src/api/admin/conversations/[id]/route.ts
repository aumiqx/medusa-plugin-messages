import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../../../modules/messages"
import { loadConversationsWithUnread } from "../../../shared"

/**
 * @oas [get] /admin/conversations/{id}
 * operationId: "AdminGetConversation"
 * summary: "Get a conversation with its messages"
 * x-authenticated: true
 * tags: [Admin Conversations]
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.params.id
  const service = req.scope.resolve<MessagesModuleService>(MESSAGES_MODULE)

  const [loaded] = await loadConversationsWithUnread(req.scope, [id], {
    actor_type: "admin",
    actor_id: req.auth_context.actor_id,
  })

  if (!loaded) {
    res.status(404).json({ message: "Conversation not found" })
    return
  }

  const messages = await service.listMessages(
    { conversation_id: id },
    { take: 500, order: { created_at: "ASC" } }
  )

  res.json({
    conversation: loaded,
    messages: messages.map((m) => ({
      id: m.id,
      conversation_id: m.conversation_id,
      author_actor_type: m.author_actor_type,
      author_actor_id: m.author_actor_id,
      body: m.body,
      created_at: m.created_at,
    })),
  })
}

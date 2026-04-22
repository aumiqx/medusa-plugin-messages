import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../../../modules/messages"
import { assertViewerParticipates, loadConversationsWithUnread } from "../../../shared"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id
  const id = req.params.id

  try {
    await assertViewerParticipates(req.scope, id, {
      actor_type: "customer",
      actor_id: customerId,
    })
  } catch (e: any) {
    res.status(e.status ?? 500).json({ message: e.message })
    return
  }

  const [loaded] = await loadConversationsWithUnread(req.scope, [id], {
    actor_type: "customer",
    actor_id: customerId,
  })

  if (!loaded) {
    res.status(404).json({ message: "Conversation not found" })
    return
  }

  const service = req.scope.resolve<MessagesModuleService>(MESSAGES_MODULE)
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

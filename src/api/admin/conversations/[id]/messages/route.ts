import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { sendMessageWorkflow } from "../../../../../workflows"
import { ensureAdminParticipant } from "../../../ensure-admin-participant"
import { SendMessageInput } from "../../../../validators"

/**
 * @oas [post] /admin/conversations/{id}/messages
 * operationId: "AdminPostMessage"
 * summary: "Send a message as admin"
 * x-authenticated: true
 * tags: [Admin Conversations]
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const conversationId = req.params.id
  const body = SendMessageInput.parse(req.body)
  const adminId = req.auth_context.actor_id

  // First reply in an order<->vendor thread auto-joins the admin so
  // their read-state + unread counts start tracking.
  await ensureAdminParticipant(req.scope, conversationId, adminId)

  const { result } = await sendMessageWorkflow.run({
    container: req.scope,
    input: {
      conversation_id: conversationId,
      author_actor_type: "admin",
      author_actor_id: adminId,
      body: body.body,
      metadata: body.metadata ?? null,
    },
  })

  res.status(201).json({ message: result.message })
}

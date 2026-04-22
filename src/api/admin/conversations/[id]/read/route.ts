import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { markReadWorkflow } from "../../../../../workflows"
import { ensureAdminParticipant } from "../../../ensure-admin-participant"

/**
 * @oas [post] /admin/conversations/{id}/read
 * operationId: "AdminMarkRead"
 * summary: "Mark a conversation as read up to now"
 * x-authenticated: true
 * tags: [Admin Conversations]
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const conversationId = req.params.id
  const adminId = req.auth_context.actor_id

  // Auto-join so markRead has a participant row to update. Without this,
  // the first markRead on a non-vendor-admin thread is a no-op.
  await ensureAdminParticipant(req.scope, conversationId, adminId)

  const { result } = await markReadWorkflow.run({
    container: req.scope,
    input: {
      conversation_id: conversationId,
      actor_type: "admin",
      actor_id: adminId,
    },
  })
  res.json(result)
}

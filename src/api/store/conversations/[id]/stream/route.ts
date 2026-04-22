import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { assertViewerParticipates } from "../../../../shared"
import { startConversationStream } from "../../../../sse"

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

  startConversationStream(res, id)
}

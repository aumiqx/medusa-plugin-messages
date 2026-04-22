import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { markReadWorkflow } from "../../../../../workflows"
import { assertViewerParticipates } from "../../../../shared"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id
  const conversationId = req.params.id

  try {
    await assertViewerParticipates(req.scope, conversationId, {
      actor_type: "customer",
      actor_id: customerId,
    })
  } catch (e: any) {
    res.status(e.status ?? 500).json({ message: e.message })
    return
  }

  const { result } = await markReadWorkflow.run({
    container: req.scope,
    input: {
      conversation_id: conversationId,
      actor_type: "customer",
      actor_id: customerId,
    },
  })

  res.json(result)
}

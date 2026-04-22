import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { sendMessageWorkflow } from "../../../../../workflows"
import { assertViewerParticipates } from "../../../../shared"
import { SendMessageInput } from "../../../../validators"

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

  const body = SendMessageInput.parse(req.body)

  const { result } = await sendMessageWorkflow.run({
    container: req.scope,
    input: {
      conversation_id: conversationId,
      author_actor_type: "customer",
      author_actor_id: customerId,
      body: body.body,
      metadata: body.metadata ?? null,
    },
  })

  res.status(201).json({ message: result.message })
}

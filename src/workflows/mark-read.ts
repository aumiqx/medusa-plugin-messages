import {
  WorkflowResponse,
  createWorkflow,
} from "@medusajs/framework/workflows-sdk"
import { emitEventStep } from "@medusajs/medusa/core-flows"

import { MessageEvents } from "../events"
import { markConversationReadStep } from "./steps"

export type MarkReadWorkflowInput = {
  conversation_id: string
  actor_type: "customer" | "seller" | "admin"
  actor_id: string
}

export const markReadWorkflow = createWorkflow(
  "mark-conversation-read",
  (input: MarkReadWorkflowInput) => {
    const result = markConversationReadStep({
      conversation_id: input.conversation_id,
      actor_type: input.actor_type,
      actor_id: input.actor_id,
    })

    emitEventStep({
      eventName: MessageEvents.CONVERSATION_READ,
      data: {
        conversation_id: input.conversation_id,
        actor_type: input.actor_type,
        actor_id: input.actor_id,
      },
    })

    return new WorkflowResponse(result)
  }
)

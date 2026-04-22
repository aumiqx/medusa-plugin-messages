import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"

import { createOrGetConversationWorkflow } from "../../../workflows"
import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../../modules/messages"
import { loadConversationsWithUnread } from "../../shared"
import {
  CreateConversationInput,
  ListConversationsQuery,
} from "../../validators"

/**
 * @oas [get] /admin/conversations
 * operationId: "AdminListConversations"
 * summary: "List conversations"
 * description: "Lists all conversations. Filters: type, order_id, seller_id, customer_id."
 * x-authenticated: true
 * tags: [Admin Conversations]
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = ListConversationsQuery.parse(req.query)
  const service = req.scope.resolve<MessagesModuleService>(MESSAGES_MODULE)

  const filters: Record<string, unknown> = {}
  if (query.type) filters.type = query.type
  if (query.order_id) filters.order_id = query.order_id
  if (query.seller_id) filters.seller_id = query.seller_id
  if (query.customer_id) filters.customer_id = query.customer_id

  const [rows, count] = await service.listAndCountConversations(filters, {
    take: query.limit,
    skip: query.offset,
    order: { last_message_at: "DESC", created_at: "DESC" },
  })

  const conversations = await loadConversationsWithUnread(
    req.scope,
    rows.map((r) => r.id),
    { actor_type: "admin", actor_id: req.auth_context.actor_id }
  )

  res.json({
    conversations,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

/**
 * @oas [post] /admin/conversations
 * operationId: "AdminCreateConversation"
 * summary: "Create a conversation"
 * description: "Creates a vendor<->admin support thread. Admin is auto-added as participant."
 * x-authenticated: true
 * tags: [Admin Conversations]
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const body = CreateConversationInput.parse(req.body)

  if (body.type !== "vendor_admin") {
    res.status(400).json({
      message:
        "Admins may only create 'vendor_admin' support threads. Customer↔vendor threads are created from the storefront.",
    })
    return
  }

  if (!body.seller_id) {
    res.status(400).json({ message: "seller_id is required" })
    return
  }

  const adminId = req.auth_context.actor_id

  const { result } = await createOrGetConversationWorkflow.run({
    container: req.scope,
    input: {
      type: "vendor_admin",
      seller_id: body.seller_id,
      subject: body.subject ?? null,
      participants: [{ actor_type: "admin", actor_id: adminId }],
    },
  })

  res.status(201).json({ conversation: result.conversation, created: result.created })
}

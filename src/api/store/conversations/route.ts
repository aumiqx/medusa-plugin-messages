import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
 * @oas [get] /store/conversations
 * operationId: "StoreListConversations"
 * summary: "List the authenticated customer's conversations"
 * x-authenticated: true
 * tags: [Store Conversations]
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context.actor_id
  const query = ListConversationsQuery.parse(req.query)

  const filters: Record<string, unknown> = { customer_id: customerId }
  if (query.seller_id) filters.seller_id = query.seller_id
  if (query.order_id) filters.order_id = query.order_id

  const service = req.scope.resolve<MessagesModuleService>(MESSAGES_MODULE)
  const [rows, count] = await service.listAndCountConversations(filters, {
    take: query.limit,
    skip: query.offset,
    order: { last_message_at: "DESC", created_at: "DESC" },
  })

  const conversations = await loadConversationsWithUnread(
    req.scope,
    rows.map((r) => r.id),
    { actor_type: "customer", actor_id: customerId }
  )

  res.json({
    conversations,
    count,
    offset: query.offset,
    limit: query.limit,
  })
}

/**
 * @oas [post] /store/conversations
 * operationId: "StoreCreateConversation"
 * summary: "Start an order-scoped customer<->vendor thread"
 * x-authenticated: true
 * tags: [Store Conversations]
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const body = CreateConversationInput.parse(req.body)

  if (body.type !== "order_customer_vendor") {
    res.status(400).json({
      message:
        "Customers may only create 'order_customer_vendor' threads from an order.",
    })
    return
  }

  if (!body.order_id || !body.seller_id) {
    res.status(400).json({
      message: "order_id and seller_id are required",
    })
    return
  }

  const customerId = req.auth_context.actor_id

  // Guard: the customer must own the order AND the order must involve the seller.
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id"],
    filters: { id: body.order_id } as any,
  })
  const order = Array.isArray(data) ? data[0] : null
  if (!order || order.customer_id !== customerId) {
    res.status(403).json({
      message: "Order not found or does not belong to this customer",
    })
    return
  }

  const { result } = await createOrGetConversationWorkflow.run({
    container: req.scope,
    input: {
      type: "order_customer_vendor",
      order_id: body.order_id,
      seller_id: body.seller_id,
      customer_id: customerId,
      subject: body.subject ?? null,
      participants: [
        { actor_type: "customer", actor_id: customerId },
        { actor_type: "seller", actor_id: body.seller_id },
      ],
    },
  })

  res
    .status(201)
    .json({ conversation: result.conversation, created: result.created })
}

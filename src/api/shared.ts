import { MedusaContainer } from "@medusajs/framework"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../modules/messages"

export type ActorType = "customer" | "seller" | "admin"

export type ConversationWithCounts = {
  id: string
  type: string
  order_id: string | null
  seller_id: string | null
  customer_id: string | null
  subject: string | null
  last_message_at: Date | null
  created_at: Date
  updated_at: Date
  metadata: Record<string, unknown> | null
  unread_count: number
  participants: Array<{
    id: string
    actor_type: ActorType
    actor_id: string
    last_read_at: Date | null
  }>
}

export async function loadConversationsWithUnread(
  scope: MedusaContainer,
  conversationIds: string[],
  viewer: { actor_type: ActorType; actor_id: string }
): Promise<ConversationWithCounts[]> {
  if (conversationIds.length === 0) return []

  const service = scope.resolve<MessagesModuleService>(MESSAGES_MODULE)

  const [conversations, participants] = await Promise.all([
    service.listConversations({ id: conversationIds }, { take: 500 }),
    service.listConversationParticipants(
      { conversation_id: conversationIds },
      { take: 2000 }
    ),
  ])

  const participantsByConv = new Map<string, typeof participants>()
  for (const p of participants) {
    const list = participantsByConv.get(p.conversation_id) ?? []
    list.push(p)
    participantsByConv.set(p.conversation_id, list)
  }

  // Compute unread count per conversation for the viewer.
  // Unread = messages in conversation newer than viewer's participant.last_read_at.
  const viewerParticipants = participants.filter(
    (p) =>
      p.actor_type === viewer.actor_type && p.actor_id === viewer.actor_id
  )
  const viewerLastRead = new Map<string, Date | null>()
  for (const vp of viewerParticipants) {
    viewerLastRead.set(vp.conversation_id, vp.last_read_at ?? null)
  }

  const unreadByConv = new Map<string, number>()
  await Promise.all(
    conversationIds.map(async (cid) => {
      const lastRead = viewerLastRead.get(cid) ?? null
      const messages = await service.listMessages(
        {
          conversation_id: cid,
          ...(lastRead ? { created_at: { $gt: lastRead } } : {}),
        },
        { take: 500 }
      )
      const count = messages.filter(
        (m) =>
          !(
            m.author_actor_type === viewer.actor_type &&
            m.author_actor_id === viewer.actor_id
          )
      ).length
      unreadByConv.set(cid, count)
    })
  )

  return conversations.map((c) => ({
    id: c.id,
    type: c.type,
    order_id: c.order_id ?? null,
    seller_id: c.seller_id ?? null,
    customer_id: c.customer_id ?? null,
    subject: c.subject ?? null,
    last_message_at: c.last_message_at ?? null,
    created_at: c.created_at,
    updated_at: c.updated_at,
    metadata: (c.metadata ?? null) as Record<string, unknown> | null,
    unread_count: unreadByConv.get(c.id) ?? 0,
    participants: (participantsByConv.get(c.id) ?? []).map((p) => ({
      id: p.id,
      actor_type: p.actor_type as ActorType,
      actor_id: p.actor_id,
      last_read_at: p.last_read_at ?? null,
    })),
  }))
}

export async function assertViewerParticipates(
  scope: MedusaContainer,
  conversation_id: string,
  viewer: { actor_type: ActorType; actor_id: string }
): Promise<void> {
  const service = scope.resolve<MessagesModuleService>(MESSAGES_MODULE)
  const found = await service.listConversationParticipants(
    {
      conversation_id,
      actor_type: viewer.actor_type,
      actor_id: viewer.actor_id,
    },
    { take: 1 }
  )
  if (found.length === 0) {
    const err: any = new Error(
      "You are not a participant of this conversation"
    )
    err.status = 403
    throw err
  }
}

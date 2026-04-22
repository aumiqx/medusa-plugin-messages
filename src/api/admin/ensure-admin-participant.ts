import { MedusaContainer } from "@medusajs/framework"

import {
  MESSAGES_MODULE,
  MessagesModuleService,
} from "../../modules/messages"

/**
 * Admins aren't added as participants when a thread is created from the
 * store (customer ↔ vendor) or even from admin itself (vendor_admin
 * currently only inserts the admin who opened the drawer). To make
 * per-admin unread counts and read-state work for any admin replying in
 * any conversation, auto-add the acting admin as a participant the
 * first time they touch a thread.
 *
 * Idempotent — relies on the unique index on (conversation_id, actor_type,
 * actor_id). If the admin is already a participant, no-op.
 */
export async function ensureAdminParticipant(
  scope: MedusaContainer,
  conversationId: string,
  adminId: string
): Promise<void> {
  const service = scope.resolve<MessagesModuleService>(MESSAGES_MODULE)

  const existing = await service.listConversationParticipants(
    {
      conversation_id: conversationId,
      actor_type: "admin",
      actor_id: adminId,
    },
    { take: 1 }
  )

  if (existing.length > 0) return

  try {
    await service.createConversationParticipants({
      conversation_id: conversationId,
      actor_type: "admin",
      actor_id: adminId,
    })
  } catch {
    // Another concurrent request may have added it between the check and
    // the insert. The unique constraint makes this safe to ignore.
  }
}

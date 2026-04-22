import { z } from "zod"

export const CreateConversationInput = z.object({
  type: z.enum(["order_customer_vendor", "vendor_admin"]),
  order_id: z.string().nullish(),
  seller_id: z.string().nullish(),
  customer_id: z.string().nullish(),
  subject: z.string().nullish(),
  first_message: z.string().trim().min(1).optional(),
})
export type CreateConversationInputType = z.infer<typeof CreateConversationInput>

export const SendMessageInput = z.object({
  body: z.string().trim().min(1, "Message cannot be empty").max(10_000),
  metadata: z.record(z.unknown()).optional(),
})
export type SendMessageInputType = z.infer<typeof SendMessageInput>

export const ListConversationsQuery = z.object({
  type: z.enum(["order_customer_vendor", "vendor_admin"]).optional(),
  order_id: z.string().optional(),
  seller_id: z.string().optional(),
  customer_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
})
export type ListConversationsQueryType = z.infer<typeof ListConversationsQuery>

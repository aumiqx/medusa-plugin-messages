# @aumiqx/medusa-plugin-messages

Self-hosted messaging for **Medusa v2** marketplaces. Drop-in plugin that gives your store:

- Customer ↔ vendor threads scoped to orders
- Vendor ↔ admin support threads
- Unread badge counts per participant
- Server-Sent Events real-time push (with polling as a safety net)
- Zero external SaaS dependency — messages live in your Postgres

Built to replace TalkJS, Intercom widgets, and other per-MAU-priced chat tools for marketplace scenarios.

## Why

Most chat SaaS is priced per monthly active user. For a marketplace where *every buyer* is a potential chat user, that scales nastily. This plugin keeps everything in your own Postgres, on your own infra, under MIT license.

## Requirements

- Medusa v2 (`@medusajs/medusa >= 2.11`)
- Node 20+
- Postgres (comes with Medusa)

## Install

```bash
npm install @aumiqx/medusa-plugin-messages
# or
yarn add @aumiqx/medusa-plugin-messages
```

Register in `medusa-config.ts`:

```ts
export default defineConfig({
  plugins: [
    { resolve: "@aumiqx/medusa-plugin-messages", options: {} },
  ],
})
```

Run migrations:

```bash
npx medusa db:migrate
```

## What's in the box

### Data model

```
conversation
  id, type (order_customer_vendor | vendor_admin),
  order_id?, seller_id?, customer_id?,
  subject?, last_message_at, metadata

conversation_participant
  id, actor_type (customer | seller | admin), actor_id,
  last_read_at, last_seen_at

message
  id, author_actor_type, author_actor_id, body
```

Each participant tracks their own `last_read_at`, which is how unread counts work — messages created *after* a participant's `last_read_at`, by someone *other than them*.

### API routes

All three scopes expose the same shape. Auth is enforced via the existing Medusa actor guards (admin bearer/cookie, customer bearer, etc.).

| Scope | Method | Path | Purpose |
|---|---|---|---|
| Admin | `GET` | `/admin/conversations` | List (filters: `type`, `order_id`, `seller_id`, `customer_id`, `limit`, `offset`) |
| Admin | `POST` | `/admin/conversations` | Open a vendor↔admin thread |
| Admin | `GET` | `/admin/conversations/:id` | Thread + messages |
| Admin | `POST` | `/admin/conversations/:id/messages` | Reply (auto-joins the admin as a participant) |
| Admin | `POST` | `/admin/conversations/:id/read` | Mark read (auto-joins) |
| Admin | `GET` | `/admin/conversations/:id/stream` | SSE push stream |
| Store | `GET` | `/store/conversations` | Customer's threads |
| Store | `POST` | `/store/conversations` | Open an order↔vendor thread (verifies order.customer_id matches caller) |
| Store | `GET` | `/store/conversations/:id` | Thread + messages (participation check) |
| Store | `POST` | `/store/conversations/:id/messages` | Send (participation check) |
| Store | `POST` | `/store/conversations/:id/read` | Mark read |
| Store | `GET` | `/store/conversations/:id/stream` | SSE push stream |

### Workflows

Import and call from your own code:

```ts
import {
  createOrGetConversationWorkflow,
  sendMessageWorkflow,
  markReadWorkflow,
} from "@aumiqx/medusa-plugin-messages/workflows"
```

### Events

```ts
import { MessageEvents } from "@aumiqx/medusa-plugin-messages"

MessageEvents.CONVERSATION_CREATED  // 'messages.conversation.created'
MessageEvents.MESSAGE_CREATED       // 'messages.message.created'
MessageEvents.CONVERSATION_READ     // 'messages.conversation.read'
```

All fired from workflows via `emitEventStep`, so they only fire after the workflow commits successfully. Wire your own subscribers (email, push, analytics, etc.) on these.

## Extending

### Vendor / seller routes

The plugin ships admin + store routes. If your stack is a marketplace with a dedicated seller auth scope (e.g. MercurJS), add a matching `/vendor/conversations/*` route set in your own project that resolves the current seller from `req.auth_context.actor_id` and forwards to the same workflows. Example stub:

```ts
// your-project/src/api/vendor/conversations/route.ts
import {
  createOrGetConversationWorkflow,
} from "@aumiqx/medusa-plugin-messages/workflows"
// ... resolve sellerId from auth, then call the workflow ...
```

### Email fallback when participants are offline

Subscribe to `messages.message.created`, check each non-author participant's `last_seen_at`, and fire your notification provider for anyone who's been idle beyond your threshold:

```ts
import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import {
  MESSAGES_MODULE,
  MessagesModuleService,
  MessageEvents,
} from "@aumiqx/medusa-plugin-messages"

export default async function handler({ event, container }: SubscriberArgs<{
  message_id: string
  conversation_id: string
  author_actor_type: string
  author_actor_id: string
}>) {
  const service = container.resolve<MessagesModuleService>(MESSAGES_MODULE)
  const notifications = container.resolve(Modules.NOTIFICATION)

  const participants = await service.listConversationParticipants({
    conversation_id: event.data.conversation_id,
  })

  const OFFLINE_MS = 5 * 60 * 1000
  const offline = participants.filter(
    (p) =>
      !(p.actor_type === event.data.author_actor_type &&
        p.actor_id === event.data.author_actor_id) &&
      (!p.last_seen_at ||
        Date.now() - new Date(p.last_seen_at as any).getTime() > OFFLINE_MS)
  )

  // Resolve each participant's email from your own actor tables,
  // then call notifications.createNotifications(...) with your template.
}

export const config: SubscriberConfig = {
  event: MessageEvents.MESSAGE_CREATED,
  context: { subscriberId: "messages-offline-email" },
}
```

### Storefront real-time from a Bearer-auth storefront

Browser `EventSource` can't send `Authorization` headers. If your storefront auth is Bearer-in-localStorage/cookie (not same-origin session), proxy the stream through a same-origin route handler that reads the token server-side and pipes the upstream response body. Next.js example:

```ts
// app/api/conversation-stream/[id]/route.ts
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req, { params }) {
  const { id } = await params
  const bearer = await getBearerFromCookie() // your helper
  const upstream = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/conversations/${id}/stream`,
    {
      headers: { Authorization: `Bearer ${bearer}`, Accept: "text/event-stream" },
      signal: req.signal,
    }
  )
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
```

Then point `new EventSource('/api/conversation-stream/<id>')` at this route.

### Scaling beyond one process

The default `messageBus` is a single-process Node `EventEmitter`. It works on PM2 fork mode or a single docker container. If you scale horizontally, swap the bus for a Redis pub/sub adapter with the same `publish` / `subscribe` interface — the SSE route handler doesn't care about the implementation.

## Frontend reference

Shape of a conversation (list endpoint response):

```ts
type Conversation = {
  id: string
  type: "order_customer_vendor" | "vendor_admin"
  order_id: string | null
  seller_id: string | null
  customer_id: string | null
  subject: string | null
  last_message_at: string | null
  created_at: string
  updated_at: string
  unread_count: number
  participants: Array<{
    id: string
    actor_type: "customer" | "seller" | "admin"
    actor_id: string
    last_read_at: string | null
  }>
}
```

SSE frames emit one event type you care about:

```
event: message.created
data: {"message_id":"msg_...","author_actor_type":"seller","author_actor_id":"..."}
```

On receiving that frame, refetch the thread (polling fallback does the same).

## Status & limitations (v0.1.0-alpha.0)

- Single-process `messageBus` — swap for Redis if horizontally scaling.
- No attachments — bring your own file storage integration.
- No typing indicators.
- Hard cap of 500 messages per thread load — pagination pending.
- SSE endpoints are participant-gated, not role-gated — any admin sees any thread they've been added to (admin routes auto-add).

## License

MIT © Aumiqx Technologies

# Changelog

All notable changes to this package are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-alpha.0] — 2026-04-23

### Added

- Medusa v2 module with three tables: `conversation`, `conversation_participant`, `message` (with per-viewer unread tracking via `last_read_at`).
- Workflows:
  - `createOrGetConversationWorkflow` — idempotent, keyed by `(type, order_id, seller_id, customer_id)`.
  - `sendMessageWorkflow` — persists the message, bumps `last_message_at`, emits `messages.message.created` via `emitEventStep`.
  - `markReadWorkflow` — updates participant `last_read_at` + `last_seen_at`, emits `messages.conversation.read`.
- Admin REST endpoints (`/admin/conversations/*`): list, get, post message, mark read, create vendor↔admin thread, SSE stream.
- Store REST endpoints (`/store/conversations/*`): list, get, post message, mark read, create order↔vendor thread, SSE stream. Participant check enforced on message/read/stream.
- Server-Sent Events real-time push via `startConversationStream` helper. In-process `messageBus` (single-process) with `X-Accel-Buffering: no` so nginx doesn't buffer; 30s keep-alive comments.
- `ensureAdminParticipant` helper so admins auto-join any thread they reply to (preserves per-admin unread tracking on customer↔vendor threads).
- Broadcast subscriber bridges `messages.message.created` → SSE fan-out.

### Known limitations

- Single-process only. For horizontal scale, swap the in-process `messageBus` for Redis pub/sub with the same interface.
- No attachments in v0.1. Add in a follow-up once your file storage provider is configured.
- No typing indicators in v0.1.
- SSE endpoints rely on cookie auth. `EventSource` can't attach `Authorization` headers — if your storefront uses Bearer-in-localStorage, proxy the stream through a same-origin route handler. See the README for an example.

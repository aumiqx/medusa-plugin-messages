import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260422150000 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      `create table if not exists "conversation" (
        "id" text not null,
        "type" text check ("type" in ('order_customer_vendor', 'vendor_admin')) not null,
        "order_id" text null,
        "seller_id" text null,
        "customer_id" text null,
        "subject" text null,
        "last_message_at" timestamptz null,
        "metadata" jsonb null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "conversation_pkey" primary key ("id")
      );`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_type" ON "conversation" ("type") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_order_id" ON "conversation" ("order_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_seller_id" ON "conversation" ("seller_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_customer_id" ON "conversation" ("customer_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_last_message_at" ON "conversation" ("last_message_at" DESC NULLS LAST) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_conversation_deleted_at" ON "conversation" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "conversation_participant" (
        "id" text not null,
        "actor_type" text check ("actor_type" in ('customer', 'seller', 'admin')) not null,
        "actor_id" text not null,
        "last_read_at" timestamptz null,
        "last_seen_at" timestamptz null,
        "conversation_id" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "conversation_participant_pkey" primary key ("id"),
        constraint "conversation_participant_conversation_id_foreign" foreign key ("conversation_id") references "conversation" ("id") on update cascade on delete cascade
      );`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_conversation_id" ON "conversation_participant" ("conversation_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_actor" ON "conversation_participant" ("actor_type", "actor_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_participant_conversation_actor" ON "conversation_participant" ("conversation_id", "actor_type", "actor_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_participant_deleted_at" ON "conversation_participant" ("deleted_at") WHERE deleted_at IS NULL;`
    )

    this.addSql(
      `create table if not exists "message" (
        "id" text not null,
        "author_actor_type" text check ("author_actor_type" in ('customer', 'seller', 'admin')) not null,
        "author_actor_id" text not null,
        "body" text not null,
        "metadata" jsonb null,
        "conversation_id" text not null,
        "created_at" timestamptz not null default now(),
        "updated_at" timestamptz not null default now(),
        "deleted_at" timestamptz null,
        constraint "message_pkey" primary key ("id"),
        constraint "message_conversation_id_foreign" foreign key ("conversation_id") references "conversation" ("id") on update cascade on delete cascade
      );`
    )

    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_message_conversation_id" ON "message" ("conversation_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_message_conversation_created_at" ON "message" ("conversation_id", "created_at" DESC) WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_message_author" ON "message" ("author_actor_type", "author_actor_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_message_deleted_at" ON "message" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  async down(): Promise<void> {
    this.addSql(`drop table if exists "message" cascade;`)
    this.addSql(`drop table if exists "conversation_participant" cascade;`)
    this.addSql(`drop table if exists "conversation" cascade;`)
  }
}

import { sql } from 'drizzle-orm'
import { integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

export const chatsTable = sqliteTable('chats', {
  id: integer('id').primaryKey(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const chatMembersTable = sqliteTable(
  'chat_members',
  {
    id: integer('id').primaryKey(),
    chatId: integer('chat_id').references(() => chatsTable.id),
    userId: integer('user_id').references(() => usersTable.id),
    reputation: integer('reputation').default(5),
    swearingCount: integer('swearing_count').default(0),
    joinedAt: integer('joined_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    uniqueUserChat: unique().on(table.userId, table.chatId),
  }),
)

export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey(),
  username: text('username'),
})

export const actionsTable = sqliteTable('actions', {
  id: integer('id').primaryKey(),
  userId: integer('user_id').references(() => usersTable.id),
  chatId: integer('chat_id').references(() => chatsTable.id),
  actionType: text('action_type', { enum: ['shit', 'fart', 'piss'] }),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const alertStatusTable = sqliteTable('alert_status', {
  region: text('region').primaryKey(),
  status: integer('status', { mode: 'boolean' }),
  lastChanged: integer('last_changed', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const swearWordsTable = sqliteTable('swear_words', {
  word: text('word').primaryKey(),
})

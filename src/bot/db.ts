import Database from 'better-sqlite3';
import { and, eq, gte, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { join } from 'path';
import {
  actionsTable,
  chatsTable,
  chatMembersTable,
  usersTable,
  alertStatusTable,
  swearWordsTable,
} from './db/schema.js';
const sqlite = new Database(join(process.cwd(), 'stats.db'));
const db = drizzle({ client: sqlite });

export const getOrCreateUser = async (id: number, username: string | null) => {
  await db.insert(usersTable).values({ id, username }).onConflictDoNothing().run();
  return db.select().from(usersTable).where(eq(usersTable.id, id)).get();
};

export const addAction = async (
  userId: number,
  chatId: number,
  actionType: 'shit' | 'fart' | 'piss',
) => {
  await db.insert(actionsTable).values({ userId, chatId, actionType }).onConflictDoNothing().run();
};

export const getUserStats = async (userId: number, chatId: number) => {
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;

  const total = await db
    .select({
      actionType: actionsTable.actionType,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(actionsTable)
    .where(and(eq(actionsTable.userId, userId), eq(actionsTable.chatId, chatId)))
    .groupBy(actionsTable.actionType)
    .all();

  const todayStats = await db
    .select({
      actionType: actionsTable.actionType,
      count: sql<number>`COUNT(*)`.as('count'),
    })
    .from(actionsTable)
    .where(
      and(
        eq(actionsTable.userId, userId),
        eq(actionsTable.chatId, chatId),
        gte(actionsTable.timestamp, new Date(oneDayAgo)),
      ),
    )
    .groupBy(actionsTable.actionType)
    .all();

  return { total, todayStats };
};

export const getAllStats = async (chatId: number) => {
  return db
    .select({
      userId: actionsTable.userId,
      username: usersTable.username,
      actionCount: sql<number>`COUNT(${actionsTable.id})`.as('actionCount'),
      shitCount:
        sql<number>`SUM(CASE WHEN ${actionsTable.actionType} = 'shit' THEN 1 ELSE 0 END)`.as(
          'shitCount',
        ),
      fartCount:
        sql<number>`SUM(CASE WHEN ${actionsTable.actionType} = 'fart' THEN 1 ELSE 0 END)`.as(
          'fartCount',
        ),
      pissCount:
        sql<number>`SUM(CASE WHEN ${actionsTable.actionType} = 'piss' THEN 1 ELSE 0 END)`.as(
          'pissCount',
        ),
    })
    .from(actionsTable)
    .where(eq(actionsTable.chatId, chatId))
    .innerJoin(usersTable, eq(actionsTable.userId, usersTable.id))
    .groupBy(actionsTable.userId, usersTable.username)
    .all();
};

export const getAllUsersReputation = async (chatId: number) => {
  return db
    .select({
      userId: actionsTable.userId,
      username: usersTable.username,
      reputation: chatMembersTable.reputation,
    })
    .from(actionsTable)
    .where(eq(actionsTable.chatId, chatId))
    .innerJoin(usersTable, eq(actionsTable.userId, usersTable.id))
    .innerJoin(chatMembersTable, eq(actionsTable.userId, chatMembersTable.userId))
    .groupBy(actionsTable.userId, usersTable.username)
    .all();
};

export const getOrCreateChat = async (id: number, name: string) => {
  await db.insert(chatsTable).values({ id, name }).onConflictDoNothing().run();
  return db.select().from(chatsTable).where(eq(chatsTable.id, id)).get();
};

export const addChatMember = async (userId: number, chatId: number) => {
  await db.insert(chatMembersTable).values({ userId, chatId }).onConflictDoNothing().run();
};

export const getChatMembers = async (chatId: number) => {
  return db
    .select({
      memberId: chatMembersTable.id,
      chatId: chatMembersTable.chatId,
      userId: chatMembersTable.userId,
      reputation: chatMembersTable.reputation,
      swearingCount: chatMembersTable.swearingCount,
      joinedAt: chatMembersTable.joinedAt,
      username: usersTable.username,
    })
    .from(chatMembersTable)
    .innerJoin(usersTable, eq(chatMembersTable.userId, usersTable.id))
    .where(eq(chatMembersTable.chatId, chatId))
    .all();
};

export const getChatMember = async (userId: number, chatId: number) => {
  return db
    .select({
      id: chatMembersTable.id,
      chatId: chatMembersTable.chatId,
      userId: chatMembersTable.userId,
      reputation: chatMembersTable.reputation,
      swearingCount: chatMembersTable.swearingCount,
      joinedAt: chatMembersTable.joinedAt,
      username: usersTable.username,
    })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)))
    .leftJoin(usersTable, eq(chatMembersTable.userId, usersTable.id))
    .get();
};

type ChatMember = {
  id: number
  username: string
};

type Chat = {
  id: number
  members: ChatMember[]
};

export const getAllChatsWithMembers = async (): Promise<Chat[]> => {
  const results = await db
    .select({
      chatId: chatsTable.id,
      userId: chatMembersTable.userId,
      username: usersTable.username,
    })
    .from(chatsTable)
    .innerJoin(chatMembersTable, eq(chatsTable.id, chatMembersTable.chatId))
    .innerJoin(usersTable, eq(chatMembersTable.userId, usersTable.id))
    .all();

  // Group members by chat
  const chatsMap = new Map();

  results.forEach((row) => {
    const { chatId, userId, username } = row;

    if (!chatsMap.has(chatId)) {
      chatsMap.set(chatId, {
        id: chatId,
        members: [],
      });
    }

    chatsMap.get(chatId).members.push({
      id: userId,
      username,
    });
  });

  return Array.from(chatsMap.values());
};

export const getChatsByUserId = async (userId: number) => {
  return db
    .select({
      chatId: chatsTable.id,
      chatName: chatsTable.name,
      createdAt: chatsTable.createdAt,
    })
    .from(chatsTable)
    .innerJoin(chatMembersTable, eq(chatsTable.id, chatMembersTable.chatId))
    .where(eq(chatMembersTable.userId, userId))
    .all();
};

export const getAllChats = async () => {
  return db.select().from(chatsTable).all();
};

export const getAlertStatus = async (region: string) => {
  return db.select().from(alertStatusTable).where(eq(alertStatusTable.region, region)).get();
};

export const upsertAlertStatus = async (region: string, status: boolean) => {
  const timestamp = new Date();

  const result = await db
    .update(alertStatusTable)
    .set({ status, lastChanged: timestamp })
    .where(eq(alertStatusTable.region, region))
    .run();

  if (result.changes === 0) {
    await db.insert(alertStatusTable).values({ region, status, lastChanged: timestamp }).run();
  }
};

export const increaseReputation = async (userId: number, chatId: number) => {
  await db
    .update(chatMembersTable)
    .set({ reputation: sql`${chatMembersTable.reputation} + 1` })
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)));

  return db
    .select({
      reputation: chatMembersTable.reputation,
    })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)))
    .get();
};

export const decreaseReputation = async (userId: number, chatId: number, amount = 1) => {
  await db
    .update(chatMembersTable)
    .set({
      reputation: sql`CASE
                        WHEN ${chatMembersTable.reputation} > 0
                        THEN ${chatMembersTable.reputation} - ${amount}
                        ELSE 0
                      END`,
    })
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)));

  return db
    .select({
      reputation: chatMembersTable.reputation,
    })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)))
    .get();
};

export const resetReputation = async (userId: number, chatId: number) => {
  await db
    .update(chatMembersTable)
    .set({ reputation: 0 })
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)));
};

export const getReputation = async (userId: number, chatId: number) => {
  return db
    .select({ reputation: chatMembersTable.reputation })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)))
    .get();
};

export const resetSwearingCount = async (userId: number, chatId: number) => {
  await db
    .update(chatMembersTable)
    .set({ swearingCount: 0 })
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)));
};

export const increaseSwearingCount = async (userId: number, chatId: number) => {
  await db
    .update(chatMembersTable)
    .set({ swearingCount: sql`${chatMembersTable.swearingCount} + 1` })
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)));

  return db
    .select({
      swearingCount: chatMembersTable.swearingCount,
    })
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)))
    .get();
};

export const getSwearingCount = async (userId: number, chatId: number) => {
  return db
    .select()
    .from(chatMembersTable)
    .where(and(eq(chatMembersTable.userId, userId), eq(chatMembersTable.chatId, chatId)))
    .get();
};

export const addSwearWord = async (word: string): Promise<boolean> => {
  try {
    // Check if the word already exists
    const existingWord = await db
      .select()
      .from(swearWordsTable)
      .where(eq(swearWordsTable.word, word))
      .get();

    if (existingWord?.word) {
      // Word already exists
      return false;
    }

    // Insert the new word (with .run() to execute the query)
    await db.insert(swearWordsTable).values({ word }).run();

    // Successfully added
    return true;
  } catch (error) {
    // Log the error with context
    console.error('Error adding swear word:', { word, error });
    return false;
  }
};

export const removeSwearWord = async (word: string) => {
  await db.delete(swearWordsTable).where(eq(swearWordsTable.word, word));
};

export const getSwearWords = async () => {
  return db.select().from(swearWordsTable).all();
};

import { MyContext } from '../types';
import { getOrCreateUser, getOrCreateChat, addChatMember } from '../db.js';

export async function ensureUserAndChat(ctx: MyContext) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!userId || !chatId) {
    return { userId: null, chatId: null };
  }
  if (ctx.chat.type !== 'private') {
    await getOrCreateUser(userId, ctx.from?.username ?? null);
    await getOrCreateChat(chatId, ctx.chat.title ?? null);
    await addChatMember(userId, chatId);
  }

  return { userId, chatId };
}

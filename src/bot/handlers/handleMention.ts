import { MyContext } from '../types'
import { ensureUserAndChat } from '../utils'
import { getChatMembers } from '../db'

export async function handleAll(ctx: MyContext) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  const chats = await getChatMembers(chatId)
  const message = chats.map((member) => `@${member.username}`).join('\n')

  await ctx.reply(message)
}

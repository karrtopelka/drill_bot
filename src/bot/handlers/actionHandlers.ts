import { MyContext } from '../types'
import { ReactionTypeEmoji } from 'grammy/types'
import { addAction, getUserStats } from '../db.js'
import { formatActionMessage } from '../utils/index.js'
import { ensureUserAndChat } from '../utils/contextHelpers'

export async function handleActionCommand(
  ctx: MyContext,
  actionType: 'shit' | 'fart' | 'piss',
  reactionEmoji: ReactionTypeEmoji['emoji'],
) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  const username = ctx.from?.username ?? 'Анонім'
  await addAction(userId, chatId, actionType)

  const stats = await getUserStats(userId, chatId)
  const totalCount = stats.total.find((a) => a.actionType === actionType)?.count ?? 0
  const todayCount = stats.todayStats.find((a) => a.actionType === actionType)?.count ?? 0

  await ctx.reply(
    formatActionMessage(username, {
      type: actionType,
      count: { total: totalCount, today: todayCount },
    }),
    { parse_mode: 'Markdown' },
  )

  // Optional: React to the user's message
  if (ctx.message?.message_id) {
    await ctx.api.setMessageReaction(chatId, ctx.message.message_id, [
      { type: 'emoji', emoji: reactionEmoji },
    ])
  }
}

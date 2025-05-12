import { MyContext } from '../types'
import { ensureUserAndChat, formatUserStats } from '../utils'
import { getAllStats, getUserStats } from '../db'

export async function handleStats(ctx: MyContext) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  const stats = await getUserStats(userId, chatId)
  await ctx.reply(formatUserStats(stats))
}

export async function handleAllStats(ctx: MyContext) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  const stats = await getAllStats(chatId)
  const header = '🏆 *Загальна статистика*\n'

  const statsText = stats
    .map(
      (u) =>
        `\n👤 *@${u.username ?? 'Анонім'}*\n` +
        `💩 Срав: ${u.shitCount} раз\n` +
        `💨 Пернув: ${u.fartCount} раз\n` +
        `💦 Попісяв: ${u.pissCount} раз`,
    )
    .join('\n')

  // Find the user with the max count for each action
  const maxShit = Math.max(...stats.map((u) => u.shitCount))
  const maxFart = Math.max(...stats.map((u) => u.fartCount))
  const maxPiss = Math.max(...stats.map((u) => u.pissCount))

  const shitter = stats.find((u) => u.shitCount === maxShit)
  const farter = stats.find((u) => u.fartCount === maxFart)
  const pisser = stats.find((u) => u.pissCount === maxPiss)

  const shitterMessage = shitter
    ? `\n👑 *${shitter.username}* - King of the hill серед серунів!`
    : ''
  const farterMessage = farter ? `\n👑 *${farter.username}* - King of the hill серед пердунів!` : ''
  const pisserMessage = pisser ? `\n👑 *${pisser.username}* - King of the hill серед пісьок!` : ''

  await ctx.reply(header + statsText + '\n' + shitterMessage + farterMessage + pisserMessage, {
    parse_mode: 'Markdown',
  })
}

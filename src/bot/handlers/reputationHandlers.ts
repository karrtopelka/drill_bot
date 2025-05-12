import { MyContext } from '../types'
import { ensureUserAndChat, formatAllUsersReputation } from '../utils'
import {
  getChatMember,
  getOrCreateUser,
  addChatMember,
  increaseReputation,
  decreaseReputation,
  getAllUsersReputation,
  getReputation,
} from '../db.js'

export async function handleReputationChange(ctx: MyContext, delta: 1 | -1) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  // Command must be a reply to someone
  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Ця команда повинна бути відповіддю на чиєсь повідомлення')
    return
  }

  const targetUserId = ctx.message.reply_to_message.from?.id
  const targetUsername = ctx.message.reply_to_message.from?.username

  // Can't rep yourself
  if (!targetUserId || targetUserId === userId) {
    await ctx.reply(
      delta > 0 ? 'Ти не можеш дати реп самому собі' : 'Ти не можеш забрати реп у самого себе',
    )
    return
  }

  // Check if the caller has enough rep (at least 3) to do it
  const callerUser = await getChatMember(userId, chatId)
  if (callerUser?.reputation && callerUser.reputation < 3) {
    await ctx.reply('В тебе немає достатньо репутації для цієї команди')
    return
  }

  // Since we are doing it in a public chat, ensure target is created
  if (ctx.chat?.type !== 'private') {
    await getOrCreateUser(targetUserId, targetUsername ?? null)
    await addChatMember(targetUserId, chatId)
  }

  const changes =
    delta > 0
      ? await increaseReputation(targetUserId, chatId)
      : await decreaseReputation(targetUserId, chatId)

  const newRep = changes?.reputation ?? 0
  const plusMinus = delta > 0 ? '+1' : '-1'
  await ctx.reply(
    `@${targetUsername ?? 'Користувач'} отримав ${plusMinus} до репутації. Тепер його репутація: ${newRep}`,
  )
}

export async function handleAllReputation(ctx: MyContext) {
  const { chatId } = await ensureUserAndChat(ctx)
  if (!chatId) return

  const rep = await getAllUsersReputation(chatId)
  await ctx.reply(formatAllUsersReputation(rep))
}

export async function handleMyReputation(ctx: MyContext) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  const rep = await getReputation(userId, chatId)
  await ctx.reply(`Твоя репутація: ${rep?.reputation ?? 0}`)
}

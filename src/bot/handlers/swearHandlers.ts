import { MyContext } from '../types'
import { ensureUserAndChat } from '../utils'
import { addSwearWord, removeSwearWord } from '../db'

export async function handleSwear(ctx: MyContext) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Ця команда повинна бути відповіддю на чиєсь повідомлення')
    return
  }

  // Must be exactly 1 word
  const text = ctx.message.reply_to_message.text
  if (!text || text.split(' ').length > 1) {
    await ctx.reply('Ця команда повинна бути відповіддю на слово')
    return
  }

  const swearWord = text.toLowerCase().trim()
  const result = await addSwearWord(swearWord)

  if (!result) {
    await ctx.reply(`Слово ${swearWord} вже є в списку ненормативної лексики`)
    return
  }
  await ctx.reply(`Слово ${swearWord} додано до списку ненормативної лексики`)
}

export async function handleUnswear(ctx: MyContext) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Ця команда повинна бути відповіддю на чиєсь повідомлення')
    return
  }

  // Must be exactly 1 word
  const text = ctx.message.reply_to_message.text
  if (!text || text.split(' ').length > 1) {
    await ctx.reply('Ця команда повинна бути відповіддю на слово')
    return
  }

  const swearWord = text.toLowerCase().trim()
  await removeSwearWord(swearWord)
  await ctx.reply(`Слово ${swearWord} видалено зі списку ненормативної лексики`)
}

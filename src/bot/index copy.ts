import { Bot, session } from 'grammy'
import { conversations, createConversation } from '@grammyjs/conversations'
import { loveletter, MyContext } from './loveletter.js'
import {
  formatUserStats,
  formatActionMessage,
  isShitMessage,
  isFartMessage,
  isPissMessage,
  isSwearingMessage,
} from './utils/index.js'
import { LVIV_REGION } from './utils/checkAirAlert.js'
import {
  addAction,
  addChatMember,
  decreaseReputation,
  getAllStats,
  getChatMember,
  getOrCreateChat,
  getOrCreateUser,
  getReputation,
  getUserStats,
  increaseReputation,
  increaseSwearingCount,
  addSwearWord,
  removeSwearWord,
  getAlertStatus,
  getChatMembers,
} from './db.js'

// Initialize bot with your token
const bot = new Bot<MyContext>('7769397969:AAEMM3p0gY6y2v2g9pXtgfSUH5IF0LLwG_I')

bot.use(session({ initial: () => ({}) }))
bot.use(conversations())
bot.use(createConversation(loveletter))

bot.api.setMyCommands([
  { command: 'shit', description: 'Записати що ти посрав' },
  { command: 'fart', description: 'Записати що ти пернув' },
  { command: 'piss', description: 'Записати що ти попісяв' },
  { command: 'stats', description: 'Подивитись свою статистику' },
  { command: 'allstats', description: 'Подивитись загальну статистику' },
  { command: 'rep', description: 'Поваґа' },
  { command: 'unrep', description: 'Неповаґа' },
  { command: 'myrep', description: 'Подивитись свою репутацію' },
  { command: 'all', description: 'Пінганути всіх користувачів' },
  { command: 'airalert', description: 'Подивитись статус повітряної тривоги' },
  { command: 'swear', description: 'Додати слово до списку ненормативної лексики' },
  { command: 'unswear', description: 'Видалити слово зі списку ненормативної лексики' },
])

bot.command('loveletter', async (ctx) => {
  if (ctx.chat?.type !== 'private') {
    await ctx.reply('Перейди в чат зі мною, щоб скористатися цією командою')
    return
  }
  // enter the function "greeting" you declared
  await ctx.conversation.enter('loveletter')
})

bot.command('swear', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Ця команда повинна бути відповіддю на чиєсь повідомлення')
    return
  }

  if (
    !ctx.message.reply_to_message.text ||
    ctx.message.reply_to_message.text.split(' ').length > 1
  ) {
    await ctx.reply('Ця команда повинна бути відповіддю на слово')
    return
  }

  const swearWord = ctx.message.reply_to_message.text.toLowerCase().trim()

  const result = await addSwearWord(swearWord)

  if (!result) {
    await ctx.reply(`Слово ${swearWord} вже є в списку ненормативної лексики`)
    return
  }

  await ctx.reply(`Слово ${swearWord} додано до списку ненормативної лексики`)
})

bot.command('unswear', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Ця команда повинна бути відповіддю на чиєсь повідомлення')
    return
  }

  if (
    !ctx.message.reply_to_message.text ||
    ctx.message.reply_to_message.text.split(' ').length > 1
  ) {
    await ctx.reply('Ця команда повинна бути відповіддю на слово')
    return
  }

  const swearWord = ctx.message.reply_to_message.text.toLowerCase().trim()

  removeSwearWord(swearWord)

  await ctx.reply(`Слово ${swearWord} видалено зі списку ненормативної лексики`)
})

bot.command('rep', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Ця команда повинна бути відповіддю на чиєсь повідомлення')
    return
  }

  const targetUserId = ctx.message.reply_to_message.from?.id
  const targetUsername = ctx.message.reply_to_message.from?.username
  if (!targetUserId || targetUserId === userId) {
    await ctx.reply('Ти не можеш дати реп самому собі')
    return
  }

  const callerUser = await getChatMember(userId, chatId)

  if (callerUser?.reputation && callerUser.reputation < 3) {
    await ctx.reply('В тебе немає достатньо репутації для цієї команди')
    return
  }

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateUser(targetUserId, ctx.message.reply_to_message.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
    addChatMember(targetUserId, chatId)

    const changes = await increaseReputation(targetUserId, chatId)

    await ctx.reply(
      `@${targetUsername ?? 'Користувач'} отримав +1 до репутації. Тепер його репутація: ${changes?.reputation ?? 0}`,
    )
  }
})

bot.command('unrep', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (!ctx.message?.reply_to_message) {
    await ctx.reply('Ця команда повинна бути відповіддю на чиєсь повідомлення')
    return
  }

  const targetUserId = ctx.message.reply_to_message.from?.id
  const targetUsername = ctx.message.reply_to_message.from?.username
  if (!targetUserId || targetUserId === userId) {
    await ctx.reply('Ти не можеш забрати реп самому собі')
    return
  }

  const callerUser = await getChatMember(userId, chatId)

  if (callerUser?.reputation && callerUser.reputation < 3) {
    await ctx.reply('В тебе немає достатньо репутації для цієї команди')
    return
  }

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateUser(targetUserId, ctx.message.reply_to_message.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
    addChatMember(targetUserId, chatId)

    const changes = await decreaseReputation(targetUserId, chatId)

    await ctx.reply(
      `@${targetUsername ?? 'Користувач'} отримав -1 до репутації. Тепер його репутація: ${changes?.reputation ?? 0}`,
    )
  }
})

bot.command('myrep', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  const rep = await getReputation(userId, chatId)
  await ctx.reply(`Твоя репутація: ${rep?.reputation ?? 0}`)
})

bot.command('shit', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
  }

  const username = ctx.from?.username ?? 'Анонім'
  addAction(userId, chatId, 'shit')
  const stats = await getUserStats(userId, chatId)

  const shitCount = stats.total.find((action) => action.actionType === 'shit')?.count ?? 0
  const todayShitCount = stats.todayStats.find((action) => action.actionType === 'shit')?.count ?? 0

  await ctx.reply(
    formatActionMessage(username, {
      type: 'shit',
      count: { total: shitCount, today: todayShitCount },
    }),
    { parse_mode: 'Markdown' },
  )
})

bot.command('fart', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
  }

  const username = ctx.from?.username ?? 'Анонім'
  addAction(userId, chatId, 'fart')
  const stats = await getUserStats(userId, chatId)

  const fartCount = stats.total.find((action) => action.actionType === 'fart')?.count ?? 0
  const todayFartCount = stats.todayStats.find((action) => action.actionType === 'fart')?.count ?? 0

  await ctx.reply(
    formatActionMessage(username, {
      type: 'fart',
      count: { total: fartCount, today: todayFartCount },
    }),
    { parse_mode: 'Markdown' },
  )
})

bot.command('piss', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
  }

  const username = ctx.from?.username ?? 'Анонім'
  addAction(userId, chatId, 'piss')
  const stats = await getUserStats(userId, chatId)

  const pissCount = stats.total.find((action) => action.actionType === 'piss')?.count ?? 0
  const todayPissCount = stats.todayStats.find((action) => action.actionType === 'piss')?.count ?? 0

  await ctx.reply(
    formatActionMessage(username, {
      type: 'piss',
      count: { total: pissCount, today: todayPissCount },
    }),
    { parse_mode: 'Markdown' },
  )
})

bot.command('allstats', async (ctx) => {
  const chatId = ctx.chat?.id
  const userId = ctx.from?.id
  if (!chatId || !userId) return

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
  }

  const stats = await getAllStats(chatId)
  const header = '🏆 *Загальна статистика*\n'

  const statsText = stats
    .map(
      (user) =>
        `\n👤 *@${user.username ?? 'Анонім'}*\n` +
        `💩 Срав: ${user.shitCount} раз\n` +
        `💨 Пернув: ${user.fartCount} раз\n` +
        `💦 Попісяв: ${user.pissCount} раз`,
    )
    .join('\n')

  const shitter = stats.find(
    (user) => user.shitCount === Math.max(...stats.map((user) => user.shitCount)),
  )
  const shitterMessage = shitter
    ? `\n👑 *${shitter.username}* - King of the fill серед серунів!`
    : ''

  const farter = stats.find(
    (user) => user.fartCount === Math.max(...stats.map((user) => user.fartCount)),
  )
  const farterMessage = farter ? `\n👑 *${farter.username}* - King of the fart серед пердунів!` : ''

  const pisser = stats.find(
    (user) => user.pissCount === Math.max(...stats.map((user) => user.pissCount)),
  )
  const pisserMessage = pisser ? `\n👑 *${pisser.username}* - King of the piss серед пісьок!` : ''

  await ctx.reply(
    header + statsText + '\n' + shitterMessage + '\n' + farterMessage + '\n' + pisserMessage,
    {
      parse_mode: 'Markdown',
    },
  )
})

bot.command('stats', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
  }

  const stats = await getUserStats(userId, chatId)
  await ctx.reply(formatUserStats(stats))
})

bot.command('airalert', async (ctx) => {
  const chatId = ctx.chat?.id
  if (!chatId) return

  const alertStatus = await getAlertStatus(LVIV_REGION)

  if (!alertStatus) {
    await ctx.reply('Повітряна тривога ще не визначена')
    return
  }

  await ctx.reply(
    alertStatus.status
      ? '🚨 *Зараз повітряна тривога* 🚨'
      : '✅ *Зараз немає повітряної тривоги* ✅',
  )
})

bot.command('all', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  const chats = await getChatMembers(chatId)

  const message = chats.map((chat) => `@${chat.username}`).join('\n')

  await ctx.reply(message)
})

bot.on('message:text', async (ctx) => {
  const userId = ctx.from?.id
  const chatId = ctx.chat?.id
  if (!userId || !chatId) return

  if (ctx.chat?.type !== 'private') {
    getOrCreateUser(userId, ctx.from?.username ?? null)
    getOrCreateChat(chatId, ctx.chat?.title ?? null)
    addChatMember(userId, chatId)
  }

  const text = ctx.message.text
  const username = ctx.from.username ?? 'Анонім'

  // If the message contains дарчик or жарчик or дорій or дарій send 🧔𓂸👧
  if (text.toLowerCase().match(/(дарчик|жарчик|дорій|дарій)/i)) {
    await bot.api.sendMessage(chatId, '👧𓂸🧔')
  }

  if (text.toLowerCase().match(/(sl[ae]y|сл[еэ][йи]|слейч[иі]к[с]?)/i)) {
    await bot.api.sendSticker(
      chatId,
      'CAACAgEAAxkBAAENf-5nh6xVuo0JcORJFOeghIBuye0NFAACGgMAAvwQuUV1FhnsZjGMjjYE',
    )
  }

  if (text.toLowerCase().match(/(к[еє]нт[ік]?)/i)) {
    await bot.api.sendSticker(
      chatId,
      'CAACAgIAAxkBAAENf_Bnh6yD-uGkeloD4osoxzel_qz64AACPVYAAqhoeUgXtrFrX6GynTYE',
    )
  }

  const isSwearing = await isSwearingMessage(text)

  if (isSwearing) {
    await ctx.api.setMessageReaction(chatId, ctx.message.message_id, [
      { type: 'emoji', emoji: '🤬' },
    ])

    const changes = await increaseSwearingCount(userId, chatId)

    if (changes?.swearingCount && changes.swearingCount % 10 === 0) {
      const amount = Math.floor(changes.swearingCount / 10)
      await decreaseReputation(userId, chatId, amount)
      await ctx.api.sendMessage(
        chatId,
        `@${username} втратив ${amount} балів репутації за надмірне використання ненормативної лексики.`,
      )
    }

    await ctx.api.sendMessage(
      chatId,
      `@${username} не матюкайся. Ти матюкався ${changes?.swearingCount ?? 0} разів.`,
    )
  }

  if (isShitMessage(text)) {
    addAction(userId, chatId, 'shit')
    const stats = await getUserStats(userId, chatId)
    const shitCount = stats.total.find((action) => action.actionType === 'shit')?.count ?? 0
    const todayShitCount =
      stats.todayStats.find((action) => action.actionType === 'shit')?.count ?? 0
    await ctx.api.setMessageReaction(chatId, ctx.message.message_id, [
      { type: 'emoji', emoji: '💩' },
    ])
    await ctx.reply(
      formatActionMessage(username, {
        type: 'shit',
        count: { total: shitCount, today: todayShitCount },
      }),
      { parse_mode: 'Markdown' },
    )
  } else if (isFartMessage(text)) {
    addAction(userId, chatId, 'fart')
    const stats = await getUserStats(userId, chatId)
    const fartCount = stats.total.find((action) => action.actionType === 'fart')?.count ?? 0
    const todayFartCount =
      stats.todayStats.find((action) => action.actionType === 'fart')?.count ?? 0
    await ctx.api.setMessageReaction(chatId, ctx.message.message_id, [
      { type: 'emoji', emoji: '🙊' },
    ])
    await ctx.reply(
      formatActionMessage(username, {
        type: 'fart',
        count: { total: fartCount, today: todayFartCount },
      }),
      { parse_mode: 'Markdown' },
    )
  } else if (isPissMessage(text)) {
    addAction(userId, chatId, 'piss')
    const stats = await getUserStats(userId, chatId)
    const pissCount = stats.total.find((action) => action.actionType === 'piss')?.count ?? 0
    const todayPissCount =
      stats.todayStats.find((action) => action.actionType === 'piss')?.count ?? 0
    await ctx.api.setMessageReaction(chatId, ctx.message.message_id, [
      { type: 'emoji', emoji: '🐳' },
    ])
    await ctx.reply(
      formatActionMessage(username, {
        type: 'piss',
        count: { total: pissCount, today: todayPissCount },
      }),
      { parse_mode: 'Markdown' },
    )
  }
})

// Error handler
bot.catch((err) => {
  console.error('Error in bot:', err)
})

// Start the bot
console.log('Starting bot...')
bot.start({
  onStart: async () => {
    // setInterval(() => checkAirAlert(bot), CHECK_INTERVAL)
    // // Do initial check
    // checkAirAlert(bot)
  },
})

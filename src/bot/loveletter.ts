import { InlineKeyboard } from 'grammy'
import { getChatMembers, getChatsByUserId } from './db'
import { MyConversation, MyContext } from './types'

export async function loveletter(conversation: MyConversation, ctx: MyContext) {
  if (ctx.chat?.type !== 'private') return

  const userId = ctx.from?.id
  const messageId = ctx?.message?.message_id
  if (!userId || !messageId) return

  await ctx.api.setMessageReaction(userId, messageId, [
    {
      type: 'emoji',
      emoji: '💋',
    },
  ])

  // Get all chats where user is a member
  const userChats = await getChatsByUserId(userId)

  if (!userChats.length) {
    await ctx.reply('Ти не належиш до жодної групи!')
    return
  }

  // Create inline keyboard with chat options
  const chatKeyboard = new InlineKeyboard()
  userChats.forEach((chat) => {
    chatKeyboard.text(chat.chatName || `Група ${chat.chatId}`, `chat_${chat.chatId}`).row()
  })

  await ctx.reply('В якій групі ця людина?', {
    reply_markup: chatKeyboard,
  })

  // Wait for chat selection
  const chatSelection = await conversation.waitForCallbackQuery(
    userChats.map((chat) => `chat_${chat.chatId}`),
    {
      otherwise: (ctx) => ctx.reply('Скористайся кнопками!', { reply_markup: chatKeyboard }),
    },
  )
  const selectedChatId =
    typeof chatSelection.match === 'string'
      ? Number(chatSelection.match.replace('chat_', ''))
      : Number(chatSelection.match[0].replace('chat_', ''))
  await chatSelection.answerCallbackQuery()

  // Get members of selected chat
  const chatMembers = await getChatMembers(selectedChatId)

  // Create inline keyboard with member options
  const memberKeyboard = new InlineKeyboard()
  chatMembers.forEach((member) => {
    memberKeyboard
      .text(member.username || `Челик без імені ${member.memberId}`, `user_${member.memberId}`)
      .row()
  })

  await ctx.reply('Кому ти хочеш залишити посилання?', {
    reply_markup: memberKeyboard,
  })

  // Wait for member selection
  const memberSelection = await conversation.waitForCallbackQuery(
    chatMembers.map((m) => `user_${m.memberId}`),
    {
      otherwise: (ctx) => ctx.reply('Скористайся кнопками!', { reply_markup: memberKeyboard }),
    },
  )
  const selectedUserId =
    typeof memberSelection.match === 'string'
      ? Number(memberSelection.match.replace('user_', ''))
      : Number(memberSelection.match[0].replace('user_', ''))
  const selectedUser = chatMembers.find((m) => m.memberId === selectedUserId)
  await memberSelection.answerCallbackQuery()

  // Ask for message
  await ctx.reply('Напиши щось про цього чувака')
  const messageCtx = await conversation.waitFor(':text')
  const message = messageCtx.message?.text

  if (!message) {
    await ctx.reply('Будь ласка, напиши щось. (ти повинен почати знову весь процес якщо що)')
    return
  }

  // Ask for anonymity preference
  const anonKeyboard = new InlineKeyboard().text('Анонімно', 'anon').text('Публічно', 'public')

  await ctx.reply('Ти хочеш відправити це анонімно чи публічно?', {
    reply_markup: anonKeyboard,
  })

  // Wait for anonymity choice
  const anonChoice = await conversation.waitForCallbackQuery(['anon', 'public'])
  const isAnon = anonChoice.match === 'anon'
  await anonChoice.answerCallbackQuery()

  // Send the message to the group
  const senderUsername = ctx.from.username || 'unknown'
  const targetUsername = selectedUser?.username || 'unknown'

  const isSelf = senderUsername === targetUsername

  const formattedMessage = isAnon
    ? isSelf
      ? `@${targetUsername}, сказав про себе (або собі. Чел реально думав що це дійсно анонімно): ${message}`
      : `@${targetUsername}, хтось сказав що ти (або про тебе): ${message}`
    : `@${targetUsername}, @${senderUsername} сказав що ти (або про тебе): ${message}`

  await ctx.api.sendMessage(selectedChatId, formattedMessage)
  await ctx.reply('Готово!')
}

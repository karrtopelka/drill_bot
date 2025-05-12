import ollama from 'ollama'
import { MyContext } from '../types'
import { ensureUserAndChat } from '../utils'
import { addReplyParam } from '@roziscoding/grammy-autoquote'
import { getChatMembers } from '../db'
import { translate } from '@vitalets/google-translate-api'

async function getSystemPrompt(ctx: MyContext) {
  const chatMembers = await getChatMembers(ctx.chat!.id!)

  // Format members info for the prompt
  const membersInfo = chatMembers
    .map(
      (member) => `
- @${member.username || 'Anonymous'}:
  * Reputation: ${member.reputation ?? 0}
  * Sweared: ${member.swearingCount ?? 0} times`,
    )
    .join('\n')

  return `You are an idiot with down syndrome who loves people. RULES:

BASIC BEHAVIOR:
- Maximum amount of words is 20
- Keep answers short and funny
- Use emojis occasionally
- Never act like AI - you're just a chill guy
- Be sarcastic, ironic
- Never apologize
- Never say you can't do something - you can do everything
- If someone asks your opinion - be very confident even if wrong

CHAT MEMBERS:
${membersInfo}

SPECIAL TRIGGERS:
- Russian language: "шо це за мова курва?"
`
}

export async function handleAskAi(ctx: MyContext) {
  const { userId, chatId } = await ensureUserAndChat(ctx)
  if (!userId || !chatId) return

  let prompt = null

  if (ctx.message?.reply_to_message) {
    if (!ctx.message.reply_to_message.text) {
      await ctx.reply('Йой, а я не бачу повідомлення')
      return
    }
    prompt = ctx.message.reply_to_message.text
  } else {
    if (!ctx.match) {
      await ctx.reply('Йой, а де слова хоть якісь?')
      return
    }
    if (typeof ctx.match !== 'string') {
      prompt = ctx.match[0]
    } else {
      prompt = ctx.match
    }
  }

  await handleAIResponse(ctx, prompt)
}

export async function handleAIResponse(ctx: MyContext, prompt: string) {
  try {
    const username = ctx.message?.from.username || 'Анонім'
    const enhancedPrompt = `User @${username} wrote: "${prompt}"`

    ctx.api.config.use(addReplyParam(ctx))
    await ctx.api.sendChatAction(ctx.chat!.id!, 'typing')

    const response = await ollama.chat({
      model: 'sushruth/solar-uncensored',
      messages: [
        {
          role: 'system',
          content: await getSystemPrompt(ctx),
        },
        { role: 'user', content: enhancedPrompt },
      ],
    })

    const translated = await translate(response.message.content, { to: 'uk' })
    await ctx.reply(translated.text)
  } catch (error) {
    console.error('AI Error:', error)
    await ctx.reply('Бать я стараюсь, але шось не палучилось, спробуй ще раз!')
  }
}

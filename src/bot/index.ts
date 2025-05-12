import { Bot, session } from 'grammy';
import { conversations } from '@grammyjs/conversations';
import { MyContext } from './types';
import { hydrateFiles } from '@grammyjs/files';
import { handleTikTokLink } from './download-tiktok';

export const bot = new Bot<MyContext>(process.env.BOT_TOKEN!);

bot.use(session({ initial: () => ({}) }));
bot.use(conversations());
// bot.use(createConversation(loveletter))
bot.api.config.use(hydrateFiles(bot.token));

// registerCommands(bot)

bot.api.setMyCommands([
  // { command: 'shit', description: 'Записати що ти посрав' },
  // { command: 'fart', description: 'Записати що ти пернув' },
  // { command: 'piss', description: 'Записати що ти попісяв' },
  // { command: 'stats', description: 'Подивитись свою статистику' },
  // { command: 'allstats', description: 'Подивитись загальну статистику' },
  // { command: 'rep', description: 'Поваґа' },
  // { command: 'unrep', description: 'Неповаґа' },
  // { command: 'myrep', description: 'Подивитись свою репутацію' },
  // { command: 'allrep', description: 'Подивитись репутацію всіх користувачів' },
  // { command: 'all', description: 'Пінганути всіх користувачів' },
  // { command: 'swear', description: 'Додати слово до списку ненормативної лексики' },
  // { command: 'unswear', description: 'Видалити слово зі списку ненормативної лексики' },
  // { command: 'loveletter', description: 'Приватно написати любовного листа' },
  // { command: 'trivia', description: 'Грати в тривію' },
  // { command: 'ask', description: 'Спитати бота шось' },
]);

// bot.command('loveletter', async (ctx) => {
//   if (ctx.chat?.type !== 'private') {
//     await ctx.reply('Перейди в чат зі мною, щоб скористатися цією командою')
//     return
//   }
//   // enter the function "greeting" you declared
//   await ctx.conversation.enter('loveletter')
// })

/** Start trivia game */
// setupTriviaGame(bot)

bot.on('message:text', async (ctx) => {
  // const { userId, chatId } = await ensureUserAndChat(ctx);
  // if (!userId || !chatId) return;

  // const text = ctx.message.text.toLowerCase()
  // const username = ctx.from.username ?? 'Анонім'

  // // Swearing check
  // if (await isSwearingMessage(text)) {
  //   await ctx.api.setMessageReaction(chatId, ctx.message.message_id, [
  //     { type: 'emoji', emoji: '🤬' },
  //   ])
  //   const changes = await increaseSwearingCount(userId, chatId)
  //   if (changes?.swearingCount && changes.swearingCount % 10 === 0) {
  //     const amount = Math.floor(changes.swearingCount / 10)
  //     await decreaseReputation(userId, chatId, amount)
  //     await ctx.reply(
  //       `@${username} втратив ${amount} балів репутації за надмірне використання ненормативної лексики.`,
  //     )
  //   }
  //   await ctx.reply(`@${username} не матюкайся. Ти матюкався ${changes?.swearingCount ?? 0} разів.`)
  // }

  await handleTikTokLink(ctx);
});

bot.catch((err) => {
  console.error('Error in bot:', err);
});



import { Bot } from 'grammy'
import { MyContext } from '../types'
import { handleActionCommand } from '../handlers/actionHandlers'
import {
  handleReputationChange,
  handleAllReputation,
  handleMyReputation,
} from '../handlers/reputationHandlers'
import { handleStats, handleAllStats } from '../handlers/statsHandlers'
import { handleSwear, handleUnswear } from '../handlers/swearHandlers'
import { handleAll } from '../handlers/handleMention'
import { handleAskAi } from '../handlers/aiHandler'

export function registerCommands(bot: Bot<MyContext>) {
  bot.command('shit', (ctx) => handleActionCommand(ctx, 'shit', '💩'))
  bot.command('fart', (ctx) => handleActionCommand(ctx, 'fart', '🙊'))
  bot.command('piss', (ctx) => handleActionCommand(ctx, 'piss', '🐳'))

  bot.command('rep', (ctx) => handleReputationChange(ctx, +1))
  bot.command('unrep', (ctx) => handleReputationChange(ctx, -1))
  bot.command('allrep', (ctx) => handleAllReputation(ctx))
  bot.command('myrep', (ctx) => handleMyReputation(ctx))

  bot.command('stats', (ctx) => handleStats(ctx))
  bot.command('allstats', (ctx) => handleAllStats(ctx))

  bot.command('swear', (ctx) => handleSwear(ctx))
  bot.command('unswear', (ctx) => handleUnswear(ctx))

  bot.command('all', (ctx) => handleAll(ctx))

  bot.command('ask', handleAskAi)
}

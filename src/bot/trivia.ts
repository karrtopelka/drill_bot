import { Bot, Context, InlineKeyboard } from 'grammy'
import translate from 'translate'
import axios from 'axios'
import { increaseReputation } from './db'
import { MyContext } from './types'

interface TriviaQuestion {
  category: string
  type: string
  difficulty: string
  question: string
  translated_question: string
  correct_answer: string
  incorrect_answers: string[]
}

interface GameSettings {
  category?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  questionsCount: number
}

interface Player {
  id: number
  name: string
  username?: string
}

interface GameState {
  players: Set<Player>
  currentQuestion: TriviaQuestion
  answers: Map<number, boolean>
  questionMessage?: number
  score: Map<number, number>
  round: number
  settings: GameSettings
  questions: TriviaQuestion[]
}

const DEFAULT_AMOUNT_OF_QUESTIONS = 5

const CATEGORIES = {
  'Загальні знання': 9, // General Knowledge
  Книги: 10, // Entertainment: Books
  Фільми: 11, // Entertainment: Film
  Музика: 12, // Entertainment: Music
  Телебачення: 14, // Entertainment: Television
  Відеоігри: 15, // Entertainment: Video Games
  Наука: 17, // Science & Nature
  "Комп'ютери": 18, // Science: Computers
  Математика: 19, // Science: Mathematics
  Спорт: 21, // Sports
  Географія: 22, // Geography
  Історія: 23, // History
  Політика: 24, // Politics
  Мистецтво: 25, // Art
  Тварини: 27, // Animals
} as const

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&hellip;/g, '...')
    .replace(/&shy;/g, '')
}

function getMainMenuText(game: GameState): string {
  const players = Array.from(game.players)
    .map((p) => (p.username ? `@${p.username}` : p.name))
    .join(', ')

  return `🎲 *Нова гра в тривію!*\n\n👥 Гравці: ${players.length > 0 ? players : 'нікого'}`
}

async function fetchAllQuestions(game: GameState) {
  const { settings } = game

  // Build the URL once
  let apiUrl = 'https://opentdb.com/api.php?type=boolean'
  apiUrl += `&amount=${settings.questionsCount}`

  if (settings.category) {
    apiUrl += `&category=${settings.category}`
  }
  if (settings.difficulty) {
    apiUrl += `&difficulty=${settings.difficulty}`
  }

  // Fetch all questions
  const response = await axios.get(apiUrl)
  const results: TriviaQuestion[] = response.data.results

  // Setup translation engine (still 1 call per question, but only once total)
  translate.engine = 'deepl'
  translate.key = '369d03de-57a9-4012-b89e-1923fe781fcb:fx'

  // Process each question: decode HTML, then translate
  const questions: TriviaQuestion[] = []
  for (const q of results) {
    q.question = decodeHtmlEntities(q.question)
    const translated = await translate(q.question, 'uk')
    q.translated_question = translated

    questions.push(q)
  }

  // Store them in the game state
  game.questions = questions
}

async function endGame(ctx: Context, game: GameState) {
  const chatId = ctx.chat?.id
  if (!chatId) return

  await ctx.reply('🎯 *Гра завершена!*', { parse_mode: 'Markdown' })

  // Find highest score
  const maxScore = Math.max(...Array.from(game.score.values()))

  // Get all winners (players with max score)
  const winners = Array.from(game.score.entries())
    .filter(([, score]) => score === maxScore)
    .map(([userId]) => userId)

  // Award reputation to winners
  for (const winnerId of winners) {
    const winner = Array.from(game.players).find((p) => p.id === winnerId)
    if (winner) {
      await increaseReputation(winner.id, chatId)
      await ctx.reply(
        `${winner.username ? `@${winner.username}` : winner.name} отримав +1 до репутації!`,
      )
    }
  }

  games.delete(chatId)
}

const games = new Map<number, GameState>()

export async function setupTriviaGame(bot: Bot<MyContext>) {
  bot.command('trivia', async (ctx) => {
    if (!ctx.chat?.id) return

    const keyboard = new InlineKeyboard()
      .text('Приєднатися 🎮', 'join_game')
      .text('Вийти 🚪', 'leave_game')
      .row()
      .text('Налаштувати ⚙️', 'settings')
      .row()
      .text('Почати гру 🎯', 'start_game')

    await ctx.reply('🎲 *Нова гра в тривію!*\nНатисніть щоб приєднатися:', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })

    games.set(ctx.chat.id, {
      players: new Set(),
      answers: new Map(),
      score: new Map(),
      currentQuestion: null!,
      settings: {
        questionsCount: DEFAULT_AMOUNT_OF_QUESTIONS,
      },
      round: 0,
      questions: [],
    })
  })

  bot.callbackQuery('leave_game', async (ctx) => {
    const chatId = ctx.chat?.id
    const userId = ctx.from?.id
    if (!chatId || !userId || !games.has(chatId)) return

    const game = games.get(chatId)!

    // Check if user is actually in the game
    const existingPlayer = Array.from(game.players).find((p) => p.id === userId)
    if (!existingPlayer) {
      await ctx.answerCallbackQuery({
        text: 'Ви не в грі, тому не можете вийти!',
        show_alert: true,
      })
      return
    }

    // Remove the user from the game
    game.players.delete(existingPlayer)
    game.score.delete(userId)

    await ctx.answerCallbackQuery({
      text: 'Ви вийшли з гри!',
    })

    // Update the player list in the message
    const players = Array.from(game.players)
      .map((p) => (p.username ? `@${p.username}` : p.name))
      .join(', ')

    await ctx.editMessageText(
      `🎲 *Нова гра в тривію!*\n\n👥 Гравці: ${players.length > 0 ? players : 'нікого'}\n`,
      {
        reply_markup: ctx.callbackQuery.message?.reply_markup,
        parse_mode: 'Markdown',
      },
    )
  })

  bot.callbackQuery('settings', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text('Категорії 📚', 'settings_categories')
      .text('Кількість питань 🔢', 'settings_questions')
      .row()
      .text('Складність 🎯', 'settings_difficulty')
      .row()
      .text('Назад ↩️', 'back_to_game')

    await ctx.editMessageText('⚙️ *Налаштування гри*\n\nОберіть що налаштувати:', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  })

  // Categories menu
  bot.callbackQuery('settings_categories', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const game = games.get(chatId)!
    const keyboard = new InlineKeyboard()

    Object.entries(CATEGORIES).forEach(([name, id], index) => {
      const isSelected = game.settings.category === id
      keyboard.text(`${isSelected ? '✅' : '⬜️'} ${name}`, `toggle_category:${id}`)
      if ((index + 1) % 2 === 0) keyboard.row()
    })

    keyboard.row().text('Назад ↩️', 'settings')

    await ctx.editMessageText('📚 *Категорії*\n\nОберіть категорії (можна декілька):', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  })

  // Questions count handler
  bot.callbackQuery('settings_questions', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const game = games.get(chatId)!
    const keyboard = new InlineKeyboard()

    const questionCounts = [3, 5, 10, 15, 25, 50]

    questionCounts.forEach((count, index) => {
      const isSelected = game.settings.questionsCount === count
      keyboard.text(`${isSelected ? '✅' : '⬜️'} ${count}`, `set_questions:${count}`)
      if ((index + 1) % 3 === 0) keyboard.row()
    })

    keyboard.row().text('Назад ↩️', 'settings')

    await ctx.editMessageText('🔢 *Кількість питань*\n\nОберіть кількість питань:', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  })

  // Difficulty menu
  bot.callbackQuery('settings_difficulty', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const game = games.get(chatId)!
    const keyboard = new InlineKeyboard()

    const difficulties = [
      { id: 'easy', name: 'Легко' },
      { id: 'medium', name: 'Середньо' },
      { id: 'hard', name: 'Важко' },
    ]

    difficulties.forEach(({ id, name }) => {
      const isSelected = game.settings.difficulty === id
      keyboard.text(`${isSelected ? '✅' : '⬜️'} ${name}`, `toggle_difficulty:${id}`).row()
    })

    keyboard.text('Назад ↩️', 'settings')

    await ctx.editMessageText('🎯 *Складність*\n\nОберіть складність (можна декілька):', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  })

  // Handle category toggling
  bot.callbackQuery(/toggle_category:(\d+)/, async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const categoryId = parseInt(ctx.match[1])
    const game = games.get(chatId)!

    // Toggle category (set if different, unset if same)
    game.settings.category = game.settings.category === categoryId ? undefined : categoryId

    // Rebuild keyboard with updated selections
    const keyboard = new InlineKeyboard()
    Object.entries(CATEGORIES).forEach(([name, id], index) => {
      const isSelected = game.settings.category === id
      keyboard.text(`${isSelected ? '✅' : '⬜️'} ${name}`, `toggle_category:${id}`)
      if ((index + 1) % 2 === 0) keyboard.row()
    })
    keyboard.row().text('Назад ↩️', 'settings')

    await ctx.editMessageText('📚 *Категорії*\n\nОберіть категорію:', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
    await ctx.answerCallbackQuery({ text: 'Категорію оновлено!' })
  })

  // Handle difficulty toggling
  bot.callbackQuery(/toggle_difficulty:(\w+)/, async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const difficulty = ctx.match[1] as GameSettings['difficulty']
    const game = games.get(chatId)!

    // Toggle difficulty (set if different, unset if same)
    game.settings.difficulty = game.settings.difficulty === difficulty ? undefined : difficulty

    // Rebuild keyboard with updated selections
    const keyboard = new InlineKeyboard()
    const difficulties = [
      { id: 'easy', name: 'Легко' },
      { id: 'medium', name: 'Середньо' },
      { id: 'hard', name: 'Важко' },
    ]

    difficulties.forEach(({ id, name }) => {
      const isSelected = game.settings.difficulty === id
      keyboard.text(`${isSelected ? '✅' : '⬜️'} ${name}`, `toggle_difficulty:${id}`).row()
    })
    keyboard.text('Назад ↩️', 'settings')

    await ctx.editMessageText('🎯 *Складність*\n\nОберіть складність:', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
    await ctx.answerCallbackQuery({ text: 'Складність оновлено!' })
  })

  // Handle questions count message
  bot.callbackQuery(/set_questions:(\d+)/, async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const count = parseInt(ctx.match[1])
    const game = games.get(chatId)!
    game.settings.questionsCount = count

    // Rebuild keyboard with updated selection
    const keyboard = new InlineKeyboard()
    const questionCounts = [3, 5, 10, 15, 25, 50]

    questionCounts.forEach((num, index) => {
      const isSelected = count === num
      keyboard.text(`${isSelected ? '✅' : '⬜️'} ${num}`, `set_questions:${num}`)
      if ((index + 1) % 3 === 0) keyboard.row()
    })

    keyboard.row().text('Назад ↩️', 'settings')

    await ctx.editMessageText('🔢 *Кількість питань*\n\nОберіть кількість питань:', {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
    await ctx.answerCallbackQuery({ text: `Встановлено ${count} питань!` })
  })

  // Back to game handler
  bot.callbackQuery('back_to_game', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const game = games.get(chatId)!

    const keyboard = new InlineKeyboard()
      .text('Приєднатися 🎮', 'join_game')
      .text('Вийти 🚪', 'leave_game')
      .row()
      .text('Налаштувати ⚙️', 'settings')
      .row()
      .text('Почати гру 🎯', 'start_game')

    await ctx.editMessageText(getMainMenuText(game), {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    })
  })

  bot.callbackQuery('join_game', async (ctx) => {
    const chatId = ctx.chat?.id
    const userId = ctx.from?.id
    if (!chatId || !userId || !games.has(chatId)) return

    const game = games.get(chatId)!

    // Don't let player join twice
    if (Array.from(game.players).some((p) => p.id === userId)) {
      await ctx.answerCallbackQuery({
        text: 'Ви вже в грі!',
        show_alert: true,
      })
      return
    }

    game.players.add({
      id: userId,
      name: ctx.from?.first_name || 'Гравець',
      username: ctx.from?.username,
    })

    game.score.set(userId, 0)

    await ctx.answerCallbackQuery({
      text: 'Ви приєдналися до гри!',
    })

    const players = Array.from(game.players)
      .map((p) => (p.username ? `@${p.username}` : p.name))
      .join(', ')

    await ctx.editMessageText(`🎲 *Нова гра в тривію!*\n\n👥 Гравці: ${players}`, {
      reply_markup: ctx.callbackQuery.message?.reply_markup,
      parse_mode: 'Markdown',
    })
  })

  // Handle start game button
  bot.callbackQuery('start_game', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const game = games.get(chatId)!
    if (game.players.size < 1) {
      await ctx.answerCallbackQuery({
        text: 'Недостатньо гравців для початку!',
      })
      return
    }

    if (ctx.callbackQuery.message) {
      await ctx.api.deleteMessage(chatId, ctx.callbackQuery.message.message_id)
    }

    // Fetch all questions at once (only if not already fetched)
    if (!game.questions || game.questions.length === 0) {
      await fetchAllQuestions(game)
    }

    await startRound(ctx)
  })

  bot.callbackQuery('settings', async (ctx) => {
    const chatId = ctx.chat?.id
    if (!chatId || !games.has(chatId)) return

    const categoryKeyboard = new InlineKeyboard()
    Object.entries(CATEGORIES).forEach(([name, id], index) => {
      categoryKeyboard.text(name, `set_category:${id}`)
      if ((index + 1) % 2 === 0) categoryKeyboard.row()
    })
    categoryKeyboard
      .row()
      .text('Складність: Легко', 'set_difficulty:easy')
      .row()
      .text('Складність: Середньо', 'set_difficulty:medium')
      .row()
      .text('Складність: Важко', 'set_difficulty:hard')
      .row()
      .text('Кількість питань: 5', 'set_questions:5')
      .text('10', 'set_questions:10')
      .text('15', 'set_questions:15')

    await ctx.editMessageText(
      '⚙️ *Налаштування гри*\n\nОберіть категорію, складність та кількість питань:',
      {
        reply_markup: categoryKeyboard,
        parse_mode: 'Markdown',
      },
    )
  })

  // Handle answer buttons
  bot.callbackQuery(['true', 'false'], async (ctx) => {
    const chatId = ctx.chat?.id
    const userId = ctx.from?.id
    if (!chatId || !userId || !games.has(chatId)) return

    const game = games.get(chatId)!

    // Don't let non-players answer
    if (!Array.from(game.players).some((p) => p.id === userId)) {
      await ctx.answerCallbackQuery({
        text: 'Ви не берете участь в грі!',
        show_alert: true,
      })
      return
    }

    // Don't let answer twice
    if (game.answers.has(userId)) {
      await ctx.answerCallbackQuery({
        text: 'Ви вже відповіли!',
        show_alert: true,
      })
      return
    }

    const answer = ctx.callbackQuery.data === 'true'
    game.answers.set(userId, answer)

    await ctx.answerCallbackQuery({
      text: 'Відповідь прийнято!',
    })

    await updateQuestionMessage(ctx)

    if (game.answers.size === game.players.size) {
      await finishRound(ctx)
    }
  })
}

async function startRound(ctx: Context) {
  const chatId = ctx.chat?.id
  if (!chatId || !games.has(chatId)) return

  const game = games.get(chatId)!

  // If we've done as many rounds as questions, game ends
  if (game.round >= game.settings.questionsCount) {
    await endGame(ctx, game)
    return
  }

  // Pick the next question from the pre-fetched array
  const question = game.questions[game.round]

  game.currentQuestion = question
  game.answers.clear()
  game.round++ // now we've consumed one question

  // Create answer buttons
  const keyboard = new InlineKeyboard().text('Правда ✅', 'true').text('Хиба ❌', 'false')

  const roundNumber = game.round
  const questionFormatted = `${question.translated_question}\n(${question.question})`

  const msg = await ctx.reply(`Питання #${roundNumber}:\n\n${questionFormatted}`, {
    reply_markup: keyboard,
  })

  game.questionMessage = msg.message_id
}

async function updateQuestionMessage(ctx: Context) {
  const chatId = ctx.chat?.id
  if (!chatId || !games.has(chatId)) return

  const game = games.get(chatId)!

  const answeredPlayersIds = Array.from(game.answers.keys())
  const answeredPlayers = answeredPlayersIds
    .map((id) => {
      const player = Array.from(game.players).find((p) => p.id === id)
      return player?.username ? `@${player.username}` : player?.name || 'Гравець'
    })
    .join(', ')

  const keyboard = new InlineKeyboard().text('Правда ✅', 'true').text('Хиба ❌', 'false')

  const roundNumber = game.round
  const questionFormatted = `${game.currentQuestion.translated_question}\n(${game.currentQuestion.question})`

  await ctx.api.editMessageText(
    chatId,
    game.questionMessage!,
    `❓ *Питання #${roundNumber}:*\n\n${questionFormatted}\n\n✍️ Відповіли: ${answeredPlayers}`,
    {
      reply_markup: keyboard,
      parse_mode: 'Markdown',
    },
  )
}

async function finishRound(ctx: Context) {
  const chatId = ctx.chat?.id
  if (!chatId || !games.has(chatId)) return

  const game = games.get(chatId)!
  const correctAnswer = game.currentQuestion.correct_answer.toLowerCase() === 'true'

  // Update scores for correct answers
  for (const [userId, answer] of game.answers) {
    if (answer === correctAnswer) {
      game.score.set(userId, (game.score.get(userId) || 0) + 1)
    }
  }

  // Format scores with player names
  const scores = Array.from(game.score.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([userId, score], index) => {
      const player = Array.from(game.players).find((p) => p.id === userId)
      const name = player?.username ? `@${player.username}` : player?.name || 'Гравець'
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : ''
      return `${medal} ${name}: ${score}`
    })
    .join('\n')

  // Get all winners (players with max score)
  const maxScore = Math.max(...Array.from(game.score.values()))
  const winners = Array.from(game.score.entries())
    .filter(([, score]) => score === maxScore)
    .map(([userId]) => userId)

  // Combine messages into one
  let message = `🎯 *Раунд завершено!*\n\n`
  message += `✅ Правильна відповідь: ${correctAnswer ? 'Правда' : 'Хиба'}\n\n`
  message += `📊 *Результати:*\n${scores}\n\n`

  if (game.round >= game.settings.questionsCount) {
    message += '🏆 *Гра завершена!*\n'
    // Add winners info
    for (const winnerId of winners) {
      const winner = Array.from(game.players).find((p) => p.id === winnerId)
      if (winner) {
        await increaseReputation(winner.id, chatId)
        message += `${winner.username ? `@${winner.username}` : winner.name} отримав +1 до репутації!\n`
      }
    }
    await ctx.reply(message, { parse_mode: 'Markdown' })
    games.delete(chatId)
  } else {
    await ctx.reply(message, { parse_mode: 'Markdown' })
    await startRound(ctx)
  }
}

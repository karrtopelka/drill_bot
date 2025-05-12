import nlp from 'compromise'
import { getSwearWords } from '../db'

const hasNegation = (doc: any) => doc.has('(не|не буду|не збираюсь)')

export const isShitMessage = (message: string) => {
  const doc = nlp(message.toLowerCase())
  const withI =
    doc.has('(я|сьогодні)') &&
    doc.has(
      '(посрав|покакав|срав|какав|гівно видавив|обісрався|покакал|наклав|насрав|обісрався|обісрав)',
    ) &&
    !hasNegation(doc)

  const current = doc.has('(серу|какаю|гівню)') && !hasNegation(doc)

  if (withI || current) {
    return true
  }
  return false
}

export const isFartMessage = (message: string) => {
  const doc = nlp(message.toLowerCase())

  const withI =
    doc.has('(я|сьогодні)') &&
    doc.has(
      '(пернув|пєрнув|перднув|пукнув|бзднув|впустив гази|випердів|пуканув|дав джазу|джазанув)',
    ) &&
    !hasNegation(doc)

  const current = doc.has('(пержу|пукаю|бзджу)') && !hasNegation(doc)

  if (withI || current) {
    return true
  }
  return false
}

export const isPissMessage = (message: string) => {
  const doc = nlp(message.toLowerCase())
  const withI =
    doc.has('(я|сьогодні)') &&
    doc.has('(попісяв|поссяв|помочився|відлив|обпісявся|пописав)') &&
    !hasNegation(doc)

  const current = doc.has('(пісяю|мочу)') && !hasNegation(doc)

  if (withI || current) {
    return true
  }
  return false
}

export const isSwearingMessage = async (message: string) => {
  const normalizedMessage = message.toLowerCase().normalize('NFC')

  const swearWordsDb = await getSwearWords()
  const swearWords = swearWordsDb.map((word) => word.word)

  // Split message into words and check each word exactly
  const words = normalizedMessage.split(/\s+/)
  const hasSwearWords = words.some((word) => swearWords.includes(word))

  return hasSwearWords
}

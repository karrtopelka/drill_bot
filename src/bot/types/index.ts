import { ConversationFlavor, Conversation } from '@grammyjs/conversations'
import { Context } from 'grammy'
import { FileFlavor } from '@grammyjs/files'

export type MyContext = FileFlavor<Context & ConversationFlavor>
export type MyConversation = Conversation<MyContext>

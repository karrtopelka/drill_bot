import { ConversationFlavor, Conversation } from '@grammyjs/conversations';
import { Context, SessionFlavor } from 'grammy';
import { FileFlavor } from '@grammyjs/files';

export type MyContext = FileFlavor<Context & ConversationFlavor<Context> & SessionFlavor<{}>>;
export type MyConversation = Conversation<MyContext>;

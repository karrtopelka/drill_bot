import axios from 'axios';
import { MyContext } from '../types';
import { Bot } from 'grammy';
import { getAlertStatus, upsertAlertStatus, getAllChatsWithMembers } from '../db.js';
export const LVIV_REGION = 'Львівська область';

export async function checkAirAlert(bot: Bot<MyContext>) {
  try {
    const response = await axios.get('https://ubilling.net.ua/aerialalerts/');
    const data = response.data;
    const lvivAlert = data.states[LVIV_REGION];

    const currentStatus = await getAlertStatus(LVIV_REGION);

    // If status changed or this is first check
    if (!currentStatus || currentStatus.status !== lvivAlert.alertnow) {
      // Update status in DB
      upsertAlertStatus(LVIV_REGION, lvivAlert.alertnow);

      const chats = await getAllChatsWithMembers();

      // Send message to all chats
      const message = lvivAlert.alertnow
        ? '🚨 *Повітряна тривога* 🚨'
        : '✅ *Відбій повітряної тривоги* ✅';

      for (const chat of chats) {
        try {
          await bot.api.sendMessage(chat.id, message);
          const taggedUsers = chat.members.map((user) => `@${user.username}`).join(' ');
          await bot.api.sendMessage(chat.id, taggedUsers);
        } catch (error) {
          console.error(`Failed to send alert to chat ${chat.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to check air alert status:', error);
  }
}

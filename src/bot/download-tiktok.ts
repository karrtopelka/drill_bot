/// <reference path="../types/ruhend-scraper.d.ts" />
import { ttdl } from 'ruhend-scraper';
import { MyContext } from './types';
import { Message } from 'grammy/types';

const isAudio = async (url: string) => {
  const response = await fetch(url);
  const contentType = response.headers.get('content-type');
  return contentType?.includes('audio');
};

export async function handleTikTokLink(ctx: MyContext) {
  let loadingMsg: Message.TextMessage | undefined;
  const text = ctx.message?.text;
  if (!text) return;

  // Check if message contains TikTok link
  if (!text.includes('vm.tiktok.com')) return;

  try {
    // Send loading message
    loadingMsg = await ctx.reply('⏳ Завантажую відео...');

    // if message contains more than link, like other text, we have to extract
    // the link
    const link = text.match(/https?:\/\/vm\.tiktok\.com\/\w+/)?.[0];

    if (!link) {
      if (loadingMsg) {
        await ctx.api.deleteMessage(ctx.chat?.id!, loadingMsg.message_id);
      }
      return;
    }

    // Get video info and download URL
    const videoInfo = await ttdl(link);

    if (!videoInfo || !videoInfo.video) {
      throw new Error('Could not get download URL');
    }

    const isAudioFile = await isAudio(videoInfo.video);

    if (isAudioFile) {
      await ctx.replyWithAudio(videoInfo.video, {
        title: videoInfo.title,
        performer: videoInfo.author,
      });
    } else {
      await ctx.replyWithVideo(videoInfo.video, {
        caption: `🎥 ${videoInfo.title} | ${videoInfo.author}`,
      });
    }

    // Cleanup
    if (loadingMsg) {
      await ctx.api.deleteMessage(ctx.chat?.id!, loadingMsg.message_id);
    }
  } catch (error) {
    console.error('Error downloading TikTok video:', error);
    if (loadingMsg) {
      await ctx.api.deleteMessage(ctx.chat?.id!, loadingMsg.message_id);
    }
    const errorMsg = await ctx.reply('❌ Помилка при завантаженні відео');
    await new Promise((resolve) => setTimeout(resolve, 10000));
    await ctx.api.deleteMessage(ctx.chat?.id!, errorMsg.message_id);
  }
}

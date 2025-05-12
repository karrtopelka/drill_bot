import app from './app';
import { bot } from './bot';

const port = process.env.PORT || 5000;

// Start Express server
app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Server listening: http://localhost:${port}`);
  /* eslint-enable no-console */
});

// Start Telegram bot
bot.start({
  onStart: (botInfo) => {
    console.log(`Bot started as @${botInfo.username}`);
  },
});

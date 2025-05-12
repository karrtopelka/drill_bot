import app from './app';
import { bot } from './bot';
const port = process.env.PORT || 5000;
app.listen(port, () => {
  /* eslint-disable no-console */
  console.log(`Listening: http://localhost:${port}`);
  console.log('Starting bot...');
  /* eslint-enable no-console */
  bot.start();
});

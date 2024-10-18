// /src/cron/reminders.js
const cron = require('node-cron');
const { getC4DRecords, updateReminder } = require('../db/postgres');
const bot = require('../api/telegram');

cron.schedule('*/15 * * * *', async () => {
  const c4dRecords = await getC4DRecords();

  for (const c4d of c4dRecords) {
    const timeSinceLastReminder = Date.now() - new Date(c4d.telegram_last_remider).getTime();

    if (timeSinceLastReminder > process.env.REM_DELAY * 1000) {
      bot.sendMessage(c4d.telegram_topic, "Ricordati di caricare i tuoi dati per guadagnare DEDO Token!");
      await updateReminder(c4d.id);
    }
  }
});

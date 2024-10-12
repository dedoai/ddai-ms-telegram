// /src/cron/reminders.js
const cron = require('node-cron');
const { getC4DRecords, updateReminder } = require('../db/postgres');

function reminders(bot, secrets) {
    // Routine che si ripete ogni 15 minuti
    cron.schedule('*/15 * * * *', async () => {
        try {
            const c4dRecords = await getC4DRecords();

            for (const c4d of c4dRecords) {
                const timeSinceLastReminder = Date.now() - new Date(c4d.telegram_last_remider).getTime();

                if (timeSinceLastReminder > secrets.REM_DELAY * 1000) {
                    // Invia il messaggio di sollecito
                    bot.sendMessage(c4d.telegram_topic, "Ricordati di caricare i tuoi dati per guadagnare DEDO Token!");

                    // Aggiorna il record con il nuovo promemoria
                    await updateReminder(c4d.id);
                }
            }
        } catch (error) {
            console.error('Errore durante l\'esecuzione del cron job:', error);
        }
    });
}

module.exports = reminders;

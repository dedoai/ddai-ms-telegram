// /src/app.js
const env = process.env.ENV || 'dev';
const { getSecret } = require('./config/index');
const TelegramBot = require('node-telegram-bot-api');
const reminders = require('./cron/reminders');

(async () => {
    try {
        // Carica le configurazioni da AWS Secrets Manager
        const secrets = await getSecret('dev/telegram');

        // Configura il bot Telegram con il token
        const bot = new TelegramBot(secrets.TELEGRAM_KEY, { polling: true });

        // Setup del bot con listener per i messaggi
        bot.on('message', async (msg) => {
            const chatId = msg.chat.id;

            // Logica per la gestione dei messaggi o immagini caricate
            if (msg.photo) {
                // Qui puoi richiamare la logica per il caricamento dell'immagine
                bot.sendMessage(chatId, 'Hai caricato un\'immagine. Verifica in corso...');
            } else {
                bot.sendMessage(chatId, 'Benvenuto! Per favore, carica un\'immagine per partecipare.');
            }
        });

        console.log('DEDOBot avviato con successo!');

        // Avvia anche le routine cicliche per le notifiche
        reminders(bot, secrets);

    } catch (error) {
        console.error('Errore durante il caricamento delle configurazioni o l\'avvio del bot:', error);
    }
})();

// /src/app.js
const env = process.env.ENV || 'dev';
//const { getSecret } = require('./config/index');
const TelegramBot = require('node-telegram-bot-api');
const reminders = require('./cron/reminders');

(async () => {
    try {

	const bot = require('./api/telegram');

    } catch (error) {
        console.error('Errore durante il caricamento delle configurazioni o l\'avvio del bot:', error);
    }
})();

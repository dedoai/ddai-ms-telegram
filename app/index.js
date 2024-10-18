// /src/app.js
const env = process.env.ENV || 'dev';
const { getSecret } = require('./config/index');
const TelegramBot = require('node-telegram-bot-api');
const reminders = require('./cron/reminders');
const { SharedIniFileCredentials } = require('aws-sdk');
const WEB_HOOK = process.env.WEB_HOOK;

var parsedSecrets;

(async () => {
  try {
    try {
      // Chiama `getSecret` in modo asincrono per ottenere il segreto
      const secrets = await getSecret(env + '/telegram');
      parsedSecrets = JSON.parse(secrets); // Assumi che il segreto sia in formato JSON
      console.log(parsedSecrets); // Stampa i segreti (Telegram e OpenAI)
      // Ora puoi usare i segreti per inizializzare il bot
    } catch (error) {
      console.error("Errore durante il caricamento dei segreti:", error);
    }

    const gpt = require('./utils/openai');
    gpt.setup(parsedSecrets.OPENAI_APIKEY);

    const telegramBot = require('./api/telegram');
    if (WEB_HOOK) {
      console.log("Bot in avvio in modalità Listening webhook su " + WEB_HOOK)
      telegramBot.listen(parsedSecrets.TELEGRAM_KEY, WEB_HOOK)
    } else {
      console.log("Bot in avvio in modalità polling singleton")
      telegramBot.start(parsedSecrets.TELEGRAM_KEY);
    }

  } catch (error) {
    console.error('Errore durante il caricamento delle configurazioni o l\'avvio del bot:', error);
  }
})();

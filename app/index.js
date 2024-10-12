// /src/app.js
const env = process.env.ENV || 'dev';
const { getSecret } = require('./config/index');
const TelegramBot = require('node-telegram-bot-api');
const reminders = require('./cron/reminders');
var parsedSecrets;

(async () => {
    try {


	  try {
	    // Chiama `getSecret` in modo asincrono per ottenere il segreto
	    const secrets = await getSecret('dev/telegram');
	    parsedSecrets = JSON.parse(secrets); // Assumi che il segreto sia in formato JSON
	    console.log(parsedSecrets); // Stampa i segreti (Telegram e OpenAI)
	    // Ora puoi usare i segreti per inizializzare il bot
	  } catch (error) {
	    console.error("Errore durante il caricamento dei segreti:", error);
	  }

	  const gpt = require('./utils/openai');
	  gpt.setup( parsedSecrets.OPENAI_APIKEY );

  	  const bot = require('./api/telegram');
	  bot.start( parsedSecrets.TELEGRAM_KEY );

    } catch (error) {
        console.error('Errore durante il caricamento delle configurazioni o l\'avvio del bot:', error);
    }
})();

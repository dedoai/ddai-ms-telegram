// /src/app.js
const env = process.env.ENV || 'dev';
const { getSecret } = require('./config/index');
const TelegramBot = require('node-telegram-bot-api');
const reminders = require('./cron/reminders');
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

console.log("Environment vars: ", process.env);

(async () => {
    try {
	// Crea un nuovo client SecretsManager
	const client = new SecretsManagerClient(
		{
			region: "us-east-1",
	 		credentials: {
    				accessKeyId: process.env.AWS_KEY.trim(),       // Prendi la chiave AWS dall'ambiente
    				secretAccessKey: process.env.AWS_SECRET.trim() // Prendi il secret dall'ambiente
  			}
		}
	); 
	// Funzione per recuperare il segreto
	async function getSecret(secretName) {
	  const command = new GetSecretValueCommand({ SecretId: secretName });
	  try {
	    const data = await client.send(command);
	    if ("SecretString" in data) {
	      return data.SecretString;
	    } else {
	      const buff = Buffer.from(data.SecretBinary, "base64");
	      return buff.toString("ascii");
	    }
	  } catch (err) {
	    console.error(err);
	    throw err;
	  }
	}
        // Carica le configurazioni da AWS Secrets Manager
        const secrets = await getSecret('dev/telegram');
	console.log("Il segreto è: ", secrets);
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
	process.exit(1);
    }
})();

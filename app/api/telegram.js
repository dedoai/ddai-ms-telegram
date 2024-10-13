// /src/api/telegram.js
const TelegramBot = require('node-telegram-bot-api');
const { getUser, createUser } = require('../db/postgres');
const { processImage } = require('../utils/imageProcessing');
const { uploadToS3 } = require('../utils/aws');
const secrets  = require('../config/index');
const openai = require('../utils/openai.js');

// Abilita manualmente la cancellazione delle promesse
TelegramBot.Promise = Promise;

// Inizializza il bot correttamente
var bot;
var TOKEN;

async function callback (msg) {
    console.log( msg );
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
        let user = await getUser(telegramId);
        if (!user) {
            user = await createUser(telegramId, msg.from.username);
        }

        if (msg.photo) {
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            const file = await bot.getFile(fileId);
            const filePath = await bot.downloadFile(fileId, './temp');

            // Process and validate image with OpenAI/ChatGPT
            const processedImage = await processImage(filePath);
            const validation = await openai.validateImage( processedImage, msg.chat.topic );
		// validateWithChatGPT(processedImage, msg.chat.topic);
	    console.log("Validation dump ", validation );
            if (validation.valid) {
                const s3Path = `cd4id-${msg.chat.topic}/dataset-${user.id}/shasum.ext`;
                await uploadToS3(s3Path, processedImage);

                // Notifica di successo
                bot.sendMessage(chatId, "Complimenti! La tua immagine è stata accettata e il tuo credito in DEDO Token è stato aggiornato.",{
                    message_thread_id: msg.message_thread_id
                });
            } else {
                bot.sendMessage(chatId, "L'immagine non è conforme. Riprovaci con una nuova immagine.",{
                    message_thread_id: msg.message_thread_id
                });
            }
        } else {
//            bot.sendMessage(chatId, "Per favore, carica un'immagine per la call for data.", msg.message_thread_id);
		// Verifica se esiste il message_thread_id per i forum
            if (msg.message_thread_id) {
                await bot.sendMessage(chatId, "Per favore, carica un'immagine per la call for data.", {
                    message_thread_id: msg.message_thread_id
                });
            } else {
                await bot.sendMessage(chatId, "Per favore, carica un'immagine per la call for data.");
            }
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "Si è verificato un errore. Riprova più tardi.");
    }
}

async function start( TOKENAPI ){
	TOKEN=TOKENAPI;
	console.log("TELEGRAM API ", TOKEN);
	bot = new TelegramBot(TOKEN, { polling: true });
	bot.on('message', callback );
}

module.exports = { start };

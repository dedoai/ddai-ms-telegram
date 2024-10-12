// /src/api/telegram.js
const { Bot, InputFile } = require('node-telegram-bot-api');
const { getUser, createUser } = require('../db/postgres');
const { processImage } = require('../utils/imageProcessing');
const { uploadToS3 } = require('../utils/aws');

const bot = new Bot(process.env.TELEGRAM_KEY, { polling: true });

bot.on('message', async (msg) => {
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
            const validation = await validateWithChatGPT(processedImage, msg.chat.topic);

            if (validation.valid) {
                const s3Path = `cd4id-${msg.chat.topic}/dataset-${user.id}/shasum.ext`;
                await uploadToS3(s3Path, processedImage);

                // Notifica di successo
                bot.sendMessage(chatId, "Complimenti! La tua immagine è stata accettata e il tuo credito in DEDO Token è stato aggiornato.");
            } else {
                bot.sendMessage(chatId, "L'immagine non è conforme. Riprovaci con una nuova immagine.");
            }
        } else {
            bot.sendMessage(chatId, "Per favore, carica un'immagine per la call for data.");
        }
    } catch (error) {
        console.error(error);
        bot.sendMessage(chatId, "Si è verificato un errore. Riprova più tardi.");
    }
});

module.exports = bot;

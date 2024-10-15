// /src/api/telegram.js
const TelegramBot = require('node-telegram-bot-api');
const { getUser, createUser, manageDataset, getC4DByTopic, getUserActivityInC4D } = require('../db/postgres');
const { processImage } = require('../utils/imageProcessing');
const { uploadToS3 } = require('../utils/aws');
const secrets  = require('../config/index');
const openai = require('../utils/openai.js');
const Uploader = require('../utils/uploader.js');
const express = require('express');
const bodyParser = require('body-parser');


// Abilita manualmente la cancellazione delle promesse
TelegramBot.Promise = Promise;

// Inizializza il bot correttamente
var bot;
var TOKEN;

async function callback (msg) {
//    console.log( msg );
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
        if( msg.chat && !msg.reply_to_message ){
            // utente non intenzionato a partecipare rispondiamo in linea
            let answer = await openai.answerFromGeneralMessage(msg.chat.from, msg.text);
            return await bot.sendMessage(chatId, answer);
        }
        let topic = msg.reply_to_message.forum_topic_created.name;
        let username = msg.from.username;
        console.log("Utente ", username, " scrive sotto il TOPIC ", topic)
        var c4d = await getC4DByTopic( msg.reply_to_message.forum_topic_created.name );
        console.log("C4D trovata ", c4d.id )
        
        let user = await getUser(telegramId);
        if (!user) {
            user = await createUser(telegramId, username);
        }

        // manageDataset ottengo il dataset per l'utente
        let dataset = await manageDataset(topic, user.id, c4d);
        console.log("Dataset selection result " + dataset.message);

        if (msg.photo) {
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            const file = await bot.getFile(fileId);
            const filePath = await bot.downloadFile(fileId, './temp');

            // Process and validate image with OpenAI/ChatGPT
//            const processedImage = await processImage(filePath);
//            const validation = await openai.validateImage( processedImage, topic );

            // validateWithChatGPT(processedImage, topic);
//	        console.log("Validation dump ", validation );
            if (true || validation.valid) {
//                const s3Path = `cd4id-${topic}/dataset-${user.id}/shasum.ext`;
//                await dedo.handleDatasetUpload(user.id, c4d,filePath )

                // TODO ADD DB:
                let uploader = new Uploader(filePath,  user.id, c4d.data_type, {}, dataset.id, "dataset");
                uploader.upload().then(success => {
                    if (success) {
                        console.log('Upload completed successfully');
                                        // Notifica di successo
                        bot.sendMessage(chatId, "Complimenti! La tua immagine è stata accettata e il tuo credito in DEDO Token è stato aggiornato. " ,{
                             message_thread_id: msg.message_thread_id
                        });
                    } else {
                        console.log('Upload failed');
                        // Notifica di successo
                        bot.sendMessage(chatId, "Al momento il servizio di Upload non è disponibile. " ,{
                            message_thread_id: msg.message_thread_id
                        });
                    }
                });


            } else {
                bot.sendMessage(chatId, "L'immagine non è conforme. Riprovaci con una nuova immagine.",{
                    message_thread_id: msg.message_thread_id
                });
            }
        } else {
            console.log("Sezione risposte senza photo");
//            bot.sendMessage(chatId, "Per favore, carica un'immagine per la call for data.", msg.message_thread_id);
		// Verifica se esiste il message_thread_id per i forum
            let activity = await getUserActivityInC4D(user.id, c4d.id);
            let answer = await openai.answerFromC4DTopicMessage(user, msg.text, c4d, activity);
            if (msg.message_thread_id) {
                await bot.sendMessage(chatId, answer, {
                    message_thread_id: msg.message_thread_id
                });
            } else {
                await bot.sendMessage(chatId, answer);
            }
        }
    } catch (error) {
        console.error(error);
//        bot.sendMessage(chatId, "Si è verificato un errore. Riprova più tardi."); // TODO: capire
    }
}

async function listen( TOKENAPI, WEBHOOK ){
	TOKEN=TOKENAPI;
	console.log("TELEGRAM API ", TOKEN);
	bot = new TelegramBot(TOKEN);
	bot.on('message', callback );

    const app = express();
    app.use(bodyParser.json()); // Assicura che il body delle richieste sia letto come JSON

    // Endpoint che Telegram chiamerà per il Webhook
    app.post('/bot', (req, res) => {
        bot.processUpdate(req.body); // Invia l'aggiornamento a TelegramBot per la gestione
        res.sendStatus(200); // Invia una risposta HTTP 200 a Telegram
    });

    // Avvia il server Express
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
        console.log(`Express server is listening on ${port}`);
    });

    // Imposta il Webhook su Telegram con l'URL pubblico del tuo API Gateway
    bot.setWebHook(WEBHOOK);
}


async function start( TOKENAPI ){
	TOKEN=TOKENAPI;
	console.log("TELEGRAM API ", TOKEN);
	bot = new TelegramBot(TOKEN, { polling: true });
    bot.deleteWebHook(); // Cancella qualsiasi webhook esistente
	bot.on('message', callback );
}

module.exports = { start };

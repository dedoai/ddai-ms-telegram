// /src/api/telegram.js
const TelegramBot = require('node-telegram-bot-api');
const { getUser, createUser, manageDataset, getC4DByTopic, getUserActivityInC4D } = require('../db/postgres');
const { processImage } = require('../utils/imageProcessing');
const { uploadToS3 } = require('../utils/aws');
const secrets = require('../config/index');
const openai = require('../utils/openai.js');
const validator = require('../utils/validator.js');
const Uploader = require('../utils/uploader.js');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs').promises;





//TODO:
// - consenso come messaggio di benvenuto
// - pubblicazione delle C4D disponibili
// - Reporto dei file da fixare
// - validatore da mergiare


//( async()=>{
//    var AGRIFOOD="images that contrasts ripe and unripe fruits and vegetables in an agrifood context. On one side of the image, show ripe, vibrant fruits and vegetables like tomatoes, peppers, apples, and oranges being harvested by farmers, with bright colors indicating full ripeness. The fruits should look plump and ready for consumption, while the farmers are using baskets or crates to collect them in a well-maintained field under clear skies. On the other side, depict unripe produce, still on the plants or trees, with duller or greener shades indicating they arent ready for harvest yet. Include workers inspecting but leaving these unharvested. The field should have a more subdued feel on this side, showing the natural progression of growth and the importance of picking at the right time."
//    let validation = await validator.validate('temp/file_10.jpg', "tomatos", AGRIFOOD );
//    console.log("Validation result", validation);
//    process.exit();
//})()

// Abilita manualmente la cancellazione delle promesse
TelegramBot.Promise = Promise;

// Inizializza il bot correttamente
var bot;
var TOKEN;

async function callback(msg) {
    //    console.log( msg );
    const chatId = msg.chat.id;
    const telegramId = msg.from.id;

    try {
        if (msg.chat && !msg.reply_to_message) {
            // utente non intenzionato a partecipare rispondiamo in linea
            let answer = await openai.answerFromGeneralMessage(msg.chat.from, msg.text);
            return await bot.sendMessage(chatId, answer);
        }
        let topic = msg.reply_to_message.forum_topic_created.name;
        let username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;
        console.log("Utente ", username, " scrive sotto il TOPIC ", topic)
        var c4d = await getC4DByTopic(msg.reply_to_message.forum_topic_created.name);
        console.log("C4D trovata ", c4d.id)

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
            let validation = await validator.validate(filePath, msg.chat, c4d.description );
            console.log("Validation ", validation );
            if ( validation.status != "ERROR" ) {
                //                const s3Path = `cd4id-${topic}/dataset-${user.id}/shasum.ext`;
                //                await dedo.handleDatasetUpload(user.id, c4d,filePath )
                // TODO ADD DB:
                // 
                new Uploader(filePath, user.id, c4d.data_type, {description: msg.text, score: validation.score }, dataset.dataset.id, "datasets")
                    .upload()
                    .then( async (success) => {
                        if (success) {
                            console.log('Upload completed successfully');
                            let activity = await getUserActivityInC4D(user.id, c4d.id);
                            console.log("getUserActivityInC4D ", activity, user.id, c4d.id);
                            let text = "Congratulations! Your image has been accepted, and your DEDO Token credit has been updated. | Fai vedere le activity in modo testuale/eleco e non JSON"
                            let answer = await openai.answerFromC4DTopicMessage(username, text, c4d, activity);
                            bot.sendMessage(chatId, answer, {
                                message_thread_id: msg.message_thread_id
                            });
                            // Notifica di successo
                        } else {
                            console.log('Upload failed');
                            // Notifica di successo
                            bot.sendMessage(chatId, username+" We apologize, but the upload service is currently unavailable. Please try again later. ", {
                                message_thread_id: msg.message_thread_id
                            });                
                        }
                        if( filePath )
                            fs.unlink( filePath );
                    });

            } else {
                bot.sendMessage(chatId, username + " " + validation.description, {
                    message_thread_id: msg.message_thread_id
                });
                if( filePath )
                    fs.unlink( filePath );    
            }
        } else {
            console.log("Sezione risposte senza photo");
            //            bot.sendMessage(chatId, "Per favore, carica un'immagine per la call for data.", msg.message_thread_id);
            // Verifica se esiste il message_thread_id per i forum
            let activity = await getUserActivityInC4D(user.id, c4d.id);
            console.log("getUserActivityInC4D ", activity, user.id, c4d.id);
            let answer = await openai.answerFromC4DTopicMessage(user, msg.text, c4d, activity);
            if ( msg.message_thread_id ) {
                await bot.sendMessage(chatId, answer, {
                    message_thread_id: msg.message_thread_id
                });
            } else {
                await bot.sendMessage(chatId, answer);
            }
        }

    } catch (error) {
        console.error(error.stack);
        //        bot.sendMessage(chatId, "Si è verificato un errore. Riprova più tardi."); // TODO: capire
    }
}

async function listen(TOKENAPI, WEBHOOK) {
    TOKEN = TOKENAPI;
    console.log("TELEGRAM API ", TOKEN);
    bot = new TelegramBot(TOKEN);
    bot.on('message', callback);

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


async function start(TOKENAPI) {
    TOKEN = TOKENAPI;
    console.log("TELEGRAM API ", TOKEN);
    bot = new TelegramBot(TOKEN, { polling: true });
    bot.deleteWebHook(); // Cancella qualsiasi webhook esistente
    bot.on('message', callback);
}

module.exports = { start };

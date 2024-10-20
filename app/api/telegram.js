// /src/api/telegram.js
const TelegramBot = require('node-telegram-bot-api');
const { getUser, createUser, manageDataset, getC4DByTopic, getUserActivityInC4D, updateWalletAddressByTelegramId, countDatasetsInC4d, checkFilePathExists, insertDatasetFile } = require('../db/postgres');
const { processImage } = require('../utils/imageProcessing');
const { uploadToS3 } = require('../utils/aws');
const secrets = require('../config/index');
const openai = require('../utils/openai.js');
const validator = require('../utils/validator.js');
const Uploader = require('../utils/uploader.js');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
var shasum = crypto.createHash('sha1');
const fs = require('fs').promises;

// Funzione asincrona per calcolare l'hash SHA1 di un file
async function calculateFileSha1Async(filePath) {
  try {
      const fileBuffer = await fs.readFile(filePath); // Legge il file in buffer
      const hash = crypto.createHash('sha1').update(fileBuffer).digest('hex'); // Calcola l'hash
      console.log("calculateFileSha1Async", hash);
      return hash;
  } catch (err) {
      console.error('Errore durante il calcolo dell\'hash SHA1:', err);
      throw err;
  }
}

// Abilita manualmente la cancellazione delle promesse
TelegramBot.Promise = Promise;

// Inizializza il bot correttamente
var bot;
var TOKEN;

function extractTRC20Address(message = '') {
  // Regular expression per trovare l'indirizzo TRC20
  const trc20Regex = /T[1-9A-HJ-NP-Za-km-z]{33}/gm;
  // Cerca l'indirizzo TRC20 nella stringa
  const match = message.match(trc20Regex);
  // Se esiste un indirizzo, lo restituisce, altrimenti null
  if (match) {
    console.log('Indirizzo USDT TRC20 trovato:', match[0]);
    return match[0]; // Restituisce il primo match trovato
  } else {
    console.log('Nessun indirizzo USDT TRC20 trovato nel messaggio.');
    return null; // Nessun indirizzo trovato
  }
}

function getChatGPTMsg( username, msg ){
  return "Formulate a response for " + username + ". Regarding the message: " + msg + " | at the end sign the message as dedoAI Team";
}

async function callback(msg) {
  console.log( msg );
  const chatId = msg.chat.id;
  const telegramId = msg.from.id;
  let username = msg.from.username ? `@${msg.from.username}` : msg.from.first_name;

  try {
    if (msg.chat && !msg.reply_to_message) {  // FUORI DAL TOPIC
      // utente non intenzionato a partecipare rispondiamo in linea
      let containsTRC20Address = extractTRC20Address(msg.text);
      let answer = '';

      if (!!containsTRC20Address) {
        await updateWalletAddressByTelegramId(telegramId, containsTRC20Address);
        answer = await openai.answerFromGeneralMessage(username, getChatGPTMsg( username, "Thank you for sharing your USDT TRC20 address. Your address has been successfully registered."));
      } else answer = await openai.answerFromGeneralMessage(username, msg.text);

      return await bot.sendMessage(chatId, answer, {
        message_thread_id: msg.message_thread_id
      });
    }

    let topic = msg.reply_to_message.forum_topic_created.name;
    
    console.log("Utente ", username, " scrive sotto il TOPIC ", topic);
    var c4d = await getC4DByTopic(msg.reply_to_message.forum_topic_created.name);
    console.log("C4D trovata ", c4d.id)

    let user = await getUser(telegramId);
    if (!user) {
      user = await createUser(telegramId, username);
    }

    // manageDataset ottengo il dataset per l'utente
    let dataset = await manageDataset(topic, user.id, c4d);

    if (dataset?.limitReached) {
      let answerLR = await openai.answerFromGeneralMessage(msg.chat.from, getChatGPTMsg( username, dataset.message) );
      return await bot.sendMessage(chatId, answerLR, {
        message_thread_id: msg.message_thread_id
      });
    }

    console.log("Dataset selection result " + dataset.message);

    if (msg.photo) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      const file = await bot.getFile(fileId);
      const filePath = await bot.downloadFile(fileId, './temp');

      // Esempio di utilizzo
      let checksum = await calculateFileSha1Async(filePath);
      let isDuplicated = await checkFilePathExists(checksum);
      if( isDuplicated ){
        let answerLR = await openai.answerFromGeneralMessage(username, getChatGPTMsg( username, "The uploaded photo is a duplicate within our collection, please provide another image.") );
        return await bot.sendMessage(chatId, answerLR, {
                  message_thread_id: msg.message_thread_id
               });
      }

      // Process and validate image with OpenAI/ChatGPT
      //            const processedImage = await processImage(filePath);
      //            const validation = await openai.validateImage( processedImage, topic );

      // validateWithChatGPT(processedImage, topic);
      //	        console.log("Validation dump ", validation );
      let validation = await validator.validate(filePath, msg.chat, c4d.description);
      console.log("Validation ", validation);
      if (validation.status !== "ERROR") {
        //                const s3Path = `cd4id-${topic}/dataset-${user.id}/shasum.ext`;
        // await dedo.handleDatasetUpload(user.id, c4d , filePath)
        new Uploader(filePath, user.id, c4d.data_type, { description: msg.text, score: validation.score }, dataset.dataset.id, "datasets", c4d.id)
          .upload()
          .then(async (success) => {
            if (success) {

              insertDatasetFile(dataset.dataset.id, filePath, checksum )

              console.log('Upload completed successfully');
              let activity = await getUserActivityInC4D(user.id, c4d.id);
              console.log("getUserActivityInC4D ", activity, user.id, c4d.id);
              let text = "Congratulations! Your image has been accepted, and your USDT TRC20 credit has been updated. Please provide a wallet | Fai vedere le activity in modo testuale/eleco e non JSON"
              let answer = await openai.answerFromC4DTopicMessage(username, text, c4d, activity);
              bot.sendMessage(
                chatId,
                answer,
                {
                  message_thread_id: msg.message_thread_id
                });
              // Notifica di successo
            } else {
              console.log('Upload failed');
              // Notifica di successo
              let answerLR = await openai.answerFromGeneralMessage(username, getChatGPTMsg( username, " We apologize, but the upload service is currently unavailable. Please try again later. ") );
              bot.sendMessage(chatId, answerLR, {
                message_thread_id: msg.message_thread_id
              });
            }
            if (filePath)
              fs.unlink(filePath);
          });

      } else {
        let answerLR = await openai.answerFromGeneralMessage(username, getChatGPTMsg( username, validation.description) );
        bot.sendMessage(
          chatId,
          answerLR, {
            message_thread_id: msg.message_thread_id
          } 
        );
        if (filePath)
          fs.unlink(filePath);
      }
    } else {
      console.log("Sezione risposte senza photo");
      //            bot.sendMessage(chatId, "Per favore, carica un'immagine per la call for data.", msg.message_thread_id);
      // Verifica se esiste il message_thread_id per i forum
      let activity = await getUserActivityInC4D(user.id, c4d.id);
      console.log("getUserActivityInC4D ", activity, user.id, c4d.id);
      let answer = await openai.answerFromC4DTopicMessage(username, msg.text, c4d, activity);
      if (msg.message_thread_id) {
        await bot.sendMessage(
          chatId,
          answer,
          {
            message_thread_id: msg.message_thread_id
          });
      } else {
        await bot.sendMessage(chatId, `${username}\n${answer}`);
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
  await bot.setWebHook(WEBHOOK);
  console.log("Webhook impostato");
}

async function start(TOKENAPI) {
  TOKEN = TOKENAPI;
  console.log("TELEGRAM API ", TOKEN);
  bot = new TelegramBot(TOKEN, { polling: true });
  bot.deleteWebHook(); // Cancella qualsiasi webhook esistente
  bot.on('message', callback);
}

module.exports = { start, listen };

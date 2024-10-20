// /src/utils/openai.js
const secrets = require('../config/index');
const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios'); // Potresti aver bisogno di axios per chiamate API esterne
const { getAllTopicsAndDescriptions } = require('../db/postgres.js');
const { getGeneralContext } = require('./context.js');

let openai;
var TOKEN;

// Carica le configurazioni da AWS Secrets Manager
async function setup(OPENAI_APIKEY) {
  try {
    TOKEN = OPENAI_APIKEY;
    // Usa await correttamente in una funzione asincrona
    console.log("OPENAPII KEY: ", OPENAI_APIKEY);
    const configuration = new Configuration({
      apiKey: OPENAI_APIKEY,  // Recupera la chiave OpenAI da AWS
    });
    openai = new OpenAIApi(configuration);
  } catch (error) {
    console.error('Errore durante il caricamento delle configurazioni OpenAI:', error);
  }
}

async function validateImage(filePath, description) {
  if (!openai) {
    throw new Error('OpenAI non è configurato correttamente');
  }

  try {
    // Verifica che il file esista e leggi il file come buffer
    const absolutePath = path.resolve(filePath);
    const imageBuffer = await fs.readFile(absolutePath);
    // Simuliamo l'invio dell'immagine all'API (se OpenAI supportasse le immagini direttamente)
    // In questo caso fittizio, non inviamo direttamente il buffer ma proseguiamo con una simulazione del processo
    const response = await openai.createChatCompletion({
      model: "gpt-4o",
      messages: [
        { role: "system", content: AGRIFOOD },
        { role: "user", content: "Here is the image to evaluate. Reply with only YES, NO, or MAYBE." }
        // Potresti integrare una modalità per inviare effettivamente l'immagine tramite un'API separata o esterna
      ],
      files: [{ buffer: imageBuffer, filename: path.basename(filePath), filetype: 'image/png' }]
    });
    const validationResult = response.data.choices[0].message.content;
    return { valid: validationResult.includes('SI'), score: validationResult };
  } catch (error) {
    console.error("Errore con l'API di OpenAI:", error);
    return { valid: false, score: null };
  }
}

var c4dInfo;
var contextGeneral = '';
async function hydrate() {
  c4dInfo = await getAllTopicsAndDescriptions();
  contextGeneral = getGeneralContext(c4dInfo);
}

async function answerFromGeneralMessage(user, question) {
  if (!openai) {
    throw new Error('OpenAI non è configurato correttamente');
  }
  if (!contextGeneral) {
    await hydrate();
  }

  try {
    console.log("answerFromGeneralMessage", question);
    let content;
    if (question) {
      content = "Anwer the Producer " + user + " that wrote us: " + question;
    } else {
      content = "Say hello and welcome the new customer"
    }
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: contextGeneral },
        { role: "user", content: content },
      ],
    });

    const result = response.data.choices[0].message.content;
    console.log("answerFromGeneralMessage result ", result);
    return result;
  } catch (error) {
    console.error("Errore con l'API di OpenAI:", error);
    return { valid: false, score: null };
  }
}

var AGRIFOOD = "images that contrasts ripe and unripe fruits and vegetables in an agrifood context. On one side of the image, show ripe, vibrant fruits and vegetables like tomatoes, peppers, apples, and oranges being harvested by farmers, with bright colors indicating full ripeness. The fruits should look plump and ready for consumption, while the farmers are using baskets or crates to collect them in a well-maintained field under clear skies. On the other side, depict unripe produce, still on the plants or trees, with duller or greener shades indicating they aren't ready for harvest yet. Include workers inspecting but leaving these unharvested. The field should have a more subdued feel on this side, showing the natural progression of growth and the importance of picking at the right time."


async function answerFromC4DTopicMessage(user, question, c4d, activity) {
  if (!openai) {
    throw new Error('OpenAI non è configurato correttamente');
  }

  try {
    let contextTopic = c4d.description;
    console.log("CONTEXT: ", contextTopic);
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        { role: "system", content: contextTopic },
        { role: "user", content: "Create a response for the user " + user + " who is asking me this: " + question + ". Consider their role as an Image Producer related to the Call for Data: (" + contextTopic + ") of DedoAI. The activity they have already done is represented by the following JSON " + JSON.stringify(activity) + ". You can use this information to provide them with a report." }
      ],
    });

    const result = response.data.choices[0].message.content;
    console.log("answerFromC4DTopicMessage result ", result);
    return result;
  } catch (error) {
    console.error("Errore con l'API di OpenAI:", error);
    return { valid: false, score: null };
  }
}



module.exports = { validateImage, setup, answerFromGeneralMessage, answerFromC4DTopicMessage };

// /src/utils/openai.js
const secrets = require('../config/index');
const { Configuration, OpenAIApi } = require("openai");
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios'); // Potresti aver bisogno di axios per chiamate API esterne
const { getAllTopicsAndDescriptions } = require('../db/postgres.js');

let openai;
var TOKEN;

// Carica le configurazioni da AWS Secrets Manager
async function setup(OPENAI_APIKEY) {
    try {
        TOKEN=OPENAI_APIKEY;
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
                { role: "user", content: "Ecco l'immagine da valutare. Rispondimi sono SI, NO oppure FORSE" },
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


async function validateImageFromBuffer(imageBuffer, description) {
    if (!openai) {
        throw new Error('OpenAI non è configurato correttamente');
    }

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                { role: "system", content: `Sei un esperto di analisi immagini per dataset. Valuta se l'immagine corrisponde alla descrizione: ${description}` },
                { role: "user", content: "Ecco l'immagine da valutare." },
            ],
        });

        const validationResult = response.data.choices[0].message.content;
        return { valid: validationResult.includes('conforme'), score: validationResult };
    } catch (error) {
        console.error("Errore con l'API di OpenAI:", error);
        return { valid: false, score: null };
    }
}

var c4dInfo;
var contextGeneral;
async function hydrate(){
    c4dInfo = await getAllTopicsAndDescriptions();
    contextGeneral = "Benvenuto nella piattaforma ufficiale di caricamento dati per le Call for Data (C4D) di DedoAI. "
    +"Qui potrai partecipare a diverse iniziative di raccolta dati e guadagnare DEDO Token in cambio dei tuoi contributi. "
    +"Ogni Call for Data rappresenta una richiesta specifica da parte di consumatori di dati, che necessitano di dataset per migliorare "
    +"l'addestramento dei loro sistemi di intelligenza artificiale. Come partecipante, "
    +"avrai la possibilità di scegliere il Topic più adatto alle tue competenze e caricare i file richiesti direttamente nella piattaforma."
    +"Per ogni dataset completato, riceverai 200 DEDO Token, come ricompensa per il tuo contributo. " 
    +"dedoAI è un progetto cryptocurrency che vedrà il suo avvio nei prossimi mesi, e tu potrai effettuare il cambio dei tuoi  Token non appena online"
    +"Assicurati di seguire le linee guida del Topic scelto per massimizzare i tuoi guadagni e contribuire con dati di qualità che possano "
    +" essere validati dalla nostra piattaforma. Non vediamo l'ora di vedere i tuoi dataset! Se hai domande o bisogno di assistenza, sentiti libero di chiedere."
    +"Le informazioni sul Topic disponibili e le loro descrizioni sono in questo JSON: " + JSON.stringify(c4dInfo)
    +"Tienile a mente se l'utente chiede"
    +"Rispondi di base in inglese o nella lingua di scrittura dell'utente" 
}

async function answerFromGeneralMessage( user, question ) {
    if (!openai) {
        throw new Error('OpenAI non è configurato correttamente');
    }
    if( !contextGeneral ){
        await hydrate();
    }

    try {
        const response = await openai.createChatCompletion({
            model: "gpt-4",
            messages: [
                { role: "system", content: contextGeneral },
                { role: "user", content: "Crea una risposta per l'utente " + user + " che mi ci chiede questo: " + question },
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


async function answerFromC4DTopicMessage( user, question, c4d, activity ) {
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
                { role: "user", content: "Crea una risposta per l'utente " + user.username + " che mi ci chiede questo: " + question + ". Considera il suo ruolo di Producer di Immagini inerenti la Call for Data: ("+ contextTopic +") di DedoAI. L'attività che lui ha già fatto è rappresentata dal seguente JSON " + JSON.stringify(activity) + " Puoi usare questa informazione per dargli un resoconto" },
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

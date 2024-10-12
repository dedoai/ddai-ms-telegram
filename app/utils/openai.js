// /src/utils/openai.js
const { getSecret } = require('../config/index');
const { Configuration, OpenAIApi } = require("openai");

let openai;

// Carica le configurazioni da AWS Secrets Manager
(async () => {
    try {
        // Usa await correttamente in una funzione asincrona
        const secret = await getSecret('dev/telegram');
        const secrets = JSON.parse(secret);
        const configuration = new Configuration({
            apiKey: secrets.OPENAI_APIKEY,  // Recupera la chiave OpenAI da AWS
        });

        openai = new OpenAIApi(configuration);
    } catch (error) {
        console.error('Errore durante il caricamento delle configurazioni OpenAI:', error);
    }
})();

async function validateImage(imageBuffer, description) {
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

module.exports = { validateImage };

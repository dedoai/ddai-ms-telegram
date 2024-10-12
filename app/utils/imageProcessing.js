// /src/utils/imageProcessing.js
const Jimp = require('jimp');
const { validateImage } = require('./openai');

async function processImage(filePath) {
    try {
        // Carica l'immagine con Jimp
        const image = await Jimp.read(filePath);
        // Ridimensiona l'immagine a 512x512 e restituisci il buffer
        const resizedImage = await image.resize(512, 512).getBufferAsync(Jimp.MIME_JPEG);
        return resizedImage;
    } catch (err) {
        console.error('Errore durante l\'elaborazione dell\'immagine:', err);
        throw err;
    }
}

async function validateWithChatGPT(image, description) {
    const validation = await validateImage(image, description);
    return validation;
}

module.exports = { processImage, validateWithChatGPT };

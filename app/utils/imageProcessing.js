// /src/utils/imageProcessing.js
const { Jimp } = require('jimp');
const { validateImage } = require('./openai');
const path = require('path');
const fs = require('fs').promises;

async function processImage(filePath) {
  try {
    // Carica l'immagine con Jimp
    const image = await Jimp.read(filePath);

    // Crea un nuovo percorso per l'immagine ridimensionata (nella stessa directory o temporanea)
    const newFilePath = path.join(path.dirname(filePath), `resized_${path.basename(filePath)}`);
    // Crea un percorso per la copia del file originale
    const copyFilePath = path.join(path.dirname(filePath), `copy_${path.basename(filePath)}`);

    // Copia il file originale
    await fs.copyFile(filePath, copyFilePath);
    console.log(`File originale copiato in: ${copyFilePath}`);

    // Ridimensiona l'immagine a 512x512 e salva il nuovo file ridimensionato
    //	image.resize(512, 512); // resize
    //	image.write(filePath);

    //        await Jimp.read(copyFilePath)
    //                  .then(image => image.resize(512, 512).writeAsync(newFilePath));
    console.log(`Immagine ridimensionata e salvata in: ${newFilePath}`);

    // Restituisci il nuovo percorso per l'analisi del validatore
    return filePath;

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

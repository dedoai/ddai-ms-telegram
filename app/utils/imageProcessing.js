// /src/utils/imageProcessing.js
const sharp = require('sharp');
const { validateImage } = require('./openai');

async function processImage(filePath) {
    const resizedImage = await sharp(filePath).resize(512, 512).toBuffer();
    return resizedImage;
}

async function validateWithChatGPT(image, description) {
    const validation = await validateImage(image, description);
    return validation;
}

module.exports = { processImage, validateWithChatGPT };

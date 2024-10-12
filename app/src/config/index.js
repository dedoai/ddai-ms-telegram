// /src/config/index.js
const AWS = require('aws-sdk');

// Configurazione di AWS SDK
const secretsManager = new AWS.SecretsManager({
    accessKeyId: process.env.AWS_KEY,  // Queste chiavi possono ancora provenire da env o IAM
    secretAccessKey: process.env.AWS_SECRET,
    region: 'eu-west-1',
});

async function getSecret(secretName) {
    try {
        const data = await secretsManager.getSecretValue({ SecretId: secretName }).promise();
        if ('SecretString' in data) {
            return JSON.parse(data.SecretString);
        } else {
            throw new Error('Secret string is missing');
        }
    } catch (err) {
        console.error(`Errore durante il recupero del secret ${secretName}:`, err);
        throw err;
    }
}

module.exports = { getSecret };

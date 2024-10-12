// /src/config/index.js
const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");

const AWS = require('aws-sdk');


        // Crea un nuovo client SecretsManager
        const client = new SecretsManagerClient(
                {
                        region: "us-east-1",
                        credentials: {
                                accessKeyId: process.env.AWS_KEY.trim(),       // Prendi la chiave AWS dall'ambiente
                                secretAccessKey: process.env.AWS_SECRET.trim() // Prendi il secret dall'ambiente
                        }
                }
        );
        // Funzione per recuperare il segreto
        async function getSecret(secretName) {
          const command = new GetSecretValueCommand({ SecretId: secretName });
          try {
            const data = await client.send(command);
            if ("SecretString" in data) {
              return data.SecretString;
            } else {
              const buff = Buffer.from(data.SecretBinary, "base64");
              return buff.toString("ascii");
            }
          } catch (err) {
            console.error(err);
            throw err;
          }
        }


module.exports = await getSecret('dev/telegram');

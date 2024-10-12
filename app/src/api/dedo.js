// /src/api/dedo.js
const { updateDataset, checkDatasetLimit } = require('../db/postgres');

async function handleDatasetUpload(userId, c4dId, filePath) {
    try {
        const dataset = await updateDataset(userId, c4dId, filePath);
        const isLimitReached = await checkDatasetLimit(userId, c4dId);

        if (isLimitReached) {
            // Invio messaggio di congratulazioni
            return {
                success: true,
                message: "Complimenti! Hai raggiunto il limite del dataset e il pagamento in DEDO Token è stato registrato.",
            };
        } else {
            return {
                success: true,
                message: "File caricato con successo. Continua a caricare dati per guadagnare più DEDO Token.",
            };
        }
    } catch (error) {
        return { success: false, message: "Errore durante il caricamento del dataset." };
    }
}

module.exports = { handleDatasetUpload };


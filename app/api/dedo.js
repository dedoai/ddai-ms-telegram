// /src/api/dedo.js
const { updateDataset, manageDataset } = require('../db/postgres');

async function handleDatasetUpload(userId, c4dId, filePath) {
  try {
    const { limitReached } = await manageDataset('tgTopic', userId, c4dId);

    if (limitReached) {
      // Invio messaggio di congratulazioni
      return {
        success: true,
        message: "Complimenti! Hai raggiunto il limite del dataset e il pagamento in DEDO Token è stato registrato.",
      };
    } else {
      await updateDataset(userId, c4dId, filePath);

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

// /src/db/postgres.js
const { Pool } = require('pg');

const { getSecret } = require('../config/index');

var pool;

async function connect (){
    const secrets = JSON.parse(await getSecret('rds!db-328bc97f-8f6d-4cb8-a9e2-1ca01c0e88d1'));
    console.log("secret recuperati per Postgres: ", secrets);
    pool = new Pool({
        user: secrets.username,
        host: 'localhost',
        database: 'dedoai',
        password: secrets.password,
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });
}

connect();

//setInterval(connect, 100000);

async function getC4DByTopic(telegramTopic) {
    const res = await pool.query('SELECT * FROM c4d WHERE telegram_topic = $1', [telegramTopic]);
    return res.rows[0];
}

async function getDataset(userId, c4dId) {
    const res = await pool.query('SELECT * FROM datasets WHERE user_id = $1 AND c4d_id = $2 ORDER BY created_at DESC LIMIT 1', [userId, c4dId]);
    return res.rows[0];
}

async function createDataset(userId, c4dId, name = 'New Dataset') {
    const res = await pool.query(
        'INSERT INTO datasets (user_id, c4d_id, name) VALUES ($1, $2, $3) RETURNING *',
        [userId, c4dId, name]
    );
    return res.rows[0];
}

async function countFilesInDataset(datasetId) {
    const res = await pool.query(
        'SELECT COUNT(*) FROM files WHERE entity_name = $1 AND entity_id = $2',
        ['dataset', datasetId]
    );
    return parseInt(res.rows[0].count, 10);  // Ritorna il conteggio dei file caricati
}

async function manageDataset(telegramTopic, userId, c4d ) {
    try {
        if( c4d )
            // 1. Recupera il record C4D in base al telegram_topic
            c4d = await getC4DByTopic(telegramTopic);
        if (!c4d) {
            throw new Error('C4D not found for the provided topic.');
        }

        // 2. Recupera l'ultimo dataset dell'utente per la C4D
        let dataset = await getDataset(userId, c4d.id);

        // 3. Se non esiste un dataset o è validato, creane uno nuovo
        if (!dataset || dataset.is_validated) {
            dataset = await createDataset(userId, c4d.id);
            return { message: 'New dataset created.', dataset };
        }

        // 4. Verifica quanti file sono stati caricati nel dataset
        const fileCount = await countFilesInDataset(dataset.id);

        // 5. Controlla se il dataset è completato rispetto al limite impostato
        if (fileCount >= c4d.dataset_limit) {
            dataset = await createDataset(userId, c4d.id);
            return { message: 'Dataset limit reached. New dataset created.', dataset, c4d };
        }

        // 6. Se il dataset non è ancora completato, restituisci il dataset esistente
        return { message: 'Existing dataset available for uploads.', dataset, c4d, fileCount };

    } catch (error) {
        console.error(error);
        throw new Error('Error managing dataset.');
    }
}

async function getC4DRecords() {
    const res = await pool.query('SELECT * FROM c4d WHERE status = $1', ['open']);
    return res.rows;
}

async function updateReminder(c4dId) {
    const res = await pool.query('UPDATE c4d SET telegram_last_remider = $1 WHERE id = $2', [new Date(), c4dId]);
    return res.rowCount > 0;
}

async function getUser(telegramId) {
    const res = await pool.query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    return res.rows[0];
}

async function createUser(telegramId, username) {
    const res = await pool.query(
        'INSERT INTO users (telegram_id, username) VALUES ($1, $2) RETURNING *',
        [telegramId, username]
    );
    return res.rows[0];
}

// Funzione per ottenere le informazioni dell'attività di un utente in una specifica C4D
async function getUserActivityInC4D(userId, c4dId) {
    try {
        // 1. Conta il numero totale di file caricati dall'utente nei dataset associati alla C4D specifica
        const fileCountRes = await pool.query(
            `SELECT COUNT(*) AS file_count
             FROM files 
             WHERE entity_name = 'dataset' 
             AND entity_id IN (SELECT id FROM datasets WHERE user_id = $1 AND c4d_id = $2)`,
            [userId, c4dId]
        );
        const fileCount = parseInt(fileCountRes.rows[0].file_count, 10);

        // 2. Conta il numero di dataset validati dall'utente per la C4D specifica
        const validatedDatasetRes = await pool.query(
            `SELECT COUNT(*) AS validated_count
             FROM datasets
             WHERE user_id = $1 AND c4d_id = $2 AND is_validated = true`,
            [userId, c4dId]
        );
        const validatedDatasetCount = parseInt(validatedDatasetRes.rows[0].validated_count, 10);

        // 3. Recupera il valore di dataset_price dalla C4D
        const c4dRes = await pool.query(
            'SELECT dataset_price FROM c4d WHERE id = $1',
            [c4dId]
        );
        const datasetPrice = parseFloat(c4dRes.rows[0].dataset_price);

        // 4. Calcola i DEDO Token guadagnati
        const dedoEarned = validatedDatasetCount * datasetPrice;

        // 5. Restituisci le informazioni
        return {
            fileCount,
            validatedDatasetCount,
            dedoEarned
        };

    } catch (error) {
        console.error('Error fetching user activity:', error);
        throw new Error('Could not fetch user activity.');
    }
}

// Funzione per controllare se un dataset ha raggiunto il limite di file e validarlo
async function validateDatasetIfComplete(datasetId, c4dId) {
    try {
        // 1. Conta il numero di file nel dataset
        const fileCountRes = await pool.query(
            `SELECT COUNT(*) AS file_count
             FROM files 
             WHERE entity_name = 'dataset' 
             AND entity_id = $1`,
            [datasetId]
        );
        const fileCount = parseInt(fileCountRes.rows[0].file_count, 10);

        // 2. Recupera il dataset_limit dalla C4D
        const c4dRes = await pool.query(
            'SELECT dataset_limit FROM c4d WHERE id = $1',
            [c4dId]
        );
        const datasetLimit = parseFloat(c4dRes.rows[0].dataset_limit);

        // 3. Se il numero di file caricati ha raggiunto o superato il limite, valida il dataset
        if (fileCount >= datasetLimit) {
            const updateRes = await pool.query(
                'UPDATE datasets SET is_validated = true WHERE id = $1 RETURNING *',
                [datasetId]
            );
            return { validated: true, dataset: updateRes.rows[0] };
        }

        // Se non è stato raggiunto il limite, non fare nulla
        return { validated: false, fileCount, datasetLimit };

    } catch (error) {
        console.error('Error validating dataset:', error);
        throw new Error('Could not validate dataset.');
    }
}

async function showUserActivity(userId, c4dId) {
    try {
        const activity = await getUserActivityInC4D(userId, c4dId);
        console.log(`User has uploaded ${activity.fileCount} files.`);
        console.log(`User has validated ${activity.validatedDatasetCount} datasets.`);
        console.log(`User has earned ${activity.dedoEarned} DEDO Tokens.`);
    } catch (error) {
        console.error('Error showing user activity:', error);
    }
}
module.exports = { getUser, createUser, manageDataset, getC4DByTopic, getUserActivityInC4D, validateDatasetIfComplete };


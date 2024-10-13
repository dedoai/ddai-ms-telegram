// /src/db/postgres.js
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
});


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

// Aggiungere altre query qui

module.exports = { getUser, createUser };


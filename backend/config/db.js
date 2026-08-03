const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'siswa_absensi',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const dbPool = new Pool(poolConfig);

dbPool.on('connect', () => {
  console.log('[DB] PostgreSQL connected');
});

const pool = {
  async query(sqlString, params = []) {
    try {
      let queryStr = sqlString.trim();

      // 1. Convert MySQL <=> (null-safe equal) to PostgreSQL IS NOT DISTINCT FROM
      queryStr = queryStr.replace(/\s*<=>\s*/g, ' IS NOT DISTINCT FROM ');

      // 2. Convert INSERT statement to return inserted values to mock mysql2 insertId behavior
      const isInsert = queryStr.toUpperCase().startsWith('INSERT');
      if (isInsert && !queryStr.toUpperCase().includes('RETURNING')) {
        queryStr += ' RETURNING *';
      }

      // 3. Map '?' placeholders to '$1', '$2', etc. for node-postgres
      let paramCount = 0;
      queryStr = queryStr.replace(/\?/g, () => {
        paramCount++;
        return `$${paramCount}`;
      });

      const res = await dbPool.query(queryStr, params);

      if (isInsert) {
        // Mock insertId
        const row = res.rows[0];
        let insertId = null;
        if (row) {
          const key = Object.keys(row).find(k => k.toLowerCase().endsWith('id'));
          if (key) insertId = row[key];
        }
        return [{ insertId, affectedRows: res.rowCount }, res];
      }

      return [res.rows || [], res];
    } catch (err) {
      console.error('[DB Query Error]:', err.message, '\nQuery:', sqlString, '\nParams:', params);
      throw err;
    }
  },
  rawPool: dbPool
};

module.exports = pool;
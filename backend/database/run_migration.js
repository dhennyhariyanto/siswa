const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const sqlPath = path.resolve(__dirname, 'migration.supabase.sql');
    console.log('[Migration] Reading migration.supabase.sql from:', sqlPath);
    const sqlFile = fs.readFileSync(sqlPath, 'utf8');

    console.log('[Migration] Executing queries on PostgreSQL...');
    await pool.rawPool.query(sqlFile);
    console.log('[Migration] Migration executed successfully.');
  } catch (error) {
    console.error('[Migration] Failed:', error);
  } finally {
    await pool.rawPool.end();
    console.log('[Migration] Connection pool ended.');
  }
}

run();
const pool = require('./config/db');

async function test() {
  try {
    console.log('Testing connection...');
    const [rows] = await pool.query('SELECT 1 AS ok');
    console.log('Database query success! Result:', rows);
    process.exit(0);
  } catch (error) {
    console.error('Database query failed:', error);
    process.exit(1);
  }
}

test();
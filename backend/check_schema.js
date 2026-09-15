const pool = require('./config/db');

async function main() {
  try {
    const [columns] = await pool.query(
      `SELECT column_name, data_type 
       FROM information_schema.columns 
       WHERE table_name = 'facedata'`
    );
    console.log('Columns in facedata:', columns);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
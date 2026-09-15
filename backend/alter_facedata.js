const pool = require('./config/db');

async function main() {
  try {
    // Check if column already exists
    const [cols] = await pool.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'facedata' AND column_name = 'descriptor'`
    );

    if (cols.length === 0) {
      console.log('Adding descriptor column to facedata table...');
      await pool.query('ALTER TABLE facedata ADD COLUMN descriptor TEXT');
      console.log('Column added successfully.');
    } else {
      console.log('Column descriptor already exists.');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const res = await p.query(
      `INSERT INTO corenotifikasi (sekolahid, siswaid, judul, pesan, tipe, isread, createdby)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [1, 1, 'Test Judul', 'Test Pesan', 'presensi', false, 'system']
    );
    console.log('Inserted:', res.rows[0]);
  } catch(e) {
    console.log('INSERT ERROR:', e.message, e.stack);
  }
  await p.end();
})();
const pool = require('./config/db');
async function m(){
  try{ await pool.query(`ALTER TABLE transaksipresensi ADD COLUMN lokasilat_keluar DECIMAL(10,7) NULL`); console.log('lokasilat_keluar ok');}catch(e){console.log(e.message)}
  try{ await pool.query(`ALTER TABLE transaksipresensi ADD COLUMN lokasilng_keluar DECIMAL(10,7) NULL`); console.log('lokasilng_keluar ok');}catch(e){console.log(e.message)}
  console.log('done'); pool.rawPool.end();
}
m();

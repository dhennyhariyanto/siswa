const pool = require('./config/db');

async function migrate() {
  // Add fotomasuk / fotokeluar to transaksipresensi
  try {
    await pool.query(`ALTER TABLE transaksipresensi ADD COLUMN fotomasuk VARCHAR(255) NULL`);
    console.log('fotomasuk added');
  } catch (e) { console.log('fotomasuk:', e.message); }

  try {
    await pool.query(`ALTER TABLE transaksipresensi ADD COLUMN fotokeluar VARCHAR(255) NULL`);
    console.log('fotokeluar added');
  } catch (e) { console.log('fotokeluar:', e.message); }

  // Add jam_masuk / jam_pulang to mastersekolah
  try {
    await pool.query(`ALTER TABLE mastersekolah ADD COLUMN jam_masuk TIME NULL DEFAULT '07:00'`);
    console.log('jam_masuk added');
  } catch (e) { console.log('jam_masuk:', e.message); }

  try {
    await pool.query(`ALTER TABLE mastersekolah ADD COLUMN jam_pulang TIME NULL DEFAULT '15:00'`);
    console.log('jam_pulang added');
  } catch (e) { console.log('jam_pulang:', e.message); }

  try {
    await pool.query(`UPDATE mastersekolah SET jam_masuk = '07:00', jam_pulang = '15:00' WHERE jam_masuk IS NULL`);
    console.log('mastersekolah defaults set');
  } catch (e) { console.log('update default:', e.message); }

  // Add guruid column to corenotifikasi if not exists (for guru notif)
  try {
    await pool.query(`ALTER TABLE corenotifikasi ADD COLUMN guruid INT NULL REFERENCES masterguru(guruid)`);
    console.log('guruid added to corenotifikasi');
  } catch (e) { console.log('guruid notif:', e.message); }

  console.log('Migration done');
  pool.rawPool.end();
}

migrate();

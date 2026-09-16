require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const c1 = await p.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='transaksipresensi' ORDER BY ordinal_position");
    console.log('transaksipresensi cols:', c1.rows.map(c => c.column_name+':'+c.data_type).join(', '));
    const c2 = await p.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='corenotifikasi' ORDER BY ordinal_position");
    console.log('corenotifikasi cols:', c2.rows.map(c => c.column_name+':'+c.data_type).join(', '));
    const c3 = await p.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_name='mastersekolah' ORDER BY ordinal_position");
    console.log('mastersekolah cols:', c3.rows.map(c => c.column_name+':'+c.data_type).join(', '));
    const r1 = await p.query("SELECT presensiid,tanggal,jammasuk,statusmasuk,fotomasuk FROM transaksipresensi ORDER BY presensiid DESC LIMIT 5");
    console.log('presensi rows:', JSON.stringify(r1.rows,null,2));
    const r2 = await p.query("SELECT notifikasiid,judul,pesan,tipe,ortuid,sekolahid,createddate FROM corenotifikasi ORDER BY createddate DESC LIMIT 10");
    console.log('notif rows:', JSON.stringify(r2.rows,null,2));
    const r3 = await p.query("SELECT sekolahid,nama,jam_masuk,jam_pulang FROM mastersekolah LIMIT 5");
    console.log('sekolah rows:', JSON.stringify(r3.rows,null,2));
  } catch(e){ console.log('ERR',e.message); }
  await p.end();
})();

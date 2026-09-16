require('dotenv').config({ path: __dirname + '/.env' });
const { Pool } = require('pg');
(async () => {
  const p = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  try {
    const r1 = await p.query("SELECT * FROM masterortu LIMIT 5");
    console.log('masterortu:', JSON.stringify(r1.rows,null,2));
    const r2 = await p.query("SELECT userid,username,role,sekolahid,siswaid,guruid,ortuid FROM coreuser ORDER BY userid");
    console.log('coreuser:', JSON.stringify(r2.rows,null,2));
    const r3 = await p.query("SELECT presensiid,tanggal,jammasuk,jampulang,statusmasuk,fotomasuk,lokasilat FROM transaksipresensi ORDER BY presensiid DESC LIMIT 5");
    console.log('presensi full:', JSON.stringify(r3.rows,null,2));
    const r4 = await p.query("SELECT * FROM corenotifikasi LIMIT 5");
    console.log('notifikasi:', JSON.stringify(r4.rows,null,2));
    // check attendanceDir existence on serverless vs local
    const fs=require('fs');
    console.log('VERCEL env:', process.env.VERCEL);
    console.log('/tmp exists:', fs.existsSync('/tmp'));
    try{ console.log('/tmp/attendance exists:', fs.existsSync('/tmp/attendance')); }catch(e){console.log(e.message)}
    console.log('./storage/attendance exists:', fs.existsSync('./storage/attendance'));
    try{ console.log('./storage/attendance files:', fs.readdirSync('./storage/attendance').slice(0,5)); }catch(e){console.log('no files:',e.message)}
    // try fetch photo?
  } catch(e){ console.log('ERR',e.message,e.stack); }
  await p.end();
})();

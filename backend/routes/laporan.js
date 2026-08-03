const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Summary report by date range
router.get('/summary', auth(['admin', 'guru']), async (req, res) => {
  try {
    const sekolahid = req.query.sekolahid || req.user.sekolahid;
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const to = req.query.to || from;
    const kelas = req.query.kelas;

    const params = [sekolahid, from, to];
    let kelasFilter = '';
    if (kelas) {
      kelasFilter = ' AND s.kelas = ?';
      params.push(kelas);
    }

    const [rows] = await pool.query(
      `SELECT 
          COUNT(*) AS total_record,
          SUM(CASE WHEN t.statusmasuk = 'hadir' THEN 1 ELSE 0 END) AS total_hadir,
          SUM(CASE WHEN t.statusmasuk = 'terlambat' THEN 1 ELSE 0 END) AS total_terlambat,
          SUM(CASE WHEN t.statusmasuk = 'izin' THEN 1 ELSE 0 END) AS total_izin,
          SUM(CASE WHEN t.statusmasuk = 'sakit' THEN 1 ELSE 0 END) AS total_sakit,
          SUM(CASE WHEN t.statusmasuk = 'alpa' THEN 1 ELSE 0 END) AS total_alpa
       FROM transaksipresensi t
       LEFT JOIN mastersiswa s ON s.siswaid = t.siswaid
       WHERE t.sekolahid = ? AND t.tanggal BETWEEN ? AND ? ${kelasFilter}`,
      params
    );

    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Detail report
router.get('/detail', auth(['admin', 'guru']), async (req, res) => {
  try {
    const sekolahid = req.query.sekolahid || req.user.sekolahid;
    const from = req.query.from || new Date().toISOString().slice(0, 10);
    const to = req.query.to || from;
    const kelas = req.query.kelas;

    const params = [sekolahid, from, to];
    let kelasFilter = '';
    if (kelas) {
      kelasFilter = ' AND s.kelas = ?';
      params.push(kelas);
    }

    const [rows] = await pool.query(
      `SELECT t.presensiid, t.tanggal, s.nisn, s.nama, s.kelas,
              t.jammasuk, t.jampulang, t.statusmasuk, t.statuskeluar,
              t.verifikasi, t.keterangan
       FROM transaksipresensi t
       LEFT JOIN mastersiswa s ON s.siswaid = t.siswaid
       WHERE t.sekolahid = ? AND t.tanggal BETWEEN ? AND ? ${kelasFilter}
       ORDER BY t.tanggal DESC, s.kelas, s.nama
       LIMIT 1000`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
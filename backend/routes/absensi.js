const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer for attendance selfie upload (temp)
const uploadDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.resolve(process.env.UPLOAD_PATH || './storage/uploads');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (err) {
  console.warn('[Absensi] Warning: Could not create upload directory:', err.message);
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ============================================
// POST /api/absensi/checkin  — Face recognition check-in
// Body: multipart form with 'photo' file
// ============================================
router.post('/checkin', auth(['siswa', 'guru']), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Foto selfie wajib dikirim' });
    }

    const pythonPath = process.env.PYTHON_PATH || 'python';
    const checkScript = path.resolve(process.env.FACE_CHECK_SCRIPT || './python/cek_wajah.py');
    const cacheFile = path.resolve(process.env.FACE_CACHE_PATH || './storage/data_wajah.pkl');
    const photoPath = path.resolve(req.file.path);

    execFile(pythonPath, [checkScript, photoPath, cacheFile], { timeout: 30000 }, async (error, stdout, stderr) => {
      // Cleanup temp file
      try { fs.unlinkSync(photoPath); } catch (e) {}

      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Face check error: ' + (stderr || error.message),
        });
      }

      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch (e) {
        return res.status(500).json({ success: false, message: 'Invalid response from face check script' });
      }

      if (result.status !== 'success') {
        return res.status(401).json({ success: false, message: result.message });
      }

      // Face matched! result.nik contains the label e.g. "siswa_5"
      const label = result.nik;
      // Extract siswaid from label
      let siswaid = null;
      let guruid = null;

      if (label.startsWith('siswa_')) {
        siswaid = parseInt(label.replace('siswa_', ''));
      } else if (label.startsWith('guru_')) {
        guruid = parseInt(label.replace('guru_', ''));
      }

      // Verify the face matches the logged-in user
      if (req.user.role === 'siswa' && siswaid !== req.user.siswaid) {
        return res.status(403).json({
          success: false,
          message: 'Wajah tidak sesuai dengan akun login Anda',
        });
      }
      if (req.user.role === 'guru' && guruid !== req.user.guruid) {
        return res.status(403).json({
          success: false,
          message: 'Wajah tidak sesuai dengan akun login Anda',
        });
      }

      // Check if already checked in today
      const today = new Date().toISOString().slice(0, 10);
      const [existing] = await pool.query(
        `SELECT presensiid, jammasuk, jampulang FROM transaksipresensi
         WHERE siswaid <=> ? AND guruid <=> ? AND tanggal = ? LIMIT 1`,
        [siswaid, guruid, today]
      );

      if (existing.length && existing[0].jammasuk) {
        // Already checked in — maybe this is checkout
        if (existing[0].jampulang) {
          return res.status(400).json({ success: false, message: 'Anda sudah check-in dan check-out hari ini' });
        }
        // Do checkout
        const now = new Date().toTimeString().slice(0, 8);
        await pool.query(
          `UPDATE transaksipresensi SET jampulang = ?, statuskeluar = 'hadir' WHERE presensiid = ?`,
          [now, existing[0].presensiid]
        );
        return res.json({
          success: true,
          message: 'Check-out berhasil',
          data: { type: 'checkout', time: now, distance: result.distance },
        });
      }

      // Do check-in
      const jamMasuk = new Date().toTimeString().slice(0, 8);
      // Determine late status (example: > 07:15 = terlambat)
      const statusmasuk = jamMasuk > '07:15:00' ? 'terlambat' : 'hadir';

      const [insertResult] = await pool.query(
        `INSERT INTO transaksipresensi (sekolahid, siswaid, guruid, tanggal, jammasuk, statusmasuk, verifikasi, createdby)
         VALUES (?, ?, ?, ?, ?, ?, 'face', ?)`,
        [req.user.sekolahid, siswaid, guruid, today, jamMasuk, statusmasuk, req.user.username]
      );

      return res.json({
        success: true,
        message: `Check-in berhasil (${statusmasuk})`,
        data: {
          type: 'checkin',
          presensiid: insertResult.insertId,
          time: jamMasuk,
          status: statusmasuk,
          distance: result.distance,
        },
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// POST /api/absensi/manual — Manual attendance by guru
// ============================================
router.post('/manual', auth(['admin', 'guru']), async (req, res) => {
  try {
    const { siswaid, tanggal, statusmasuk, keterangan } = req.body;
    if (!siswaid || !tanggal || !statusmasuk) {
      return res.status(400).json({ success: false, message: 'siswaid, tanggal, statusmasuk wajib diisi' });
    }

    const [existing] = await pool.query(
      'SELECT presensiid FROM transaksipresensi WHERE siswaid = ? AND tanggal = ? LIMIT 1',
      [siswaid, tanggal]
    );
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Presensi sudah tercatat untuk tanggal ini' });
    }

    const jamMasuk = new Date().toTimeString().slice(0, 8);
    const [result] = await pool.query(
      `INSERT INTO transaksipresensi (sekolahid, siswaid, tanggal, jammasuk, statusmasuk, keterangan, verifikasi, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 'manual', ?)`,
      [req.user.sekolahid, siswaid, tanggal, jamMasuk, statusmasuk, keterangan || null, req.user.username]
    );

    return res.status(201).json({
      success: true,
      message: 'Presensi manual berhasil dicatat',
      data: { presensiid: result.insertId },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// GET /api/absensi/history — Attendance history
// Query: siswaid, guruid, from, to
// ============================================
router.get('/history', auth(), async (req, res) => {
  try {
    let { siswaid, guruid, from, to } = req.query;

    // If student/parent, force their own data
    if (req.user.role === 'siswa') siswaid = req.user.siswaid;
    if (req.user.role === 'ortu') {
      // Get siswaid linked to ortu
      const [link] = await pool.query('SELECT siswaid FROM masterortu WHERE ortuid = ?', [req.user.ortuid]);
      if (!link.length) return res.json({ success: true, data: [] });
      siswaid = link[0].siswaid;
    }

    const conditions = ['1=1'];
    const params = [];

    if (siswaid) { conditions.push('t.siswaid = ?'); params.push(siswaid); }
    if (guruid) { conditions.push('t.guruid = ?'); params.push(guruid); }
    if (from) { conditions.push('t.tanggal >= ?'); params.push(from); }
    if (to) { conditions.push('t.tanggal <= ?'); params.push(to); }

    // Scope to user's school
    if (req.user.sekolahid) {
      conditions.push('t.sekolahid = ?');
      params.push(req.user.sekolahid);
    }

    const [rows] = await pool.query(
      `SELECT t.presensiid, t.tanggal, t.jammasuk, t.jampulang, t.statusmasuk, t.statuskeluar,
              t.keterangan, t.verifikasi,
              s.nama AS namasiswa, s.kelas
       FROM transaksipresensi t
       LEFT JOIN mastersiswa s ON s.siswaid = t.siswaid
       WHERE ${conditions.join(' AND ')}
       ORDER BY t.tanggal DESC, t.jammasuk DESC
       LIMIT 500`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================
// GET /api/absensi/today — Today's attendance summary for a class/school
// ============================================
router.get('/today', auth(['admin', 'guru']), async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const sekolahid = req.query.sekolahid || req.user.sekolahid;
    const kelas = req.query.kelas;

    let query = `
      SELECT s.siswaid, s.nisn, s.nama, s.kelas,
             t.presensiid, t.jammasuk, t.jampulang, t.statusmasuk, t.statuskeluar
      FROM mastersiswa s
      LEFT JOIN transaksipresensi t ON t.siswaid = s.siswaid AND t.tanggal = ?
      WHERE s.sekolahid = ? AND s.status = 'A'`;
    const params = [today, sekolahid];

    if (kelas) {
      query += ' AND s.kelas = ?';
      params.push(kelas);
    }
    query += ' ORDER BY s.kelas, s.nama';

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
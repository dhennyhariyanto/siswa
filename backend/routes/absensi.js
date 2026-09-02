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

function euclideanDistance(arr1, arr2) {
  if (arr1.length !== arr2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += Math.pow(arr1[i] - arr2[i], 2);
  }
  return Math.sqrt(sum);
}

// ============================================
// POST /api/absensi/checkin  — Face recognition check-in
// Body: multipart form with 'photo' file
// ============================================
router.post('/checkin', auth(['siswa', 'guru']), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Foto selfie wajib dikirim' });
    }

    const { getFaceDescriptor } = require('../faceHelper');
    const photoBuffer = fs.readFileSync(req.file.path);
    const descriptor = await getFaceDescriptor(photoBuffer, req.file.mimetype);

    // Cleanup temp file
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    if (!descriptor) {
      return res.status(400).json({
        success: false,
        message: 'Wajah tidak terdeteksi pada foto. Silakan pastikan pencahayaan cukup dan wajah terlihat jelas.',
      });
    }

    const siswaid = req.user.role === 'siswa' ? req.user.siswaid : null;
    const guruid = req.user.role === 'guru' ? req.user.guruid : null;

    // Fetch registered faces for the logged-in user
    let rows = [];
    if (req.user.role === 'siswa') {
      [rows] = await pool.query(
        `SELECT descriptor FROM facedata WHERE siswaid = ? AND status = 'A'`,
        [siswaid]
      );
    } else if (req.user.role === 'guru') {
      [rows] = await pool.query(
        `SELECT descriptor FROM facedata WHERE guruid = ? AND status = 'A'`,
        [guruid]
      );
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Wajah Anda belum terdaftar di sistem. Silakan daftarkan wajah terlebih dahulu.',
      });
    }

    let minDistance = Infinity;
    for (const row of rows) {
      if (!row.descriptor) continue;
      try {
        const regDescriptor = JSON.parse(row.descriptor);
        const dist = euclideanDistance(descriptor, regDescriptor);
        if (dist < minDistance) {
          minDistance = dist;
        }
      } catch (e) {
        console.error('Error parsing face descriptor:', e);
      }
    }

    const matchThreshold = 0.6; // standard threshold for face-api.js
    if (minDistance > matchThreshold) {
      return res.status(401).json({
        success: false,
        message: `Wajah tidak cocok dengan data terdaftar (distance: ${minDistance.toFixed(3)})`,
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

      // Parent notification for checkout if it's a student
      if (req.user.role === 'siswa') {
        try {
          const [ortuRows] = await pool.query('SELECT ortuid FROM masterortu WHERE siswaid = ?', [siswaid]);
          const ortuid = ortuRows.length ? ortuRows[0].ortuid : null;
          if (ortuid) {
            const [siswaRow] = await pool.query('SELECT nama FROM mastersiswa WHERE siswaid = ?', [siswaid]);
            const namasiswa = siswaRow[0]?.nama || 'Putra/Putri Anda';
            await pool.query(
              `INSERT INTO corenotifikasi (sekolahid, siswaid, ortuid, judul, pesan, tipe, isread, createdby)
               VALUES (?, ?, ?, ?, ?, 'presensi', 0, 'system')`,
              [req.user.sekolahid, siswaid, ortuid, 'Presensi Check-Out', `${namasiswa} telah melakukan check-out presensi pulang pada ${now}.`]
            );
          }
        } catch (notifErr) {
          console.error('[Notification Error] Failed to create checkout notification:', notifErr.message);
        }
      }

      return res.json({
        success: true,
        message: 'Check-out berhasil',
        data: { type: 'checkout', time: now, distance: minDistance },
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

    // Parent notification for checkin if it's a student
    if (req.user.role === 'siswa') {
      try {
        const [ortuRows] = await pool.query('SELECT ortuid FROM masterortu WHERE siswaid = ?', [siswaid]);
        const ortuid = ortuRows.length ? ortuRows[0].ortuid : null;
        if (ortuid) {
          const [siswaRow] = await pool.query('SELECT nama FROM mastersiswa WHERE siswaid = ?', [siswaid]);
          const namasiswa = siswaRow[0]?.nama || 'Putra/Putri Anda';
          await pool.query(
            `INSERT INTO corenotifikasi (sekolahid, siswaid, ortuid, judul, pesan, tipe, isread, createdby)
             VALUES (?, ?, ?, ?, ?, 'presensi', 0, 'system')`,
            [req.user.sekolahid, siswaid, ortuid, 'Presensi Check-In', `${namasiswa} telah melakukan check-in presensi masuk pada ${jamMasuk} dengan status ${statusmasuk}.`]
          );
        }
      } catch (notifErr) {
        console.error('[Notification Error] Failed to create checkin notification:', notifErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Check-in berhasil (${statusmasuk})`,
      data: {
        type: 'checkin',
        presensiid: insertResult.insertId,
        time: jamMasuk,
        status: statusmasuk,
        distance: minDistance,
      },
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
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer for attendance selfie upload
const uploadDir = process.env.VERCEL
  ? '/tmp/uploads'
  : path.resolve(process.env.UPLOAD_PATH || './storage/uploads');

const attendanceDir = process.env.VERCEL
  ? '/tmp/attendance'
  : path.resolve('./storage/attendance');

try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(attendanceDir)) fs.mkdirSync(attendanceDir, { recursive: true });
} catch (err) {
  console.warn('[Absensi] Warning: Could not create directories:', err.message);
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

    const lat = req.body.lat || null;
    const lng = req.body.lng || null;

    const { getFaceDescriptor } = require('../faceHelper');
    const photoBuffer = fs.readFileSync(req.file.path);
    const descriptor = await getFaceDescriptor(photoBuffer, req.file.mimetype);

    if (!descriptor) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
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
      try { fs.unlinkSync(req.file.path); } catch (e) {}
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
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(401).json({
        success: false,
        message: `Wajah tidak cocok dengan data terdaftar (distance: ${minDistance.toFixed(3)})`,
      });
    }

    // Save image as base64 data URI (Vercel serverless has ephemeral /tmp filesystem)
    const photoBuffer = fs.readFileSync(req.file.path);
    const ext = path.extname(req.file.originalname) || '.jpg';
    const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
    const mime = mimeMap[ext.toLowerCase()] || 'image/jpeg';
    const publicPhotoPath = `data:${mime};base64,${photoBuffer.toString('base64')}`;
    try { fs.unlinkSync(req.file.path); } catch (_) {}

    // School work hours
    const [sekolahRows] = await pool.query(
      `SELECT jam_masuk, jam_pulang FROM mastersekolah WHERE sekolahid = ? LIMIT 1`,
      [req.user.sekolahid]
    );
    const jamMasukRule = sekolahRows.length && sekolahRows[0].jam_masuk ? sekolahRows[0].jam_masuk : '07:00:00';
    const jamPulangRule = sekolahRows.length && sekolahRows[0].jam_pulang ? sekolahRows[0].jam_pulang : '15:00:00';

    // Check if already checked in today
    // Use Asia/Jakarta (WIB, UTC+7) to avoid server UTC mismatch
    const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const today = nowWIB.toISOString().slice(0, 10);
    const nowTime = nowWIB.toISOString().slice(11, 19);
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
      const statuskeluar = nowTime < jamPulangRule ? 'lebih awal' : 'hadir';
      await pool.query(
        `UPDATE transaksipresensi 
         SET jampulang = ?, statuskeluar = ?, fotokeluar = ?, lokasilat_keluar = ?, lokasilng_keluar = ? 
         WHERE presensiid = ?`,
        [nowTime, statuskeluar, publicPhotoPath, lat, lng, existing[0].presensiid]
      );

      // Notification to Ortu & Guru
      if (req.user.role === 'siswa') {
        try {
          const [ortuRows] = await pool.query('SELECT ortuid FROM masterortu WHERE siswaid = ?', [siswaid]);
          const ortuid = ortuRows.length ? ortuRows[0].ortuid : null;
          const [siswaRow] = await pool.query('SELECT nama FROM mastersiswa WHERE siswaid = ?', [siswaid]);
          const namasiswa = siswaRow[0]?.nama || 'Putra/Putri Anda';

          if (ortuid) {
            await pool.query(
              `INSERT INTO corenotifikasi (sekolahid, siswaid, ortuid, judul, pesan, tipe, isread, createdby)
               VALUES (?, ?, ?, ?, ?, 'presensi', false, 'system')`,
              [req.user.sekolahid, siswaid, ortuid, 'Presensi Check-Out', `${namasiswa} telah check-out pulang pada ${nowTime} (${statuskeluar}).`]
            );
          }
          // Guru notif
          await pool.query(
            `INSERT INTO corenotifikasi (sekolahid, siswaid, judul, pesan, tipe, isread, createdby)
             VALUES (?, ?, ?, ?, 'presensi', false, 'system')`,
            [req.user.sekolahid, siswaid, `Presensi Pulang: ${namasiswa}`, `${namasiswa} telah check-out pulang pada ${nowTime} (${statuskeluar}).`]
          );
        } catch (notifErr) {
          console.error('[Notification Error] Failed to create checkout notification:', notifErr.message);
        }
      }

      return res.json({
        success: true,
        message: `Check-out berhasil (${statuskeluar})`,
        data: { type: 'checkout', time: nowTime, status: statuskeluar, photo: publicPhotoPath },
      });
    }

    // Do check-in
    const statusmasuk = nowTime > jamMasukRule ? 'terlambat' : 'hadir';

    const [insertResult] = await pool.query(
      `INSERT INTO transaksipresensi 
        (sekolahid, siswaid, guruid, tanggal, jammasuk, statusmasuk, verifikasi, fotomasuk, lokasilat, lokasilng, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 'face', ?, ?, ?, ?)`,
      [req.user.sekolahid, siswaid, guruid, today, nowTime, statusmasuk, publicPhotoPath, lat, lng, req.user.username]
    );

    // Notification to Ortu & Guru
    if (req.user.role === 'siswa') {
      try {
        const [ortuRows] = await pool.query('SELECT ortuid FROM masterortu WHERE siswaid = ?', [siswaid]);
        const ortuid = ortuRows.length ? ortuRows[0].ortuid : null;
        const [siswaRow] = await pool.query('SELECT nama FROM mastersiswa WHERE siswaid = ?', [siswaid]);
        const namasiswa = siswaRow[0]?.nama || 'Putra/Putri Anda';

        if (ortuid) {
          await pool.query(
            `INSERT INTO corenotifikasi (sekolahid, siswaid, ortuid, judul, pesan, tipe, isread, createdby)
             VALUES (?, ?, ?, ?, ?, 'presensi', false, 'system')`,
            [req.user.sekolahid, siswaid, ortuid, 'Presensi Check-In', `${namasiswa} telah presensi masuk pada ${nowTime} (${statusmasuk}).`]
          );
        }
        // Guru notif
        await pool.query(
          `INSERT INTO corenotifikasi (sekolahid, siswaid, judul, pesan, tipe, isread, createdby)
           VALUES (?, ?, ?, ?, 'presensi', false, 'system')`,
          [req.user.sekolahid, siswaid, `Presensi Masuk: ${namasiswa}`, `${namasiswa} telah presensi masuk pada ${nowTime} (${statusmasuk}).`]
        );
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
        time: nowTime,
        status: statusmasuk,
        photo: publicPhotoPath,
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

    const jamMasuk = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(11, 19); // WIB
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
              t.keterangan, t.verifikasi, t.fotomasuk, t.fotokeluar,
              t.lokasilat, t.lokasilng, t.lokasilat_keluar, t.lokasilng_keluar,
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
    const todayWIB = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const sekolahid = req.query.sekolahid || req.user.sekolahid;
    const kelas = req.query.kelas;

    let query = `
      SELECT s.siswaid, s.nisn, s.nama, s.kelas,
             t.presensiid, t.jammasuk, t.jampulang, t.statusmasuk, t.statuskeluar,
             t.fotomasuk, t.fotokeluar
      FROM mastersiswa s
      LEFT JOIN transaksipresensi t ON t.siswaid = s.siswaid AND t.tanggal = ?
      WHERE s.sekolahid = ? AND s.status = 'A'`;
    const params = [todayWIB, sekolahid];

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
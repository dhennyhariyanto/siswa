const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Multer config for face photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = process.env.VERCEL
      ? '/tmp/photos'
      : path.resolve(process.env.FACE_PHOTO_PATH || './storage/photos');
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.warn('[Siswa] Warning: Could not create photos directory:', err.message);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    // filename: siswa_<siswaid>_<timestamp>.jpg
    const name = `siswa_${req.params.id}_${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// List siswa by sekolah
router.get('/', auth(), async (req, res) => {
  try {
    const sekolahid = req.query.sekolahid || req.user.sekolahid;
    const [rows] = await pool.query(
      `SELECT s.siswaid, s.sekolahid, s.nisn, s.nama, s.jeniskelamin, s.kelas, s.notelportu, s.status
       FROM mastersiswa s
       WHERE s.sekolahid = ?
       ORDER BY s.kelas, s.nama`,
      [sekolahid]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get siswa detail
router.get('/:id', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mastersiswa WHERE siswaid = ? LIMIT 1', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create siswa (admin/guru)
router.post('/', auth(['admin', 'guru']), async (req, res) => {
  try {
    const { sekolahid, nisn, nama, jeniskelamin, kelas, notelportu } = req.body;
    if (!nama || !sekolahid) {
      return res.status(400).json({ success: false, message: 'Nama dan sekolahid wajib diisi' });
    }
    const [result] = await pool.query(
      `INSERT INTO mastersiswa (sekolahid, nisn, nama, jeniskelamin, kelas, notelportu, status, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 'A', ?)`,
      [sekolahid, nisn || null, nama, jeniskelamin || null, kelas || null, notelportu || null, req.user.username]
    );
    return res.status(201).json({
      success: true,
      message: 'Siswa berhasil ditambahkan',
      data: { siswaid: result.insertId }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update siswa
router.put('/:id', auth(['admin', 'guru']), async (req, res) => {
  try {
    const { nisn, nama, jeniskelamin, kelas, notelportu, status } = req.body;
    await pool.query(
      `UPDATE mastersiswa SET nisn=?, nama=?, jeniskelamin=?, kelas=?, notelportu=?, status=? WHERE siswaid=?`,
      [nisn, nama, jeniskelamin, kelas, notelportu, status || 'A', req.params.id]
    );
    return res.json({ success: true, message: 'Siswa berhasil diupdate' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Upload face photo for a siswa
router.post('/:id/face', auth(['admin', 'guru']), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File foto wajib dikirim' });
    }

    // Save record in facedata table
    await pool.query(
      `INSERT INTO facedata (siswaid, fotopath, label, createdby)
       VALUES (?, ?, ?, ?)`,
      [req.params.id, req.file.filename, `siswa_${req.params.id}`, req.user.username]
    );

    return res.json({
      success: true,
      message: 'Foto wajah berhasil diupload',
      data: { filename: req.file.filename }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Train all faces (rebuild .pkl cache)
router.post('/face/train', auth(['admin', 'guru']), async (req, res) => {
  try {
    const pythonPath = process.env.PYTHON_PATH || 'python';
    const trainScript = path.resolve(process.env.FACE_TRAIN_SCRIPT || './python/latih_wajah.py');
    const facesDir = path.resolve(process.env.FACE_PHOTO_PATH || './storage/photos');
    const cacheFile = path.resolve(process.env.FACE_CACHE_PATH || './storage/data_wajah.pkl');

    execFile(pythonPath, [trainScript, facesDir, cacheFile], { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[TRAIN ERROR]', error.message, stderr);
        return res.status(500).json({
          success: false,
          message: 'Training gagal: ' + (stderr || error.message)
        });
      }
      return res.json({
        success: true,
        message: 'Training wajah selesai',
        data: { output: stdout.trim() }
      });
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');
const bcrypt = require('bcryptjs');
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

// Get siswa detail with username
router.get('/:id', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.*, u.username 
       FROM mastersiswa s 
       LEFT JOIN coreuser u ON u.siswaid = s.siswaid
       WHERE s.siswaid = ? LIMIT 1`,
      [req.params.id]
    );
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
    const { sekolahid, nisn, nama, jeniskelamin, kelas, notelportu, username, password } = req.body;
    if (!nama || !sekolahid) {
      return res.status(400).json({ success: false, message: 'Nama dan sekolahid wajib diisi' });
    }
    const [result] = await pool.query(
      `INSERT INTO mastersiswa (sekolahid, nisn, nama, jeniskelamin, kelas, notelportu, status, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 'A', ?)`,
      [sekolahid, nisn || null, nama, jeniskelamin || null, kelas || null, notelportu || null, req.user.username]
    );

    const siswaid = result.insertId;

    // Create user login if username is provided
    if (username && password) {
      const [existing] = await pool.query('SELECT userid FROM coreuser WHERE username = ? LIMIT 1', [username]);
      if (existing.length) {
        return res.status(201).json({
          success: true,
          message: 'Siswa berhasil ditambahkan, namun username login sudah digunakan',
          data: { siswaid }
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO coreuser (sekolahid, username, password, role, siswaid, status, createdby)
         VALUES (?, ?, ?, 'siswa', ?, 'A', ?)`,
        [sekolahid, username, hashedPassword, siswaid, req.user.username]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Siswa berhasil ditambahkan',
      data: { siswaid }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update siswa
router.put('/:id', auth(['admin', 'guru']), async (req, res) => {
  try {
    const { nisn, nama, jeniskelamin, kelas, notelportu, status, username, password } = req.body;
    await pool.query(
      `UPDATE mastersiswa SET nisn=?, nama=?, jeniskelamin=?, kelas=?, notelportu=?, status=? WHERE siswaid=?`,
      [nisn, nama, jeniskelamin, kelas, notelportu, status || 'A', req.params.id]
    );

    const siswaid = req.params.id;

    // Manage user login if username is provided
    if (username) {
      const [existingUser] = await pool.query('SELECT userid, username FROM coreuser WHERE siswaid = ? LIMIT 1', [siswaid]);
      if (existingUser.length) {
        // Update user
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await pool.query(
            `UPDATE coreuser SET username = ?, password = ?, status = ? WHERE siswaid = ?`,
            [username, hashedPassword, status || 'A', siswaid]
          );
        } else {
          await pool.query(
            `UPDATE coreuser SET username = ?, status = ? WHERE siswaid = ?`,
            [username, status || 'A', siswaid]
          );
        }
      } else if (password) {
        // Create user
        const [usernameCheck] = await pool.query('SELECT userid FROM coreuser WHERE username = ? LIMIT 1', [username]);
        if (!usernameCheck.length) {
          const [siswaRow] = await pool.query('SELECT sekolahid FROM mastersiswa WHERE siswaid = ? LIMIT 1', [siswaid]);
          const sekolahid = siswaRow[0]?.sekolahid || req.user.sekolahid;
          const hashedPassword = await bcrypt.hash(password, 10);
          await pool.query(
            `INSERT INTO coreuser (sekolahid, username, password, role, siswaid, status, createdby)
             VALUES (?, ?, ?, 'siswa', ?, 'A', ?)`,
            [sekolahid, username, hashedPassword, siswaid, req.user.username]
          );
        }
      }
    }

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

    const { getFaceDescriptor } = require('../faceHelper');
    const photoBuffer = fs.readFileSync(req.file.path);
    const descriptor = await getFaceDescriptor(photoBuffer, req.file.mimetype);

    if (!descriptor) {
      // Clean up uploaded file
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({ success: false, message: 'Wajah tidak terdeteksi pada foto. Silakan ambil foto ulang.' });
    }

    // Save record in facedata table
    await pool.query(
      `INSERT INTO facedata (siswaid, fotopath, label, descriptor, istrained, status, createdby)
       VALUES (?, ?, ?, ?, true, 'A', ?)`,
      [req.params.id, req.file.filename, `siswa_${req.params.id}`, JSON.stringify(descriptor), req.user.username]
    );

    return res.json({
      success: true,
      message: 'Foto wajah berhasil diupload dan didaftarkan',
      data: { filename: req.file.filename }
    });
  } catch (error) {
    if (req.file && req.file.path) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Train all faces (rebuild .pkl cache)
router.post('/face/train', auth(['admin', 'guru']), async (req, res) => {
  try {
    // Face API in this online version registers faces automatically on upload, so training is redundant.
    return res.json({
      success: true,
      message: 'Sistem online mengolah wajah secara otomatis. Training manual tidak diperlukan.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
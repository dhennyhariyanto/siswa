const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// Get list of schools (public/auth)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT sekolahid, nama, alamat, notelp, jam_masuk, jam_pulang FROM mastersekolah');
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get school details
router.get('/:id', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM mastersekolah WHERE sekolahid = ? LIMIT 1', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Sekolah tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create school (admin only)
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { nama, alamat, notelp, jam_masuk, jam_pulang } = req.body;
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama sekolah wajib diisi' });
    }
    const [result] = await pool.query(
      'INSERT INTO mastersekolah (nama, alamat, notelp, jam_masuk, jam_pulang, createdby) VALUES (?, ?, ?, ?, ?, ?)',
      [nama, alamat || null, notelp || null, jam_masuk || '07:00:00', jam_pulang || '15:00:00', req.user.username]
    );
    return res.status(201).json({
      success: true,
      message: 'Sekolah berhasil dibuat',
      data: { sekolahid: result.insertId, nama, alamat, notelp, jam_masuk, jam_pulang }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update school (admin only)
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const { nama, alamat, notelp, status, jam_masuk, jam_pulang } = req.body;
    if (!nama) {
      return res.status(400).json({ success: false, message: 'Nama sekolah wajib diisi' });
    }
    await pool.query(
      'UPDATE mastersekolah SET nama = ?, alamat = ?, notelp = ?, status = ?, jam_masuk = ?, jam_pulang = ? WHERE sekolahid = ?',
      [nama, alamat || null, notelp || null, status || 'A', jam_masuk || '07:00:00', jam_pulang || '15:00:00', req.params.id]
    );
    return res.json({ success: true, message: 'Sekolah berhasil diupdate' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

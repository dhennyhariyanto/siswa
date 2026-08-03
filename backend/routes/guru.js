const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// List guru by sekolah
router.get('/', auth(), async (req, res) => {
  try {
    const sekolahid = req.query.sekolahid || req.user.sekolahid;
    const [rows] = await pool.query(
      'SELECT guruid, sekolahid, nip, nama, jeniskelamin, notelp, email, status FROM masterguru WHERE sekolahid = ? ORDER BY nama',
      [sekolahid]
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get guru detail
router.get('/:id', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM masterguru WHERE guruid = ? LIMIT 1', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Guru tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create guru (admin)
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { sekolahid, nip, nama, jeniskelamin, notelp, email } = req.body;
    if (!nama || !sekolahid) {
      return res.status(400).json({ success: false, message: 'Nama dan sekolahid wajib diisi' });
    }
    const [result] = await pool.query(
      `INSERT INTO masterguru (sekolahid, nip, nama, jeniskelamin, notelp, email, status, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 'A', ?)`,
      [sekolahid, nip || null, nama, jeniskelamin || null, notelp || null, email || null, req.user.username]
    );
    return res.status(201).json({
      success: true,
      message: 'Guru berhasil ditambahkan',
      data: { guruid: result.insertId }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update guru
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const { nip, nama, jeniskelamin, notelp, email, status } = req.body;
    await pool.query(
      `UPDATE masterguru SET nip=?, nama=?, jeniskelamin=?, notelp=?, email=?, status=? WHERE guruid=?`,
      [nip, nama, jeniskelamin, notelp, email, status || 'A', req.params.id]
    );
    return res.json({ success: true, message: 'Guru berhasil diupdate' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
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
    const { sekolahid, nip, nama, jeniskelamin, notelp, email, username, password } = req.body;
    if (!nama || !sekolahid) {
      return res.status(400).json({ success: false, message: 'Nama dan sekolahid wajib diisi' });
    }
    const [result] = await pool.query(
      `INSERT INTO masterguru (sekolahid, nip, nama, jeniskelamin, notelp, email, status, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 'A', ?)`,
      [sekolahid, nip || null, nama, jeniskelamin || null, notelp || null, email || null, req.user.username]
    );

    const guruid = result.insertId;

    // Create user login if username is provided
    if (username && password) {
      const [existing] = await pool.query('SELECT userid FROM coreuser WHERE username = ? LIMIT 1', [username]);
      if (existing.length) {
        return res.status(201).json({
          success: true,
          message: 'Guru berhasil ditambahkan, namun username login sudah digunakan',
          data: { guruid }
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO coreuser (sekolahid, username, password, role, guruid, status, createdby)
         VALUES (?, ?, ?, 'guru', ?, 'A', ?)`,
        [sekolahid, username, hashedPassword, guruid, req.user.username]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Guru berhasil ditambahkan',
      data: { guruid }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update guru
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const { nip, nama, jeniskelamin, notelp, email, status, username, password } = req.body;
    await pool.query(
      `UPDATE masterguru SET nip=?, nama=?, jeniskelamin=?, notelp=?, email=?, status=? WHERE guruid=?`,
      [nip, nama, jeniskelamin, notelp, email, status || 'A', req.params.id]
    );

    const guruid = req.params.id;

    // Manage user login if username is provided
    if (username) {
      const [existingUser] = await pool.query('SELECT userid, username FROM coreuser WHERE guruid = ? LIMIT 1', [guruid]);
      if (existingUser.length) {
        // Update user
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await pool.query(
            `UPDATE coreuser SET username = ?, password = ?, status = ? WHERE guruid = ?`,
            [username, hashedPassword, status || 'A', guruid]
          );
        } else {
          await pool.query(
            `UPDATE coreuser SET username = ?, status = ? WHERE guruid = ?`,
            [username, status || 'A', guruid]
          );
        }
      } else if (password) {
        // Create user
        const [usernameCheck] = await pool.query('SELECT userid FROM coreuser WHERE username = ? LIMIT 1', [username]);
        if (!usernameCheck.length) {
          const [guruRow] = await pool.query('SELECT sekolahid FROM masterguru WHERE guruid = ? LIMIT 1', [guruid]);
          const sekolahid = guruRow[0]?.sekolahid || req.user.sekolahid;
          const hashedPassword = await bcrypt.hash(password, 10);
          await pool.query(
            `INSERT INTO coreuser (sekolahid, username, password, role, guruid, status, createdby)
             VALUES (?, ?, ?, 'guru', ?, 'A', ?)`,
            [sekolahid, username, hashedPassword, guruid, req.user.username]
          );
        }
      }
    }

    return res.json({ success: true, message: 'Guru berhasil diupdate' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
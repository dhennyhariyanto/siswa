const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// List orang tua by sekolah or siswa
router.get('/', auth(), async (req, res) => {
  try {
    const sekolahid = req.query.sekolahid || req.user.sekolahid;
    const { siswaid } = req.query;

    const conditions = ['o.sekolahid = ?'];
    const params = [sekolahid];

    if (siswaid) {
      conditions.push('o.siswaid = ?');
      params.push(siswaid);
    }

    const [rows] = await pool.query(
      `SELECT o.ortuid, o.siswaid, o.sekolahid, o.nama, o.hubungan, o.notelp, o.email, o.status,
              s.nama AS namasiswa, s.kelas
       FROM masterortu o
       LEFT JOIN mastersiswa s ON s.siswaid = o.siswaid
       WHERE ${conditions.join(' AND ')}
       ORDER BY o.nama`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get orang tua detail
router.get('/:id', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.*, u.username 
       FROM masterortu o 
       LEFT JOIN coreuser u ON u.ortuid = o.ortuid
       WHERE o.ortuid = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ success: false, message: 'Orang tua tidak ditemukan' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create orang tua (admin/guru)
router.post('/', auth(['admin', 'guru']), async (req, res) => {
  try {
    const { siswaid, sekolahid, nama, hubungan, notelp, email, username, password } = req.body;
    if (!nama || !siswaid || !sekolahid) {
      return res.status(400).json({ success: false, message: 'Nama, siswaid, dan sekolahid wajib diisi' });
    }

    const [result] = await pool.query(
      `INSERT INTO masterortu (siswaid, sekolahid, nama, hubungan, notelp, email, status, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 'A', ?)`,
      [siswaid, sekolahid, nama, hubungan || null, notelp || null, email || null, req.user.username]
    );

    const ortuid = result.insertId;

    // Create user login if username is provided
    if (username && password) {
      // Check if username already exists
      const [existing] = await pool.query('SELECT userid FROM coreuser WHERE username = ? LIMIT 1', [username]);
      if (existing.length) {
        return res.status(201).json({
          success: true,
          message: 'Orang tua berhasil ditambahkan, namun username login sudah digunakan',
          data: { ortuid }
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        `INSERT INTO coreuser (sekolahid, username, password, role, ortuid, status, createdby)
         VALUES (?, ?, ?, 'ortu', ?, 'A', ?)`,
        [sekolahid, username, hashedPassword, ortuid, req.user.username]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Orang tua berhasil ditambahkan',
      data: { ortuid }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Update orang tua
router.put('/:id', auth(['admin', 'guru']), async (req, res) => {
  try {
    const { siswaid, nama, hubungan, notelp, email, status, username, password } = req.body;
    await pool.query(
      `UPDATE masterortu SET siswaid=?, nama=?, hubungan=?, notelp=?, email=?, status=? WHERE ortuid=?`,
      [siswaid, nama, hubungan, notelp, email, status || 'A', req.params.id]
    );

    const ortuid = req.params.id;

    // Manage user login if username is provided
    if (username) {
      const [existingUser] = await pool.query('SELECT userid, username FROM coreuser WHERE ortuid = ? LIMIT 1', [ortuid]);
      if (existingUser.length) {
        // Update user
        if (password) {
          const hashedPassword = await bcrypt.hash(password, 10);
          await pool.query(
            `UPDATE coreuser SET username = ?, password = ?, status = ? WHERE ortuid = ?`,
            [username, hashedPassword, status || 'A', ortuid]
          );
        } else {
          await pool.query(
            `UPDATE coreuser SET username = ?, status = ? WHERE ortuid = ?`,
            [username, status || 'A', ortuid]
          );
        }
      } else if (password) {
        // Create user
        const [usernameCheck] = await pool.query('SELECT userid FROM coreuser WHERE username = ? LIMIT 1', [username]);
        if (!usernameCheck.length) {
          const [ortuRow] = await pool.query('SELECT sekolahid FROM masterortu WHERE ortuid = ? LIMIT 1', [ortuid]);
          const sekolahid = ortuRow[0]?.sekolahid || req.user.sekolahid;
          const hashedPassword = await bcrypt.hash(password, 10);
          await pool.query(
            `INSERT INTO coreuser (sekolahid, username, password, role, ortuid, status, createdby)
             VALUES (?, ?, ?, 'ortu', ?, 'A', ?)`,
            [sekolahid, username, hashedPassword, ortuid, req.user.username]
          );
        }
      }
    }

    return res.json({ success: true, message: 'Orang tua berhasil diupdate' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
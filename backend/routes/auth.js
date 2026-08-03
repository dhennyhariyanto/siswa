const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password wajib diisi',
      });
    }

    const [rows] = await pool.query(
      `SELECT 
        userid,
        username,
        passwordhash,
        role,
        sekolahid,
        guruid,
        siswaid,
        ortuid,
        status
      FROM coreuser
      WHERE username = ?
      LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      return res.status(401).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    const user = rows[0];

    if (user.status !== 'A') {
      return res.status(403).json({
        success: false,
        message: 'User tidak aktif',
      });
    }

    const valid = await bcrypt.compare(password, user.passwordhash);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Password salah',
      });
    }

    const token = jwt.sign(
      {
        userid: user.userid,
        username: user.username,
        role: user.role,
        sekolahid: user.sekolahid,
        guruid: user.guruid,
        siswaid: user.siswaid,
        ortuid: user.ortuid,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        token,
        user: {
          userid: user.userid,
          username: user.username,
          role: user.role,
          sekolahid: user.sekolahid,
          guruid: user.guruid,
          siswaid: user.siswaid,
          ortuid: user.ortuid,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/me', auth(), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT userid, username, role, sekolahid, guruid, siswaid, ortuid, status
       FROM coreuser
       WHERE userid = ?
       LIMIT 1`,
      [req.user.userid]
    );

    return res.json({
      success: true,
      data: rows[0] || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');

const router = express.Router();

// List notifications for current user / parent / school scope
router.get('/', auth(), async (req, res) => {
  try {
    const conditions = [];
    const params = [];

    if (req.user.role === 'ortu') {
      conditions.push('n.ortuid = ?');
      params.push(req.user.ortuid);
    } else if (req.user.siswaid) {
      conditions.push('n.siswaid = ?');
      params.push(req.user.siswaid);
    } else if (req.user.sekolahid) {
      conditions.push('n.sekolahid = ?');
      params.push(req.user.sekolahid);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await pool.query(
      `SELECT n.notifikasiid, n.sekolahid, n.siswaid, n.ortuid, n.judul, n.pesan, n.tipe,
              n.isread, n.createddate, s.nama AS namasiswa
       FROM corenotifikasi n
       LEFT JOIN mastersiswa s ON s.siswaid = n.siswaid
       ${where}
       ORDER BY n.createddate DESC
       LIMIT 200`,
      params
    );

    return res.json({ success: true, data: rows });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', auth(), async (req, res) => {
  try {
    await pool.query('UPDATE corenotifikasi SET isread = 1 WHERE notifikasiid = ?', [req.params.id]);
    return res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Create notification manually (admin/guru)
// For real online server, connect this route to Firebase Cloud Messaging using FCM_SERVER_KEY.
router.post('/', auth(['admin', 'guru']), async (req, res) => {
  try {
    const { siswaid, ortuid, judul, pesan, tipe } = req.body;
    if (!judul || !pesan) {
      return res.status(400).json({ success: false, message: 'Judul dan pesan wajib diisi' });
    }

    const [result] = await pool.query(
      `INSERT INTO corenotifikasi (sekolahid, siswaid, ortuid, judul, pesan, tipe, isread, createdby)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      [req.user.sekolahid, siswaid || null, ortuid || null, judul, pesan, tipe || 'info', req.user.username]
    );

    return res.status(201).json({
      success: true,
      message: 'Notifikasi berhasil dibuat',
      data: { notifikasiid: result.insertId },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
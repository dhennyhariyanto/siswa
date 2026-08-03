require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const authRoutes = require('./routes/auth');
const sekolahRoutes = require('./routes/sekolah');
const guruRoutes = require('./routes/guru');
const siswaRoutes = require('./routes/siswa');
const absensiRoutes = require('./routes/absensi');
const notifikasiRoutes = require('./routes/notifikasi');
const laporanRoutes = require('./routes/laporan');

const app = express();
const port = process.env.PORT || 3000;

const ensureDir = dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

ensureDir(path.join(__dirname, 'storage'));
ensureDir(path.join(__dirname, 'storage', 'uploads'));
ensureDir(path.join(__dirname, 'storage', 'photos'));
ensureDir(path.join(__dirname, 'python'));
ensureDir(path.join(__dirname, 'database'));

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use('/storage', express.static(path.join(__dirname, 'storage')));

app.get('/', (req, res) => {
  res.json({
    app: 'Siswa Absensi API',
    status: 'running',
    version: '1.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/sekolah', sekolahRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/siswa', siswaRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/notifikasi', notifikasiRoutes);
app.use('/api/laporan', laporanRoutes);

app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Siswa Absensi API running on http://localhost:${port}`);
  });
}

module.exports = app;

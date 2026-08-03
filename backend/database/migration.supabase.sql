-- ================================================================
-- Database Schema: siswa_absensi (Supabase / PostgreSQL)
-- Pattern: ERP naming (master*, transaksi*, core*)
-- ================================================================

-- ----------------------------------------------------------------
-- mastersekolah
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mastersekolah (
    sekolahid     SERIAL PRIMARY KEY,
    nama          VARCHAR(150) NOT NULL,
    alamat        TEXT NULL,
    notelp        VARCHAR(30) NULL,
    email         VARCHAR(100) NULL,
    website       VARCHAR(150) NULL,
    logopath      VARCHAR(255) NULL,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedby    VARCHAR(50) NULL,
    modifieddate  TIMESTAMP NULL
);

-- ----------------------------------------------------------------
-- masterguru
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS masterguru (
    guruid        SERIAL PRIMARY KEY,
    sekolahid     INT NOT NULL,
    nip           VARCHAR(30) NULL,
    nama          VARCHAR(100) NOT NULL,
    jeniskelamin  CHAR(1) NULL,
    notelp        VARCHAR(30) NULL,
    email         VARCHAR(100) NULL,
    foto          VARCHAR(255) NULL,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedby    VARCHAR(50) NULL,
    modifieddate  TIMESTAMP NULL,
    CONSTRAINT FK_masterguru_mastersekolah FOREIGN KEY (sekolahid) REFERENCES mastersekolah(sekolahid)
);

-- ----------------------------------------------------------------
-- mastersiswa
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mastersiswa (
    siswaid       SERIAL PRIMARY KEY,
    sekolahid     INT NOT NULL,
    nisn          VARCHAR(20) NULL,
    nama          VARCHAR(100) NOT NULL,
    jeniskelamin  CHAR(1) NULL,
    kelas         VARCHAR(20) NULL,
    notelportu    VARCHAR(30) NULL,
    foto          VARCHAR(255) NULL,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedby    VARCHAR(50) NULL,
    modifieddate  TIMESTAMP NULL,
    CONSTRAINT FK_mastersiswa_mastersekolah FOREIGN KEY (sekolahid) REFERENCES mastersekolah(sekolahid)
);

-- ----------------------------------------------------------------
-- masterortu
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS masterortu (
    ortuid        SERIAL PRIMARY KEY,
    siswaid       INT NOT NULL,
    sekolahid     INT NOT NULL,
    nama          VARCHAR(100) NOT NULL,
    hubungan      VARCHAR(20) NULL,
    notelp        VARCHAR(30) NULL,
    email         VARCHAR(100) NULL,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_masterortu_mastersiswa FOREIGN KEY (siswaid) REFERENCES mastersiswa(siswaid),
    CONSTRAINT FK_masterortu_mastersekolah FOREIGN KEY (sekolahid) REFERENCES mastersekolah(sekolahid)
);

-- ----------------------------------------------------------------
-- coreuser
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coreuser (
    userid        SERIAL PRIMARY KEY,
    sekolahid     INT NULL,
    username      VARCHAR(60) NOT NULL,
    password      VARCHAR(255) NOT NULL,
    role          VARCHAR(10) NOT NULL,
    guruid        INT NULL,
    siswaid       INT NULL,
    ortuid        INT NULL,
    fcmtoken      VARCHAR(255) NULL,
    lastlogin     TIMESTAMP NULL,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedby    VARCHAR(50) NULL,
    modifieddate  TIMESTAMP NULL,
    CONSTRAINT UQ_coreuser_username UNIQUE (username),
    CONSTRAINT CK_coreuser_role CHECK (role IN ('admin','guru','siswa','ortu')),
    CONSTRAINT FK_coreuser_mastersekolah FOREIGN KEY (sekolahid) REFERENCES mastersekolah(sekolahid),
    CONSTRAINT FK_coreuser_masterguru FOREIGN KEY (guruid) REFERENCES masterguru(guruid),
    CONSTRAINT FK_coreuser_mastersiswa FOREIGN KEY (siswaid) REFERENCES mastersiswa(siswaid),
    CONSTRAINT FK_coreuser_masterortu FOREIGN KEY (ortuid) REFERENCES masterortu(ortuid)
);

-- ----------------------------------------------------------------
-- facedata
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facedata (
    facedataid    SERIAL PRIMARY KEY,
    siswaid       INT NULL,
    guruid        INT NULL,
    sekolahid     INT NULL,
    fotopath      VARCHAR(255) NOT NULL,
    label         VARCHAR(80) NOT NULL,
    istrained     BOOLEAN NOT NULL DEFAULT FALSE,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_facedata_mastersiswa FOREIGN KEY (siswaid) REFERENCES mastersiswa(siswaid),
    CONSTRAINT FK_facedata_masterguru FOREIGN KEY (guruid) REFERENCES masterguru(guruid),
    CONSTRAINT FK_facedata_mastersekolah FOREIGN KEY (sekolahid) REFERENCES mastersekolah(sekolahid)
);

-- ----------------------------------------------------------------
-- transaksipresensi
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaksipresensi (
    presensiid    SERIAL PRIMARY KEY,
    sekolahid     INT NOT NULL,
    siswaid       INT NULL,
    guruid        INT NULL,
    tanggal       DATE NOT NULL,
    jammasuk      TIME NULL,
    jampulang     TIME NULL,
    statusmasuk   VARCHAR(20) NOT NULL DEFAULT 'hadir',
    statuskeluar  VARCHAR(20) NULL,
    verifikasi    VARCHAR(20) NOT NULL DEFAULT 'manual',
    keterangan    VARCHAR(255) NULL,
    lokasilat     DECIMAL(10,7) NULL,
    lokasilng     DECIMAL(10,7) NULL,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedby    VARCHAR(50) NULL,
    modifieddate  TIMESTAMP NULL,
    CONSTRAINT CK_transaksipresensi_statusmasuk CHECK (statusmasuk IN ('hadir','terlambat','izin','sakit','alpa')),
    CONSTRAINT CK_transaksipresensi_statuskeluar CHECK (statuskeluar IS NULL OR statuskeluar IN ('hadir','lebih awal','tidak hadir')),
    CONSTRAINT CK_transaksipresensi_verifikasi CHECK (verifikasi IN ('face','manual','qr','gps')),
    CONSTRAINT FK_transaksipresensi_mastersekolah FOREIGN KEY (sekolahid) REFERENCES mastersekolah(sekolahid),
    CONSTRAINT FK_transaksipresensi_mastersiswa FOREIGN KEY (siswaid) REFERENCES mastersiswa(siswaid),
    CONSTRAINT FK_transaksipresensi_masterguru FOREIGN KEY (guruid) REFERENCES masterguru(guruid)
);

CREATE INDEX IF NOT EXISTS IX_transaksipresensi_tanggal ON transaksipresensi(tanggal);
CREATE INDEX IF NOT EXISTS IX_transaksipresensi_siswa_tanggal ON transaksipresensi(siswaid, tanggal);

-- ----------------------------------------------------------------
-- corenotifikasi
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS corenotifikasi (
    notifikasiid  SERIAL PRIMARY KEY,
    sekolahid     INT NOT NULL,
    siswaid       INT NULL,
    ortuid        INT NULL,
    judul         VARCHAR(150) NOT NULL,
    pesan         TEXT NOT NULL,
    tipe          VARCHAR(20) NOT NULL DEFAULT 'info',
    isread        BOOLEAN NOT NULL DEFAULT FALSE,
    sentat        TIMESTAMP NULL,
    status        CHAR(1) NOT NULL DEFAULT 'A',
    createdby     VARCHAR(50) NOT NULL,
    createddate   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT CK_corenotifikasi_tipe CHECK (tipe IN ('presensi','info','peringatan')),
    CONSTRAINT FK_corenotifikasi_mastersekolah FOREIGN KEY (sekolahid) REFERENCES mastersekolah(sekolahid),
    CONSTRAINT FK_corenotifikasi_mastersiswa FOREIGN KEY (siswaid) REFERENCES mastersiswa(siswaid),
    CONSTRAINT FK_corenotifikasi_masterortu FOREIGN KEY (ortuid) REFERENCES masterortu(ortuid)
);

-- ----------------------------------------------------------------
-- Seed data
-- ----------------------------------------------------------------
INSERT INTO mastersekolah (sekolahid, nama, alamat, createdby, status)
VALUES (1, 'SD/SMP/SMA Contoh', 'Jl. Contoh No. 1', 'system', 'A')
ON CONFLICT (sekolahid) DO NOTHING;

-- Synchronize sequence
SELECT setval('mastersekolah_sekolahid_seq', COALESCE((SELECT MAX(sekolahid)+1 FROM mastersekolah), 1), false);

INSERT INTO coreuser (username, password, role, sekolahid, createdby, status)
VALUES (
    'admin',
    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu',
    'admin',
    1,
    'system',
    'A'
)
ON CONFLICT (username) DO NOTHING;
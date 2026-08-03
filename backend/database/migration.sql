-- ================================================================
-- Database Schema: siswa_absensi
-- Pattern: ERP naming (master*, transaksi*, core*)
-- SQL Server / T-SQL
-- ================================================================

IF DB_ID(N'siswa_absensi') IS NULL
BEGIN
    CREATE DATABASE siswa_absensi;
END;
GO

USE siswa_absensi;
GO

-- ----------------------------------------------------------------
-- mastersekolah
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.mastersekolah', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.mastersekolah (
        sekolahid     INT IDENTITY(1,1) PRIMARY KEY,
        nama          VARCHAR(150) NOT NULL,
        alamat        VARCHAR(MAX) NULL,
        notelp        VARCHAR(30) NULL,
        email         VARCHAR(100) NULL,
        website       VARCHAR(150) NULL,
        logopath      VARCHAR(255) NULL,
        status        CHAR(1) NOT NULL CONSTRAINT DF_mastersekolah_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_mastersekolah_createddate DEFAULT GETDATE(),
        modifiedby    VARCHAR(50) NULL,
        modifieddate  DATETIME NULL
    );
END;
GO

-- ----------------------------------------------------------------
-- masterguru
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.masterguru', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.masterguru (
        guruid        INT IDENTITY(1,1) PRIMARY KEY,
        sekolahid     INT NOT NULL,
        nip           VARCHAR(30) NULL,
        nama          VARCHAR(100) NOT NULL,
        jeniskelamin  CHAR(1) NULL,
        notelp        VARCHAR(30) NULL,
        email         VARCHAR(100) NULL,
        foto          VARCHAR(255) NULL,
        status        CHAR(1) NOT NULL CONSTRAINT DF_masterguru_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_masterguru_createddate DEFAULT GETDATE(),
        modifiedby    VARCHAR(50) NULL,
        modifieddate  DATETIME NULL,
        CONSTRAINT FK_masterguru_mastersekolah FOREIGN KEY (sekolahid) REFERENCES dbo.mastersekolah(sekolahid)
    );
END;
GO

-- ----------------------------------------------------------------
-- mastersiswa
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.mastersiswa', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.mastersiswa (
        siswaid       INT IDENTITY(1,1) PRIMARY KEY,
        sekolahid     INT NOT NULL,
        nisn          VARCHAR(20) NULL,
        nama          VARCHAR(100) NOT NULL,
        jeniskelamin  CHAR(1) NULL,
        kelas         VARCHAR(20) NULL,
        notelportu    VARCHAR(30) NULL,
        foto          VARCHAR(255) NULL,
        status        CHAR(1) NOT NULL CONSTRAINT DF_mastersiswa_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_mastersiswa_createddate DEFAULT GETDATE(),
        modifiedby    VARCHAR(50) NULL,
        modifieddate  DATETIME NULL,
        CONSTRAINT FK_mastersiswa_mastersekolah FOREIGN KEY (sekolahid) REFERENCES dbo.mastersekolah(sekolahid)
    );
END;
GO

-- ----------------------------------------------------------------
-- masterortu
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.masterortu', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.masterortu (
        ortuid        INT IDENTITY(1,1) PRIMARY KEY,
        siswaid       INT NOT NULL,
        sekolahid     INT NOT NULL,
        nama          VARCHAR(100) NOT NULL,
        hubungan      VARCHAR(20) NULL,
        notelp        VARCHAR(30) NULL,
        email         VARCHAR(100) NULL,
        status        CHAR(1) NOT NULL CONSTRAINT DF_masterortu_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_masterortu_createddate DEFAULT GETDATE(),
        CONSTRAINT FK_masterortu_mastersiswa FOREIGN KEY (siswaid) REFERENCES dbo.mastersiswa(siswaid),
        CONSTRAINT FK_masterortu_mastersekolah FOREIGN KEY (sekolahid) REFERENCES dbo.mastersekolah(sekolahid)
    );
END;
GO

-- ----------------------------------------------------------------
-- coreuser
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.coreuser', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.coreuser (
        userid        INT IDENTITY(1,1) PRIMARY KEY,
        sekolahid     INT NULL,
        username      VARCHAR(60) NOT NULL,
        [password]    VARCHAR(255) NOT NULL,
        [role]        VARCHAR(10) NOT NULL,
        guruid        INT NULL,
        siswaid       INT NULL,
        ortuid        INT NULL,
        fcmtoken      VARCHAR(255) NULL,
        lastlogin     DATETIME NULL,
        status        CHAR(1) NOT NULL CONSTRAINT DF_coreuser_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_coreuser_createddate DEFAULT GETDATE(),
        modifiedby    VARCHAR(50) NULL,
        modifieddate  DATETIME NULL,
        CONSTRAINT UQ_coreuser_username UNIQUE (username),
        CONSTRAINT CK_coreuser_role CHECK ([role] IN ('admin','guru','siswa','ortu')),
        CONSTRAINT FK_coreuser_mastersekolah FOREIGN KEY (sekolahid) REFERENCES dbo.mastersekolah(sekolahid),
        CONSTRAINT FK_coreuser_masterguru FOREIGN KEY (guruid) REFERENCES dbo.masterguru(guruid),
        CONSTRAINT FK_coreuser_mastersiswa FOREIGN KEY (siswaid) REFERENCES dbo.mastersiswa(siswaid),
        CONSTRAINT FK_coreuser_masterortu FOREIGN KEY (ortuid) REFERENCES dbo.masterortu(ortuid)
    );
END;
GO

-- ----------------------------------------------------------------
-- facedata
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.facedata', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.facedata (
        facedataid    INT IDENTITY(1,1) PRIMARY KEY,
        siswaid       INT NULL,
        guruid        INT NULL,
        sekolahid     INT NULL,
        fotopath      VARCHAR(255) NOT NULL,
        [label]       VARCHAR(80) NOT NULL,
        istrained     BIT NOT NULL CONSTRAINT DF_facedata_istrained DEFAULT 0,
        status        CHAR(1) NOT NULL CONSTRAINT DF_facedata_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_facedata_createddate DEFAULT GETDATE(),
        CONSTRAINT FK_facedata_mastersiswa FOREIGN KEY (siswaid) REFERENCES dbo.mastersiswa(siswaid),
        CONSTRAINT FK_facedata_masterguru FOREIGN KEY (guruid) REFERENCES dbo.masterguru(guruid),
        CONSTRAINT FK_facedata_mastersekolah FOREIGN KEY (sekolahid) REFERENCES dbo.mastersekolah(sekolahid)
    );
END;
GO

-- ----------------------------------------------------------------
-- transaksipresensi
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.transaksipresensi', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.transaksipresensi (
        presensiid    INT IDENTITY(1,1) PRIMARY KEY,
        sekolahid     INT NOT NULL,
        siswaid       INT NULL,
        guruid        INT NULL,
        tanggal       DATE NOT NULL,
        jammasuk      TIME NULL,
        jampulang     TIME NULL,
        statusmasuk   VARCHAR(20) NOT NULL CONSTRAINT DF_transaksipresensi_statusmasuk DEFAULT 'hadir',
        statuskeluar  VARCHAR(20) NULL,
        verifikasi    VARCHAR(20) NOT NULL CONSTRAINT DF_transaksipresensi_verifikasi DEFAULT 'manual',
        keterangan    VARCHAR(255) NULL,
        lokasilat     DECIMAL(10,7) NULL,
        lokasilng     DECIMAL(10,7) NULL,
        status        CHAR(1) NOT NULL CONSTRAINT DF_transaksipresensi_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_transaksipresensi_createddate DEFAULT GETDATE(),
        modifiedby    VARCHAR(50) NULL,
        modifieddate  DATETIME NULL,
        CONSTRAINT CK_transaksipresensi_statusmasuk CHECK (statusmasuk IN ('hadir','terlambat','izin','sakit','alpa')),
        CONSTRAINT CK_transaksipresensi_statuskeluar CHECK (statuskeluar IS NULL OR statuskeluar IN ('hadir','lebih awal','tidak hadir')),
        CONSTRAINT CK_transaksipresensi_verifikasi CHECK (verifikasi IN ('face','manual','qr','gps')),
        CONSTRAINT FK_transaksipresensi_mastersekolah FOREIGN KEY (sekolahid) REFERENCES dbo.mastersekolah(sekolahid),
        CONSTRAINT FK_transaksipresensi_mastersiswa FOREIGN KEY (siswaid) REFERENCES dbo.mastersiswa(siswaid),
        CONSTRAINT FK_transaksipresensi_masterguru FOREIGN KEY (guruid) REFERENCES dbo.masterguru(guruid)
    );

    CREATE INDEX IX_transaksipresensi_tanggal ON dbo.transaksipresensi(tanggal);
    CREATE INDEX IX_transaksipresensi_siswa_tanggal ON dbo.transaksipresensi(siswaid, tanggal);
END;
GO

-- ----------------------------------------------------------------
-- corenotifikasi
-- ----------------------------------------------------------------
IF OBJECT_ID(N'dbo.corenotifikasi', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.corenotifikasi (
        notifikasiid  INT IDENTITY(1,1) PRIMARY KEY,
        sekolahid     INT NOT NULL,
        siswaid       INT NULL,
        ortuid        INT NULL,
        judul         VARCHAR(150) NOT NULL,
        pesan         VARCHAR(MAX) NOT NULL,
        tipe          VARCHAR(20) NOT NULL CONSTRAINT DF_corenotifikasi_tipe DEFAULT 'info',
        isread        BIT NOT NULL CONSTRAINT DF_corenotifikasi_isread DEFAULT 0,
        sentat        DATETIME NULL,
        status        CHAR(1) NOT NULL CONSTRAINT DF_corenotifikasi_status DEFAULT 'A',
        createdby     VARCHAR(50) NOT NULL,
        createddate   DATETIME NOT NULL CONSTRAINT DF_corenotifikasi_createddate DEFAULT GETDATE(),
        CONSTRAINT CK_corenotifikasi_tipe CHECK (tipe IN ('presensi','info','peringatan')),
        CONSTRAINT FK_corenotifikasi_mastersekolah FOREIGN KEY (sekolahid) REFERENCES dbo.mastersekolah(sekolahid),
        CONSTRAINT FK_corenotifikasi_mastersiswa FOREIGN KEY (siswaid) REFERENCES dbo.mastersiswa(siswaid),
        CONSTRAINT FK_corenotifikasi_masterortu FOREIGN KEY (ortuid) REFERENCES dbo.masterortu(ortuid)
    );
END;
GO

-- ----------------------------------------------------------------
-- Seed default sekolah
-- ----------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.mastersekolah WHERE sekolahid = 1)
BEGIN
    SET IDENTITY_INSERT dbo.mastersekolah ON;

    INSERT INTO dbo.mastersekolah (sekolahid, nama, alamat, createdby, createddate, status)
    VALUES (1, 'SD/SMP/SMA Contoh', 'Jl. Contoh No. 1', 'system', GETDATE(), 'A');

    SET IDENTITY_INSERT dbo.mastersekolah OFF;
END;
GO

-- ----------------------------------------------------------------
-- Seed default admin user
-- password: admin123
-- bcrypt hash
-- ----------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.coreuser WHERE username = 'admin')
BEGIN
    INSERT INTO dbo.coreuser (username, [password], [role], sekolahid, createdby, createddate, status)
    VALUES (
        'admin',
        '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWu',
        'admin',
        1,
        'system',
        GETDATE(),
        'A'
    );
END;
GO
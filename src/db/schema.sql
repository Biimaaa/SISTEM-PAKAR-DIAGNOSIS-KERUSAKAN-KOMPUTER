-- Skema database Sistem Pakar Diagnosis Kerusakan Laptop dan PC
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS kerusakan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  solusi TEXT NOT NULL,
  jenis_perangkat TEXT NOT NULL DEFAULT 'semua'
    CHECK (jenis_perangkat IN ('semua', 'laptop'))
);

CREATE TABLE IF NOT EXISTS gejala (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL,
  jenis_perangkat TEXT NOT NULL DEFAULT 'semua'
    CHECK (jenis_perangkat IN ('semua', 'laptop')),
  kategori TEXT NOT NULL DEFAULT 'Lainnya'
);

CREATE TABLE IF NOT EXISTS diagnostik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  nama TEXT NOT NULL
);

-- Pemetaan kelompok diagnostik ke kemungkinan kerusakan (untuk tampilan tahap 1)
CREATE TABLE IF NOT EXISTS diagnostik_kerusakan (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_diagnostik INTEGER NOT NULL REFERENCES diagnostik(id) ON DELETE CASCADE,
  id_kerusakan INTEGER NOT NULL REFERENCES kerusakan(id) ON DELETE CASCADE,
  UNIQUE (id_diagnostik, id_kerusakan)
);

CREATE TABLE IF NOT EXISTS aturan_diagnostik (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  kondisi_json TEXT NOT NULL,
  id_diagnostik INTEGER NOT NULL REFERENCES diagnostik(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS aturan_cf (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kode TEXT NOT NULL UNIQUE,
  id_gejala INTEGER NOT NULL REFERENCES gejala(id) ON DELETE CASCADE,
  id_kerusakan INTEGER NOT NULL REFERENCES kerusakan(id) ON DELETE CASCADE,
  cf_pakar REAL NOT NULL CHECK (cf_pakar >= 0 AND cf_pakar <= 1),
  UNIQUE (id_gejala, id_kerusakan)
);

CREATE TABLE IF NOT EXISTS diagnosis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT NOT NULL,
  jenis_perangkat TEXT NOT NULL,
  hasil_utama TEXT,
  cf_hasil REAL NOT NULL DEFAULT 0,
  hasil_json TEXT
);

CREATE TABLE IF NOT EXISTS diagnosis_detail (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  id_diagnosis INTEGER NOT NULL REFERENCES diagnosis(id) ON DELETE CASCADE,
  id_gejala INTEGER NOT NULL REFERENCES gejala(id) ON DELETE CASCADE,
  cf_user REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL
);

-- Index untuk query yang sering dipakai
CREATE INDEX IF NOT EXISTS idx_gejala_perangkat ON gejala(jenis_perangkat);
CREATE INDEX IF NOT EXISTS idx_kerusakan_perangkat ON kerusakan(jenis_perangkat);
CREATE INDEX IF NOT EXISTS idx_aturan_cf_gejala ON aturan_cf(id_gejala);
CREATE INDEX IF NOT EXISTS idx_aturan_cf_kerusakan ON aturan_cf(id_kerusakan);
CREATE INDEX IF NOT EXISTS idx_aturan_diag_diagnostik ON aturan_diagnostik(id_diagnostik);
CREATE INDEX IF NOT EXISTS idx_diagnosis_tanggal ON diagnosis(tanggal);
CREATE INDEX IF NOT EXISTS idx_detail_diagnosis ON diagnosis_detail(id_diagnosis);
CREATE INDEX IF NOT EXISTS idx_detail_gejala ON diagnosis_detail(id_gejala);

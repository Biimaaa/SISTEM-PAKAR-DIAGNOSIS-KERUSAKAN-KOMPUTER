# Changelog

## Versi 2.0.0

### Ditambah
- Basis pengetahuan diperluas: 15 -> 35 gejala (G01-G35 dengan kolom kategori),
  10 -> 16 kerusakan (K01-K16, tema baru: keyboard/touchpad, port USB, audio,
  WiFi, baterai CMOS, engsel/kabel fleksibel), 6 -> 7 diagnostik (D07 periferal dan konektivitas),
  8 -> 16 aturan diagnostik (A01-A16), dan 20 -> 44 aturan CF (R01-R44).
- `npm run seed:update`: migrasi idempoten versi 1 -> versi 2. Memakai
  `INSERT ... ON CONFLICT(kode) DO UPDATE` untuk data master berbasis `kode`,
  menambahkan kolom `gejala.kategori` bila belum ada, tidak menyentuh tabel
  `admin`, `diagnosis`, `diagnosis_detail`, dan `pengaturan`. Bobot CF hasil
  perubahan admin tidak ditimpa; opsi `--reset-bobot` tersedia secara eksplisit
  (default MATI).
- `src/db/data_v1.js` dan `src/db/data_v2.js`: snapshot master data yang
  memisahkan isi seed dari logika penulisan database.
- Form gejala dikelompokkan per kategori (accordion Bootstrap), dilengkapi
  pencarian gejala instan (JavaScript murni) dan penghitung gejala terpilih.
- Halaman hasil menampilkan 5 kerusakan teratas dengan tombol "Tampilkan semua".
- CRUD admin untuk gejala kini memuat field kategori; tabel kerusakan sudah
  sejak v1 menyertakan jenis perangkat. statistik dashboard diperbarui
  (gejala, kerusakan, diagnostik, aturan tahap 1 + tahap 2, diagnosis).
- Test otomatis diperluas menjadi 12: 9 skenario inferensi (S01-S09), test
  integritas basis pengetahuan versi 2, dan 2 test migrasi (idempotensi dan
  opsi --reset-bobot).
- `CHANGELOG.md` (file ini).

### Diubah
- `src/db/schema.sql`: kolom `gejala.kategori` (`TEXT NOT NULL DEFAULT 'Lainnya'`)
  dan index `idx_gejala_kategori`. Pada database lama, kolom ditambahkan lewat
  `terapkanSkema()` dengan pengecekan agar tidak error saat dijalankan dua kali.
- `src/views/tentang.ejs`: angka cakupan diperbarui (35 gejala, 7 diagnostik,
  16 kerusakan, 60 aturan).
- `src/views/admin/dashboard.ejs`: kartu statistik 5 item.
- README diperbarui: panduan pembaruan proyek lama (`seed:update`), kategori
  gejala, dan catatan validasi bobot pakar.

### Tidak Diubah
- Mesin inferensi (`src/engine/inference.js`): rumus CF dan forward chaining tetap.
- Skema tabel lain, semua rute, halaman, dan fitur keamanan v1 tetap.

## Versi 1.0.0

### Ditambah
- Aplikasi web sistem pakar diagnosis kerusakan laptop dan PC dengan Forward
  Chaining + Certainty Factor (Node.js, Express, SQLite/ better-sqlite3, EJS,
  Bootstrap 5, PDFKit, DataTables, Chart.js).
- Basis pengetahuan awal: 15 gejala, 6 diagnostik, 10 kerusakan, 8 aturan
  diagnostik, 20 aturan CF.
- CRUD pakar melalui panel admin berbasis session + bcrypt + CSRF; riwayat
  diagnosis dengan DataTables; PDF hasil diagnosis; halaman metodologi.
- Test otomatis v1: 6 skenario (S01-S06) dengan `node:test`.

# Sistem Pakar Diagnosis Kerusakan Laptop dan PC

Aplikasi web berbasis aturan (*rule-based expert system*) untuk membantu pengguna melakukan diagnosis awal kerusakan laptop dan PC. Pengguna memilih gejala yang dialami beserta tingkat keyakinannya, lalu sistem menentukan kelompok masalah dengan **Forward Chaining** dan menghitung persentase keyakinan setiap kemungkinan kerusakan menggunakan **Certainty Factor (CF)**.

Aplikasi juga menyediakan panel admin untuk mengelola seluruh basis pengetahuan (gejala, kerusakan, diagnostik, aturan), melihat statistik diagnosis, mengatur ambang CF, dan mengganti kata sandi admin.

| Informasi | Keterangan |
| --- | --- |
| Nama proyek | Sistem Pakar Diagnosis Kerusakan Laptop dan PC |
| Versi | 2.0.0 |
| Jenis aplikasi | Web application (server-side rendering) |
| Metode | Forward Chaining + Certainty Factor |
| Bahasa | JavaScript (Node.js) |
| Lisensi | MIT |
| Status | Tugas kuliah / proyek pembelajaran |

---

## Daftar Isi

1. [Ringkasan Proyek](#ringkasan-proyek)
2. [Tujuan dan Manfaat](#tujuan-dan-manfaat)
3. [Fitur Utama](#fitur-utama)
4. [Metode Inferensi](#metode-inferensi)
5. [Arsitektur Sistem](#arsitektur-sistem)
6. [Teknologi yang Digunakan](#teknologi-yang-digunakan)
7. [Struktur Direktori](#struktur-direktori)
8. [Basis Pengetahuan](#basis-pengetahuan)
9. [Alur Penggunaan Diagnosis](#alur-penggunaan-diagnosis)
10. [Skema Database](#skema-database)
11. [Daftar Rute HTTP](#daftar-rute-http)
12. [Keamanan](#keamanan)
13. [Instalasi dan Konfigurasi](#instalasi-dan-konfigurasi)
14. [Menjalankan Aplikasi](#menjalankan-aplikasi)
15. [Seed dan Migrasi Data](#seed-dan-migrasi-data)
16. [Pengujian](#pengujian)
17. [Batasan Sistem](#batasan-sistem)
18. [Riwayat Versi](#riwayat-versi)
19. [Lisensi](#lisensi)

---

## Ringkasan Proyek

Sistem pakar ini meniru cara seorang teknisi mempersempit kemungkinan kerusakan komputer berdasarkan gejala yang teramati. Prosesnya dibagi menjadi dua tahap:

1. **Forward Chaining (tahap 1)** — fakta berupa gejala yang dipilih dicocokkan dengan aturan diagnostik. Jika kondisinya terpenuhi, sistem menyimpulkan kelompok masalah yang aktif (misalnya masalah memori atau masalah penyimpanan).
2. **Certainty Factor (tahap 2)** — setiap pasangan gejala–kerusakan memiliki bobot keyakinan pakar. Bobot tersebut dikalikan dengan keyakinan pengguna, lalu digabungkan berurutan untuk menghasilkan nilai keyakinan akhir per kerusakan. Nilai di bawah ambang tidak ditampilkan.

Hasil diagnosis memuat kemungkinan utama, peringkat kerusakan, gejala pendukung, langkah perhitungan CF, deskripsi kerusakan, saran penanganan, serta dapat diunduh sebagai PDF.

---

## Tujuan dan Manfaat

- Membantu pengguna non-teknis mengenali kemungkinan kerusakan laptop/PC sejak dini.
- Memberikan rekomendasi penanganan awal yang aman sebelum membawa perangkat ke teknisi.
- Menyediakan penjelasan perhitungan yang transparan sehingga hasil dapat dipelajari dan diaudit.
- Menyediakan basis pengetahuan yang dapat dikelola dan diperluas oleh admin/pakar tanpa mengubah kode.
- Menjadi media pembelajaran penerapan sistem pakar (Forward Chaining dan Certainty Factor) dalam aplikasi nyata.

---

## Fitur Utama

### Fitur Pengguna (Publik)

- **Beranda** dengan penjelasan metode dan statistik basis pengetahuan secara langsung dari database.
- **Pemilihan jenis perangkat** (Laptop atau PC/Desktop); daftar gejala dan kerusakan menyesuaikan perangkat.
- **Form gejala** yang dikelompokkan per kategori dalam akordeon, dilengkapi:
  - pencarian gejala instan (JavaScript murni),
  - penghitung jumlah gejala terpilih,
  - tombol buka semua kelompok,
  - pemilihan tingkat keyakinan CF per gejala.
- **Perhitungan dua tahap** (Forward Chaining + Certainty Factor) secara otomatis di server.
- **Halaman hasil** berisi:
  - dugaan kelompok masalah beserta aturan yang aktif,
  - peringkat kerusakan berdasarkan CF,
  - tampilan 5 kerusakan teratas dengan tombol "Tampilkan semua",
  - tabel gejala pendukung (CF pakar, CF user, CF gejala),
  - langkah perhitungan CF yang dapat dibuka,
  - deskripsi kerusakan dan saran penanganan,
  - label khusus untuk kerusakan yang hanya berlaku pada laptop.
- **Unduh hasil diagnosis sebagai PDF** (dibuat dengan PDFKit).
- **Riwayat diagnosis publik** (maksimal 200 diagnosis terbaru).
- **Halaman Tentang** yang menjelaskan metode, rumus, cakupan data, dan batasan sistem.
- **Halaman error 403, 404, dan 500** yang ramah pengguna.

### Fitur Admin

- **Login admin** berbasis session dengan kata sandi ter-hash bcrypt.
- **Dashboard** berisi statistik basis pengetahuan, grafik kerusakan yang paling sering terdiagnosis (Chart.js), dan daftar diagnosis terbaru.
- **CRUD Gejala** (kode, nama, jenis perangkat, kategori).
- **CRUD Kerusakan** (kode, nama, deskripsi, solusi, jenis perangkat).
- **CRUD Diagnostik** beserta **pemetaan diagnostik → kerusakan**.
- **CRUD Aturan Diagnostik** (kondisi AND/OR atas kode gejala).
- **CRUD Aturan CF** (pasangan gejala–kerusakan dan bobot `cf_pakar` 0–1) dengan pencegahan duplikasi pasangan.
- **Riwayat diagnosis** dengan DataTables (pencarian, pagination, pengurutan).
- **Pengaturan** ambang CF dan penggantian kata sandi admin.
- **Sinkronisasi otomatis** kode gejala pada aturan diagnostik ketika kode gejala diubah/dihapus.
- **Sinkronisasi kode kerusakan** pada riwayat diagnosis ketika kode kerusakan diubah.
- **Flash message** untuk umpan balik setiap aksi.

---

## Metode Inferensi

### 1. Forward Chaining

Forward Chaining bekerja dari fakta menuju kesimpulan. Fakta berupa himpunan kode gejala yang dipilih pengguna, misalnya `{G02, G03}`. Setiap aturan diagnostik memiliki kondisi berbentuk:

```json
{ "operator": "OR", "gejala": ["G07", "G08", "G11"] }
```

Evaluasi kondisi:

- **AND** — semua kode gejala pada kondisi harus ada pada himpunan fakta.
- **OR** — minimal satu kode gejala pada kondisi harus ada.

Aturan yang terpenuhi menghasilkan **kelompok diagnostik aktif** (misalnya `D02 - Masalah memori`). Kelompok ini kemudian dipetakan ke kemungkinan kerusakan melalui tabel `diagnostik_kerusakan` sebagai "dugaan awal".

### 2. Certainty Factor

Rumus yang dipakai:

```text
CF(gejala)   = CF pakar × CF user
CF gabungan  = CF lama + CF baru × (1 - CF lama)
Persentase   = CF akhir × 100%
```

Keterangan:

- **CF pakar** adalah bobot keyakinan pakar terhadap aturan gejala → kerusakan (0 sampai 1), tersimpan di kolom `aturan_cf.cf_pakar`.
- **CF user** adalah keyakinan pengguna terhadap gejala.
- Penggabungan dilakukan berurutan untuk semua aturan CF yang cocok pada kerusakan yang sama.
- Hasil akhir hanya ditampilkan jika `CF akhir >= ambang` (default `0,2`).

Pilihan CF user:

| Pilihan | Nilai CF |
| --- | ---: |
| Tidak tahu | 0,0 |
| Sedikit yakin | 0,4 |
| Cukup yakin | 0,6 |
| Yakin | 0,8 |
| Sangat yakin | 1,0 |

Gejala dengan nilai CF user `0,0` tidak dihitung. Diagnostik dibatasi juga oleh `jenis_perangkat`; kerusakan khusus laptop (misalnya baterai/charger dan layar) tidak diproses saat pengguna memilih PC.

**Contoh perhitungan** (skenario S01 pada test):

- G02 "Menyala tetapi layar hitam" dengan CF user 0,8; aturan R01 (G02 → K01) bernilai 0,6.
- G03 "Bunyi beep berulang" dengan CF user 1,0; aturan R02 (G03 → K01) bernilai 0,8.

```text
CF(G02) = 0,6 × 0,8 = 0,48
CF(G03) = 0,8 × 1,0 = 0,80
CF gabungan = 0,48 + 0,80 × (1 - 0,48) = 0,896
Persentase K01 = 89,6%
```

### Ambang CF

Ambang default adalah `0,2` dan disimpan pada tabel `pengaturan` dengan kunci `ambang_cf`. Admin dapat mengubahnya melalui menu **Pengaturan**. Nilai kerusakan di bawah ambang tidak ditampilkan pada halaman hasil.

---

## Arsitektur Sistem

Aplikasi menggunakan pola sederhana **route → service/pengetahuan → engine → view**:

```text
Browser
   │
   ▼
Express (src/app.js)
   ├── Session + flash + locals (tahun, adminUser, formatter)
   ├── Static assets (src/public)
   │
   ├── Router publik (src/routes/publik.js)
   │      ├── muatPengetahuan()  ── data dari SQLite
   │      ├── jalankanInferensi() ── Forward Chaining + CF
   │      ├── simpan diagnosis ── tabel diagnosis & diagnosis_detail
   │      └── render EJS / PDFKit
   │
   └── Router admin (src/routes/admin.js)
          ├── CSRF token + verifikasi
          ├── Session auth (wajibLogin)
          ├── CRUD basis pengetahuan
          └── render EJS panel admin
```

Prinsip penting:

- **Basis pengetahuan selalu dibaca dari database** saat inferensi, sehingga perubahan admin langsung dipakai tanpa restart.
- **Mesin inferensi murni** (`src/engine/inference.js`) tidak bergantung pada Express sehingga dapat diuji terpisah.
- **Snapshot hasil** disimpan sebagai JSON di `diagnosis.hasil_json` agar tampilan riwayat tetap konsisten meskipun basis pengetahuan berubah.
- **Satu koneksi SQLite** dipakai bersama dengan mode WAL dan `foreign_keys = ON`.

---

## Teknologi yang Digunakan

| Komponen | Teknologi | Fungsi |
| --- | --- | --- |
| Runtime | Node.js (disarankan >= 22) | Menjalankan server |
| Framework web | Express 4 | Routing, middleware, static file |
| Template | EJS 3 | Server-side rendering |
| Database | SQLite via better-sqlite3 13 | Penyimpanan relasional lokal |
| Session | express-session | Autentikasi admin dan flash message |
| Hash kata sandi | bcrypt 6 | Hash dan verifikasi kata sandi |
| PDF | PDFKit 0.15 | Unduh hasil diagnosis |
| UI | Bootstrap 5.3, Bootstrap Icons | Tampilan responsif |
| Grafik | Chart.js 4 | Grafik dashboard admin |
| Tabel interaktif | jQuery DataTables 1.13 | Riwayat diagnosis admin |
| Test | `node:test` + `node:assert/strict` | Pengujian inferensi dan migrasi |
| Dev tool | nodemon | Auto-reload saat pengembangan |

Catatan: Bootstrap, Bootstrap Icons, Chart.js, jQuery, dan DataTables dimuat melalui CDN sehingga koneksi internet diperlukan untuk tampilan/gaya dan fitur tabel/grafik.

---

## Struktur Direktori

```text
SistemPakar/
├── data/
│   └── database.sqlite          # Database SQLite (dibuat oleh seed; tidak di-commit)
├── src/
│   ├── app.js                   # Entry point Express, session, error handler
│   ├── db/
│   │   ├── schema.sql           # Skema tabel dan index
│   │   ├── koneksi.js           # Koneksi SQLite tunggal (WAL, foreign keys)
│   │   ├── pengetahuan.js       # Loader basis pengetahuan + parser kondisi
│   │   ├── seed.js              # Seed reset (instalasi baru)
│   │   ├── seed-update.js       # Migrasi idempoten v1 → v2 (upsert)
│   │   ├── data_v1.js           # Snapshot master data versi 1
│   │   └── data_v2.js           # Snapshot master data versi 2
│   ├── engine/
│   │   └── inference.js         # Mesin Forward Chaining + Certainty Factor
│   ├── middleware/
│   │   ├── auth.js              # wajibLogin, sudahLogin
│   │   └── csrf.js              # pasangToken, verifikasiToken
│   ├── routes/
│   │   ├── publik.js            # Beranda, diagnosis, hasil, PDF, riwayat, tentang
│   │   └── admin.js             # Login, dashboard, CRUD, pengaturan
│   ├── utils/
│   │   └── format.js            # Formatter tanggal, persen, angka, perangkat
│   ├── public/
│   │   ├── css/style.css        # Gaya tambahan
│   │   └── js/main.js           # Pencarian gejala, counter, konfirmasi hapus
│   └── views/                   # Template EJS
│       ├── beranda.ejs
│       ├── hasil.ejs
│       ├── riwayat.ejs
│       ├── tentang.ejs
│       ├── diagnosis/
│       │   ├── pilih.ejs
│       │   └── gejala.ejs
│       ├── admin/
│       │   ├── login.ejs
│       │   ├── dashboard.ejs
│       │   ├── gejala.ejs
│       │   ├── kerusakan.ejs
│       │   ├── diagnostik.ejs
│       │   ├── aturan_diagnostik.ejs
│       │   ├── aturan_cf.ejs
│       │   ├── riwayat.ejs
│       │   └── pengaturan.ejs
│       ├── error/
│       │   ├── 403.ejs
│       │   ├── 404.ejs
│       │   └── 500.ejs
│       └── partials/
│           ├── header.ejs
│           ├── footer.ejs
│           └── admin_nav.ejs
├── tests/
│   └── inference.test.js        # 12 test otomatis
├── CHANGELOG.md
├── package.json
└── README.md
```

---

## Basis Pengetahuan

Basis pengetahuan versi 2 terdiri atas:

| Komponen | Jumlah | Kode |
| --- | ---: | --- |
| Gejala | 35 | G01–G35 |
| Kelompok diagnostik | 7 | D01–D07 |
| Kerusakan | 16 | K01–K16 |
| Aturan diagnostik (tahap 1) | 16 | A01–A16 |
| Aturan CF (tahap 2) | 44 | R01–R44 |
| Kategori gejala | 8 | — |

### Kategori Gejala

1. Daya dan papan utama
2. Memori
3. Penyimpanan dan boot
4. Suhu
5. Tampilan
6. Perangkat lunak
7. Periferal dan konektivitas
8. Lainnya

### Daftar Gejala

| Kode | Gejala | Kategori | Perangkat |
| --- | --- | --- | --- |
| G01 | Komputer tidak menyala sama sekali | Daya dan papan utama | Semua |
| G02 | Menyala tetapi layar hitam | Memori | Semua |
| G03 | Bunyi beep berulang | Memori | Semua |
| G04 | Mati atau restart sendiri | Daya dan papan utama | Semua |
| G05 | Kipas berisik atau bodi sangat panas | Suhu | Semua |
| G06 | Muncul blue screen | Perangkat lunak | Semua |
| G07 | Booting sangat lambat | Penyimpanan dan boot | Semua |
| G08 | Terdengar bunyi klik dari hard disk | Penyimpanan dan boot | Semua |
| G09 | Layar bergaris atau berkedip | Tampilan | Semua |
| G10 | Baterai tidak mengisi atau cepat habis | Daya dan papan utama | Laptop |
| G11 | File sering corrupt atau hilang | Penyimpanan dan boot | Semua |
| G12 | Iklan atau pop-up muncul sendiri | Perangkat lunak | Semua |
| G13 | Aplikasi sering crash atau not responding | Perangkat lunak | Semua |
| G14 | Lampu indikator menyala tetapi tidak ada tampilan dan tidak ada bunyi beep | Daya dan papan utama | Semua |
| G15 | Layar pecah atau backlight mati | Tampilan | Laptop |
| G16 | Tombol keyboard tidak berfungsi atau mengetik sendiri | Periferal dan konektivitas | Laptop |
| G17 | Touchpad atau kursor tidak merespons | Periferal dan konektivitas | Laptop |
| G18 | Port USB tidak mengenali perangkat | Periferal dan konektivitas | Semua |
| G19 | Tidak ada suara atau suara speaker pecah | Periferal dan konektivitas | Semua |
| G20 | WiFi tidak terdeteksi atau sering terputus | Periferal dan konektivitas | Semua |
| G21 | Tanggal dan jam kembali ke default setiap dinyalakan | Daya dan papan utama | Semua |
| G22 | Muncul pesan No bootable device atau Operating system not found | Penyimpanan dan boot | Semua |
| G23 | Layar redup atau warna tidak normal (kekuningan, kebiruan, pudar) | Tampilan | Semua |
| G24 | Muncul bintik mati, garis vertikal, atau bercak pada layar | Tampilan | Semua |
| G25 | Gambar normal di layar eksternal tetapi tidak muncul di layar laptop | Tampilan | Laptop |
| G26 | Kipas tidak berputar sama sekali | Suhu | Semua |
| G27 | Performa turun drastis saat menjalankan game atau aplikasi berat | Suhu | Semua |
| G28 | Baterai menggembung atau bodi laptop terangkat | Daya dan papan utama | Laptop |
| G29 | Charger atau adaptor sangat panas atau berbau gosong | Daya dan papan utama | Semua |
| G30 | Muncul bintik warna atau kotak-kotak pada tampilan saat game | Tampilan | Semua |
| G31 | Komputer menyala beberapa detik lalu mati | Daya dan papan utama | Semua |
| G32 | Muncul pesan Disk read error atau peringatan SMART | Penyimpanan dan boot | Semua |
| G33 | Kapasitas RAM terbaca kurang dari yang terpasang | Memori | Semua |
| G34 | Webcam atau mikrofon tidak terdeteksi | Periferal dan konektivitas | Laptop |
| G35 | Engsel layar longgar atau layar mati saat digerakkan | Tampilan | Laptop |

### Daftar Kerusakan

| Kode | Kerusakan | Perangkat |
| --- | --- | --- |
| K01 | RAM bermasalah | Semua |
| K02 | Hard disk/SSD rusak | Semua |
| K03 | Overheating / kipas rusak | Semua |
| K04 | Power supply (PSU) lemah | Semua |
| K05 | Baterai/charger rusak | Laptop |
| K06 | VGA/GPU bermasalah | Semua |
| K07 | Motherboard rusak | Semua |
| K08 | Sistem operasi/driver error | Semua |
| K09 | Virus/malware | Semua |
| K10 | Layar/LCD rusak | Laptop |
| K11 | Keyboard atau touchpad rusak | Laptop |
| K12 | Port USB atau konektor bermasalah | Semua |
| K13 | Audio/speaker bermasalah | Semua |
| K14 | Modul WiFi/jaringan bermasalah | Semua |
| K15 | Baterai CMOS lemah | Semua |
| K16 | Engsel atau kabel fleksibel layar bermasalah | Laptop |

### Kelompok Diagnostik dan Pemetaan Kerusakan

| Kode | Diagnostik | Kemungkinan kerusakan |
| --- | --- | --- |
| D01 | Masalah daya dan papan utama | K04, K05, K07, K15 |
| D02 | Masalah memori | K01 |
| D03 | Masalah penyimpanan | K02 |
| D04 | Masalah suhu | K03 |
| D05 | Masalah tampilan | K06, K10, K16 |
| D06 | Masalah perangkat lunak | K08, K09 |
| D07 | Masalah periferal dan konektivitas | K11, K12, K13, K14 |

### Aturan Diagnostik (Tahap 1)

| Kode | Kondisi | Operator | Diagnostik |
| --- | --- | --- | --- |
| A01 | G01, G04 | OR | D01 |
| A02 | G10 | OR | D01 |
| A03 | G14 | OR | D01 |
| A04 | G02, G03 | AND | D02 |
| A05 | G07, G08, G11 | OR | D03 |
| A06 | G04, G05 | OR | D04 |
| A07 | G09, G15 | OR | D05 |
| A08 | G06, G12, G13 | OR | D06 |
| A09 | G16, G17 | OR | D07 |
| A10 | G18, G19, G34 | OR | D07 |
| A11 | G20 | OR | D07 |
| A12 | G21, G28, G29, G31 | OR | D01 |
| A13 | G23, G24, G25, G30, G35 | OR | D05 |
| A14 | G26, G27 | OR | D04 |
| A15 | G22, G32 | OR | D03 |
| A16 | G33 | OR | D02 |

### Aturan CF (Tahap 2)

| Kode | Gejala | Kerusakan | CF Pakar |
| --- | --- | --- | ---: |
| R01 | G02 | K01 | 0,6 |
| R02 | G03 | K01 | 0,8 |
| R03 | G06 | K01 | 0,5 |
| R04 | G04 | K03 | 0,7 |
| R05 | G05 | K03 | 0,8 |
| R06 | G07 | K02 | 0,6 |
| R07 | G08 | K02 | 0,9 |
| R08 | G09 | K06 | 0,8 |
| R09 | G10 | K05 | 0,8 |
| R10 | G01 | K04 | 0,7 |
| R11 | G04 | K04 | 0,6 |
| R12 | G14 | K07 | 0,9 |
| R13 | G01 | K07 | 0,5 |
| R14 | G11 | K02 | 0,6 |
| R15 | G06 | K08 | 0,7 |
| R16 | G13 | K08 | 0,6 |
| R17 | G07 | K09 | 0,4 |
| R18 | G12 | K09 | 0,9 |
| R19 | G15 | K10 | 0,9 |
| R20 | G09 | K10 | 0,4 |
| R21 | G16 | K11 | 0,9 |
| R22 | G17 | K11 | 0,9 |
| R23 | G18 | K12 | 0,8 |
| R24 | G19 | K13 | 0,8 |
| R25 | G34 | K12 | 0,6 |
| R26 | G20 | K14 | 0,9 |
| R27 | G21 | K15 | 0,9 |
| R28 | G22 | K02 | 0,8 |
| R29 | G22 | K08 | 0,5 |
| R30 | G32 | K02 | 0,9 |
| R31 | G33 | K01 | 0,9 |
| R32 | G23 | K10 | 0,6 |
| R33 | G24 | K10 | 0,8 |
| R34 | G25 | K10 | 0,9 |
| R35 | G26 | K03 | 0,8 |
| R36 | G27 | K03 | 0,6 |
| R37 | G28 | K05 | 0,9 |
| R38 | G29 | K05 | 0,7 |
| R39 | G29 | K04 | 0,5 |
| R40 | G30 | K06 | 0,9 |
| R41 | G31 | K04 | 0,7 |
| R42 | G31 | K07 | 0,4 |
| R43 | G35 | K16 | 0,9 |
| R44 | G23 | K06 | 0,3 |

---

## Alur Penggunaan Diagnosis

1. Pengguna membuka `/diagnosis`.
2. Pengguna memilih jenis perangkat: **Laptop** atau **PC/Desktop**.
3. Sistem menampilkan gejala yang sesuai perangkat, dikelompokkan per kategori.
4. Pengguna mencentang gejala yang dialami dan memilih tingkat keyakinan (CF user) untuk setiap gejala.
5. Form dikirim ke `POST /diagnosis/proses`. Server:
   - memvalidasi perangkat dan kode gejala,
   - memastikan minimal satu gejala dengan CF > 0,
   - memuat basis pengetahuan dari database,
   - menjalankan Forward Chaining lalu Certainty Factor,
   - menyimpan diagnosis beserta detail gejala dan snapshot hasil,
   - mengarahkan ke halaman hasil.
6. Halaman `/hasil/:id` menampilkan dugaan, peringkat, rincian perhitungan, dan saran.
7. Pengguna dapat mengunduh PDF melalui `/hasil/:id/pdf` atau melihat riwayat di `/riwayat`.

Setiap diagnosis disimpan di tabel `diagnosis` dan `diagnosis_detail`. `hasil_json` menyimpan snapshot hasil (dugaan, hasil, gejala terpilih, ambang) agar tampilan lama tetap konsisten. Jika snapshot tidak ada (data lama), sistem menghitung ulang dari detail gejala.

---

## Skema Database

File: `src/db/schema.sql`. SQLite dengan `PRAGMA foreign_keys = ON` dan mode WAL.

### Tabel `admin`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK AUTOINCREMENT | ID admin |
| username | TEXT NOT NULL UNIQUE | Nama pengguna |
| password_hash | TEXT NOT NULL | Hash bcrypt |

### Tabel `gejala`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | ID gejala |
| kode | TEXT UNIQUE | Kode G01–G35 |
| nama | TEXT | Nama gejala |
| jenis_perangkat | TEXT CHECK (`semua`, `laptop`) | Cakupan perangkat |
| kategori | TEXT DEFAULT 'Lainnya' | Kategori tampilan |

### Tabel `kerusakan`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | ID kerusakan |
| kode | TEXT UNIQUE | Kode K01–K16 |
| nama | TEXT | Nama kerusakan |
| deskripsi | TEXT | Penjelasan kerusakan |
| solusi | TEXT | Saran penanganan |
| jenis_perangkat | TEXT CHECK (`semua`, `laptop`) | Cakupan perangkat |

### Tabel `diagnostik`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | ID kelompok |
| kode | TEXT UNIQUE | Kode D01–D07 |
| nama | TEXT | Nama kelompok masalah |

### Tabel `diagnostik_kerusakan`

Pemetaan banyak-ke-banyak kelompok diagnostik ke kerusakan.

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | ID |
| id_diagnostik | INTEGER FK → diagnostik | Kelompok |
| id_kerusakan | INTEGER FK → kerusakan | Kerusakan |
| — | UNIQUE (id_diagnostik, id_kerusakan) | Mencegah duplikasi |

### Tabel `aturan_diagnostik`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | ID aturan |
| kode | TEXT UNIQUE | Kode A01–A16 |
| kondisi_json | TEXT | JSON `{operator, gejala[]}` |
| id_diagnostik | INTEGER FK → diagnostik | Kelompok tujuan |

### Tabel `aturan_cf`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | ID aturan |
| kode | TEXT UNIQUE | Kode R01–R44 |
| id_gejala | INTEGER FK → gejala | Gejala |
| id_kerusakan | INTEGER FK → kerusakan | Kerusakan |
| cf_pakar | REAL CHECK 0–1 | Bobot keyakinan pakar |
| — | UNIQUE (id_gejala, id_kerusakan) | Mencegah duplikasi pasangan |

### Tabel `diagnosis`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | Nomor diagnosis |
| tanggal | TEXT | Waktu ISO |
| jenis_perangkat | TEXT | `laptop` / `pc` |
| hasil_utama | TEXT | Kode kerusakan dengan CF tertinggi |
| cf_hasil | REAL | Nilai CF utama |
| hasil_json | TEXT | Snapshot hasil inferensi |

### Tabel `diagnosis_detail`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| id | INTEGER PK | ID detail |
| id_diagnosis | INTEGER FK → diagnosis ON DELETE CASCADE | Diagnosis induk |
| id_gejala | INTEGER FK → gejala | Gejala terpilih |
| cf_user | REAL | CF user saat diagnosis |

### Tabel `pengaturan`

| Kolom | Tipe | Keterangan |
| --- | --- | --- |
| kunci | TEXT PK | Nama pengaturan, mis. `ambang_cf` |
| nilai | TEXT | Nilai pengaturan |

### Index

- `idx_gejala_perangkat`, `idx_kerusakan_perangkat`
- `idx_gejala_kategori`
- `idx_aturan_cf_gejala`, `idx_aturan_cf_kerusakan`
- `idx_aturan_diag_diagnostik`
- `idx_diagnosis_tanggal`
- `idx_detail_diagnosis`, `idx_detail_gejala`

---

## Daftar Rute HTTP

### Publik

| Metode | Rute | Fungsi |
| --- | --- | --- |
| GET | `/` | Beranda + statistik |
| GET | `/diagnosis` | Pilih jenis perangkat |
| GET | `/diagnosis/gejala?perangkat=laptop\|pc` | Form gejala |
| POST | `/diagnosis/proses` | Proses diagnosis |
| GET | `/hasil/:id` | Halaman hasil |
| GET | `/hasil/:id/pdf` | Unduh hasil sebagai PDF |
| GET | `/riwayat` | Riwayat diagnosis publik (maks. 200) |
| GET | `/tentang` | Halaman metodologi |

### Admin

Semua rute di bawah `/admin` (kecuali login) memerlukan session login. Seluruh `POST` memerlukan token CSRF `_csrf`.

| Metode | Rute | Fungsi |
| --- | --- | --- |
| GET | `/admin/login` | Form login |
| POST | `/admin/login` | Proses login |
| POST/GET | `/admin/logout` | Logout |
| GET | `/admin` | Dashboard |
| GET/POST | `/admin/gejala` | Daftar / tambah gejala |
| POST | `/admin/gejala/:id/update` | Ubah gejala |
| POST | `/admin/gejala/:id/hapus` | Hapus gejala |
| GET/POST | `/admin/kerusakan` | Daftar / tambah kerusakan |
| POST | `/admin/kerusakan/:id/update` | Ubah kerusakan |
| POST | `/admin/kerusakan/:id/hapus` | Hapus kerusakan |
| GET/POST | `/admin/diagnostik` | Daftar / tambah diagnostik |
| POST | `/admin/diagnostik/:id/update` | Ubah diagnostik |
| POST | `/admin/diagnostik/:id/hapus` | Hapus diagnostik |
| POST | `/admin/diagnostik/mapping` | Simpan pemetaan diagnostik–kerusakan |
| GET/POST | `/admin/aturan-diagnostik` | Daftar / tambah aturan tahap 1 |
| POST | `/admin/aturan-diagnostik/:id/update` | Ubah aturan tahap 1 |
| POST | `/admin/aturan-diagnostik/:id/hapus` | Hapus aturan tahap 1 |
| GET/POST | `/admin/aturan-cf` | Daftar / tambah aturan tahap 2 |
| POST | `/admin/aturan-cf/:id/update` | Ubah aturan tahap 2 |
| POST | `/admin/aturan-cf/:id/hapus` | Hapus aturan tahap 2 |
| GET | `/admin/riwayat` | Riwayat (DataTables) |
| GET | `/admin/pengaturan` | Halaman pengaturan |
| POST | `/admin/pengaturan/ambang` | Ubah ambang CF |
| POST | `/admin/pengaturan/password` | Ganti kata sandi admin |

### Error

| Status | Halaman |
| --- | --- |
| 403 | `error/403.ejs` (token CSRF tidak valid) |
| 404 | `error/404.ejs` (rute/data tidak ditemukan) |
| 500 | `error/500.ejs` (error server; stack trace hanya di log) |

---

## Keamanan

- **Hash kata sandi** dengan bcrypt (cost 10); kata sandi asli tidak disimpan.
- **Session** `httpOnly`, `sameSite=lax`, masa berlaku 8 jam, dan `session.regenerate()` saat login untuk mencegah *session fixation*.
- **CSRF protection** pada seluruh POST admin: token acak per session, dibandingkan dengan `crypto.timingSafeEqual`.
- **Autentikasi berlapis**: middleware `wajibLogin` dipasang setelah rute login; `sudahLogin` mencegah halaman login dibuka saat sudah masuk.
- **Query parameterized** melalui `better-sqlite3` untuk mencegah SQL injection.
- **Validasi input** pada semua form admin (format kode, panjang nama/deskripsi/solusi, rentang CF 0–1, jenis perangkat, kategori).
- **Escaping EJS** (`<%= %>`) pada data dinamis; JSON grafik di-escape terhadap karakter berbahaya.
- **Error aman**: stack trace hanya dicatat di server, pengguna melihat halaman 500.
- **Session secret** dapat diatur melalui environment `SESSION_SECRET` (wajib diganti di produksi).
- **Catatan**: belum ada rate limiting/login throttling, HTTPS enforcement, dan manajemen multi-admin. Riwayat diagnosis bersifat publik; jangan memasukkan data pribadi.

---

## Instalasi dan Konfigurasi

### Prasyarat

- **Node.js >= 22** (kebutuhan `better-sqlite3` 13)
- **npm**
- Build tools bila binary `better-sqlite3` tidak tersedia (umumnya sudah tersedia prebuilt; Windows dapat memerlukan Visual Studio Build Tools/Python)

### Langkah Instalasi

```bash
# 1. Masuk ke direktori proyek
cd SistemPakar

# 2. Instal dependensi
npm install

# 3. Buat database dan isi data awal (versi 2)
npm run seed

# 4. Jalankan aplikasi
npm run dev
```

Buka `http://localhost:3000`.

### Variabel Environment

| Variabel | Default | Keterangan |
| --- | --- | --- |
| `PORT` | `3000` | Port server |
| `SESSION_SECRET` | nilai bawaan di kode | Ganti dengan string acak di produksi |
| `DB_PATH` | `data/database.sqlite` | Lokasi file database (berguna untuk test/staging) |

Contoh (PowerShell):

```powershell
$env:PORT = "8080"
$env:SESSION_SECRET = "ganti-dengan-string-acak-panjang"
$env:DB_PATH = "C:\data\sistem-pakar.sqlite"
npm start
```

### Akun Admin Awal

| Username | Kata Sandi |
| --- | --- |
| `admin` | `admin123` |

> Segera ganti kata sandi melalui menu **Admin → Pengaturan** setelah login pertama.

---

## Menjalankan Aplikasi

| Perintah | Fungsi |
| --- | --- |
| `npm start` | Jalankan server dengan Node.js |
| `npm run dev` | Jalankan server dengan nodemon (auto-reload) |
| `npm run seed` | Hapus database lama, buat skema, isi data versi 2 |
| `npm run seed:update` | Migrasi idempoten v1 → v2 tanpa menghapus data |
| `npm run seed:update -- --reset-bobot` | Migrasi sekaligus menimpa bobot `cf_pakar` dengan nilai seed |
| `npm test` | Jalankan 12 test otomatis |

Saat server dijalankan, aplikasi memeriksa apakah tabel `gejala` dapat diakses. Jika database belum siap, proses berhenti dengan pesan agar menjalankan `npm run seed`.

---

## Seed dan Migrasi Data

### `npm run seed` — Instalasi Baru

- **Menghapus** file `data/database.sqlite` beserta `-wal` dan `-shm` (data lama hilang).
- Menerapkan skema (`schema.sql`) dan kolom `kategori` bila belum ada.
- Mengisi admin default, 16 kerusakan, 35 gejala, 7 diagnostik, 16 aturan diagnostik, pemetaan diagnostik, dan 44 aturan CF.
- Menulis ambang CF default `0.2`.
- Menampilkan ringkasan jumlah data dan akun admin awal.

### `npm run seed:update` — Migrasi dari Versi 1

Migrasi bersifat **idempoten** dan aman dijalankan berulang:

- Memastikan skema dan kolom `kategori` tersedia.
- Menggunakan `INSERT ... ON CONFLICT(kode) DO UPDATE` (upsert) untuk data master berbasis `kode`.
- Menambahkan data v2 (G16–G35, K11–K16, D07, A09–A16, R21–R44).
- **Tidak menghapus** tabel `admin`, `diagnosis`, `diagnosis_detail`, maupun `pengaturan`.
- **Tidak menimpa** bobot `cf_pakar` yang telah diubah admin, kecuali opsi `--reset-bobot` diberikan secara eksplisit.
- Melewati aturan CF yang akan membentuk pasangan gejala–kerusakan duplikat dan melaporkannya.
- Menampilkan ringkasan sebelum dan sesudah migrasi.

Dari versi 1 (15 gejala, 6 diagnostik, 10 kerusakan, 8 aturan diagnostik, 20 aturan CF) menjadi versi 2 (35 gejala, 7 diagnostik, 16 kerusakan, 16 aturan diagnostik, 44 aturan CF).

---

## Pengujian

Menjalankan:

```bash
npm test
```

Test menggunakan `node:test` dengan database SQLite in-memory (`:memory:`), sehingga tidak mengubah database aplikasi. Cakupan 12 test:

### Skenario Inferensi

| Kode | Skenario | Hasil yang Diverifikasi |
| --- | --- | --- |
| S01 | G02 yakin + G03 sangat yakin | K01 = 89,6% |
| S02 | G04 sangat yakin + G05 yakin | K03 = 89,2%, K04 = 60,0% |
| S03 | G07 cukup yakin + G08 sangat yakin | K02 = 93,6%, K09 = 24,0% |
| S04 | G01 yakin + G14 sangat yakin | K07 = 94,0%, K04 = 56,0% |
| S05 | G12 sangat yakin + G13 cukup yakin + G07 sedikit yakin | K09 = 91,6%, K08 = 36,0%, K02 = 24,0% |
| S06 | Tidak ada gejala / semua CF 0 | Pesan "Pilih minimal satu gejala" |
| S07 | G16 sangat yakin + G17 yakin | K11 = 97,2% |
| S08 | G22 sangat yakin + G32 yakin + G07 cukup yakin | K02 = 96,4%, K08 = 50,0%, K09 = 24,0% |
| S09 | G28 sangat yakin + G29 yakin | K05 = 95,6%, K04 = 40,0% |

### Test Integritas Basis Pengetahuan

- Jumlah data v2 tepat: 35 gejala, 16 kerusakan, 7 diagnostik, 16 aturan diagnostik, 44 aturan CF.
- Setiap kerusakan memiliki minimal satu aturan CF.
- Setiap gejala dipakai minimal satu aturan (CF atau diagnostik).
- Semua `cf_pakar` berada pada rentang 0–1.
- Semua kode gejala pada kondisi aturan diagnostik valid.
- Semua aturan CF menunjuk gejala dan kerusakan yang ada.
- Semua gejala memiliki kategori.

### Test Migrasi

- **Migrasi v1 → v2 idempoten**: dijalankan dua kali tidak menggandakan data, riwayat diagnosis/admin tetap ada, dan bobot hasil perubahan admin dipertahankan.
- **Opsi `--reset-bobot`**: bobot aturan lama dikembalikan ke nilai seed.

---

## Batasan Sistem

- Hasil bersifat **informatif**, bukan diagnosis final atau pengganti pemeriksaan teknisi.
- Sistem tidak memeriksa perangkat secara langsung dan tidak membaca sensor perangkat.
- Basis pengetahuan statis berbasis aturan; kualitas hasil bergantung pada kelengkapan dan validitas bobot pakar.
- Hanya mendukung dua jenis perangkat: laptop dan PC/Desktop.
- Riwayat diagnosis dapat dilihat publik (maksimal 200 terbaru); jangan memasukkan data pribadi.
- Belum tersedia manajemen multi-admin, audit log, rate limiting, atau API publik.
- Tampilan dan fitur grafik/tabel bergantung pada CDN pihak ketiga (Bootstrap, Chart.js, DataTables, jQuery).
- Unduhan PDF menggunakan font bawaan PDFKit; simbol khusus tertentu dinormalisasi agar aman.

---

## Riwayat Versi

### Versi 2.0.0

- Basis pengetahuan diperluas: 35 gejala, 16 kerusakan, 7 diagnostik, 16 aturan diagnostik, 44 aturan CF.
- Kategori gejala dan tampilan akordeon per kategori.
- Pencarian gejala instan dan penghitung gejala terpilih.
- Halaman hasil menampilkan 5 teratas dengan opsi "Tampilkan semua".
- Migrasi idempoten `npm run seed:update` dengan opsi `--reset-bobot`.
- Test otomatis menjadi 12 (9 skenario, integritas data, 2 migrasi).
- Snapshot master data `data_v1.js` dan `data_v2.js`.

### Versi 1.0.0

- Rilis awal: aplikasi web sistem pakar dengan Forward Chaining + Certainty Factor.
- Basis pengetahuan: 15 gejala, 6 diagnostik, 10 kerusakan, 8 aturan diagnostik, 20 aturan CF.
- CRUD admin, session + bcrypt + CSRF, riwayat, PDF, halaman metodologi.
- 6 skenario test awal.

Lihat `CHANGELOG.md` untuk rincian lengkap setiap perubahan.

---

## Lisensi

MIT License. Proyek ini dibuat untuk kebutuhan tugas kuliah dan pembelajaran. Penggunaan hasil diagnosis sepenuhnya menjadi tanggung jawab pengguna; untuk kerusakan perangkat keras yang berisiko, hentikan pemakaian dan konsultasikan kepada teknisi.

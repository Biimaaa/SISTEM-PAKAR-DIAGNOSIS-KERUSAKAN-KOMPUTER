const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { DB_PATH, buatKoneksi } = require('./koneksi');

const v2 = require('./data_v2');

function terapkanSkema(db) {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.pragma('foreign_keys = ON');
  db.exec(sql);

  // Kolom kategori (versi 2): ditambahkan bila database lama belum memilikinya.
  const kolomGejala = db.pragma('table_info(gejala)').map((c) => c.name);
  if (!kolomGejala.includes('kategori')) {
    db.exec("ALTER TABLE gejala ADD COLUMN kategori TEXT NOT NULL DEFAULT 'Lainnya'");
  }
  // Index kategori dibuat setelah kolom terjamin ada.
  db.exec('CREATE INDEX IF NOT EXISTS idx_gejala_kategori ON gejala(kategori)');
}

function isiSeed(db, master = v2) {
  const hashAdmin = bcrypt.hashSync('admin123', 10);

  const jalankan = db.transaction(() => {
    const insertAdmin = db.prepare(
      'INSERT INTO admin (username, password_hash) VALUES (?, ?)'
    );
    insertAdmin.run('admin', hashAdmin);

    const insertKerusakan = db.prepare(
      `INSERT INTO kerusakan (kode, nama, deskripsi, solusi, jenis_perangkat)
       VALUES (?, ?, ?, ?, ?)`
    );
    for (const k of master.DATA_KERUSAKAN) {
      insertKerusakan.run(k.kode, k.nama, k.deskripsi, k.solusi, k.jenis_perangkat);
    }

    const insertGejala = db.prepare(
      `INSERT INTO gejala (kode, nama, jenis_perangkat, kategori)
       VALUES (?, ?, ?, ?)`
    );
    for (const g of master.DATA_GEJALA) {
      insertGejala.run(g[0], g[1], g[2], g[3] || 'Lainnya');
    }

    const insertDiagnostik = db.prepare(
      'INSERT INTO diagnostik (kode, nama) VALUES (?, ?)'
    );
    for (const d of master.DATA_DIAGNOSTIK) {
      insertDiagnostik.run(d[0], d[1]);
    }

    // Indeks kode untuk resolusi id pada tabel relasi.
    const idGejala = new Map(
      db.prepare('SELECT id, kode FROM gejala').all().map((r) => [r.kode, r.id])
    );
    const idKerusakan = new Map(
      db.prepare('SELECT id, kode FROM kerusakan').all().map((r) => [r.kode, r.id])
    );
    const idDiagnostik = new Map(
      db.prepare('SELECT id, kode FROM diagnostik').all().map((r) => [r.kode, r.id])
    );

    const insertAturanDiagnostik = db.prepare(
      `INSERT INTO aturan_diagnostik (kode, kondisi_json, id_diagnostik)
       VALUES (?, ?, ?)`
    );
    for (const a of master.DATA_ATURAN_DIAGNOSTIK) {
      insertAturanDiagnostik.run(
        a.kode,
        JSON.stringify({ operator: a.operator, gejala: a.gejala }),
        idDiagnostik.get(a.diagnostik)
      );
    }

    const insertMapping = db.prepare(
      `INSERT INTO diagnostik_kerusakan (id_diagnostik, id_kerusakan)
       VALUES (?, ?)`
    );
    for (const [kodeDiagnostik, daftarKerusakan] of Object.entries(master.DATA_MAPPING_DIAGNOSTIK)) {
      for (const kodeKerusakan of daftarKerusakan) {
        insertMapping.run(
          idDiagnostik.get(kodeDiagnostik),
          idKerusakan.get(kodeKerusakan)
        );
      }
    }

    const insertAturanCf = db.prepare(
      `INSERT INTO aturan_cf (kode, id_gejala, id_kerusakan, cf_pakar)
       VALUES (?, ?, ?, ?)`
    );
    for (const [kode, kodeGejala, kodeKerusakan, cf] of master.DATA_ATURAN_CF) {
      insertAturanCf.run(
        kode,
        idGejala.get(kodeGejala),
        idKerusakan.get(kodeKerusakan),
        cf
      );
    }
  });

  jalankan();
}

function jalankanSeed() {
  // Seed bersifat reset: hapus file database lama agar data bersih.
  for (const akhiran of ['', '-wal', '-shm']) {
    const file = `${DB_PATH}${akhiran}`;
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }

  const db = buatKoneksi(DB_PATH);
  terapkanSkema(db);
  isiSeed(db);

  // Ambang default khusus instalasi baru; seed:update tidak menyentuh pengaturan.
  db.prepare(
    `INSERT INTO pengaturan (kunci, nilai) VALUES ('ambang_cf', '0.2')
     ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai`
  ).run();

  const jumlah = {
    gejala: db.prepare('SELECT COUNT(*) AS n FROM gejala').get().n,
    kerusakan: db.prepare('SELECT COUNT(*) AS n FROM kerusakan').get().n,
    diagnostik: db.prepare('SELECT COUNT(*) AS n FROM diagnostik').get().n,
    aturanDiagnostik: db.prepare('SELECT COUNT(*) AS n FROM aturan_diagnostik').get().n,
    aturanCf: db.prepare('SELECT COUNT(*) AS n FROM aturan_cf').get().n,
    diagnosis: db.prepare('SELECT COUNT(*) AS n FROM diagnosis').get().n
  };
  db.close();

  console.log('Seed selesai (versi 2).');
  console.log(`Database: ${DB_PATH}`);
  console.log(
    `Data: ${jumlah.gejala} gejala, ${jumlah.kerusakan} kerusakan, ${jumlah.diagnostik} diagnostik, ` +
      `${jumlah.aturanDiagnostik} aturan diagnostik, ${jumlah.aturanCf} aturan CF, ${jumlah.diagnosis} diagnosis.`
  );
  console.log('Akun admin awal: admin / admin123 (segera ganti setelah login).');
}

module.exports = {
  terapkanSkema,
  isiSeed,
  jalankanSeed
};

if (require.main === module) {
  jalankanSeed();
}

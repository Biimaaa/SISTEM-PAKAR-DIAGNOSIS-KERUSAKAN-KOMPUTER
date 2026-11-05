// Migrasi idempoten versi 2: memastikan kolom kategori ada, mengisi ulang data
// master lewat upsert berdasarkan kolom kode, tanpa menyentuh tabel admin,
// diagnosis, diagnosis_detail, dan pengaturan. Aman dijalankan berulang.
//
// Opsi --reset-bobot (default MATI): bila diaktifkan, bobot cf_pakar aturan lama
// yang sudah diubah admin ditimpa dengan nilai seed. Tanpa opsi ini, bobot
// hasil perubahan admin dipertahankan.

const v2 = require('./data_v2');
const { terapkanSkema } = require('./seed');

function migrasi(db, { resetBobot = false, master = v2 } = {}) {
  terapkanSkema(db); // CREATE TABLE IF NOT EXISTS + kolom kategori, aman untuk DB lama.

  const laporan = { kategoriBaru: false };
  laporan.kategoriBaru = db
    .pragma('table_info(gejala)')
    .map((c) => c.name)
    .includes('kategori');

  const jalankan = db.transaction(() => {
    const upsertGejala = db.prepare(
      `INSERT INTO gejala (kode, nama, jenis_perangkat, kategori)
       VALUES (@kode, @nama, @jenis, @kategori)
       ON CONFLICT(kode) DO UPDATE SET
         nama = excluded.nama,
         jenis_perangkat = excluded.jenis_perangkat,
         kategori = excluded.kategori`
    );
    for (const [kode, nama, jenis, kategori] of master.DATA_GEJALA) {
      upsertGejala.run({ kode, nama, jenis, kategori });
    }

    const upsertKerusakan = db.prepare(
      `INSERT INTO kerusakan (kode, nama, deskripsi, solusi, jenis_perangkat)
       VALUES (@kode, @nama, @deskripsi, @solusi, @jenis)
       ON CONFLICT(kode) DO UPDATE SET
         nama = excluded.nama,
         deskripsi = excluded.deskripsi,
         solusi = excluded.solusi,
         jenis_perangkat = excluded.jenis_perangkat`
    );
    const upsertDiagnostik = db.prepare(
      `INSERT INTO diagnostik (kode, nama) VALUES (@kode, @nama)
       ON CONFLICT(kode) DO UPDATE SET nama = excluded.nama`
    );

    // Index kode -> id untuk tabel relasi, dibakukan SETELAH master diperbarui
    // agar kode baru (K11-K16, D07) ikut terbaca.
    for (const k of master.DATA_KERUSAKAN) {
      upsertKerusakan.run({
        kode: k.kode,
        nama: k.nama,
        deskripsi: k.deskripsi,
        solusi: k.solusi,
        jenis: k.jenis_perangkat
      });
    }
    for (const [kode, nama] of master.DATA_DIAGNOSTIK) {
      upsertDiagnostik.run({ kode, nama });
    }

    const idGejala = buatPetaKode(db, 'gejala');
    const idKerusakan = buatPetaKode(db, 'kerusakan');
    const idDiagnostik = buatPetaKode(db, 'diagnostik');

    const upsertAturanDiagnostik = db.prepare(
      `INSERT INTO aturan_diagnostik (kode, kondisi_json, id_diagnostik)
       VALUES (@kode, @kondisi, @idDiagnostik)
       ON CONFLICT(kode) DO UPDATE SET
         kondisi_json = excluded.kondisi_json,
         id_diagnostik = excluded.id_diagnostik`
    );
    for (const a of master.DATA_ATURAN_DIAGNOSTIK) {
      const targetDiagnostik = idDiagnostik.get(a.diagnostik);
      if (!targetDiagnostik) continue;
      upsertAturanDiagnostik.run({
        kode: a.kode,
        kondisi: JSON.stringify({ operator: a.operator, gejala: a.gejala }),
        idDiagnostik: targetDiagnostik
      });
    }

    // Pasangan pemetaan milik admin TIDAK dihapus; hanya pasangan master v2 yang ditambahkan.
    const insertMapping = db.prepare(
      `INSERT INTO diagnostik_kerusakan (id_diagnostik, id_kerusakan)
       SELECT ?, ? WHERE NOT EXISTS (
         SELECT 1 FROM diagnostik_kerusakan
         WHERE id_diagnostik = ? AND id_kerusakan = ?
       )`
    );
    for (const [kodeDiagnostik, daftarKerusakan] of Object.entries(master.DATA_MAPPING_DIAGNOSTIK)) {
      const targetDiagnostik = idDiagnostik.get(kodeDiagnostik);
      if (!targetDiagnostik) continue;
      for (const kodeKerusakan of daftarKerusakan) {
        const targetKerusakan = idKerusakan.get(kodeKerusakan);
        if (!targetKerusakan) continue;
        insertMapping.run(targetDiagnostik, targetKerusakan, targetDiagnostik, targetKerusakan);
      }
    }

    // Aturan CF: kode dipertahankan; id gejala/kerusakan diperbarui lewat upsert.
    // cf_pakar lama TIDAK ditimpa kecuali opsi resetBobot diaktifkan.
    const aturanCfSql = resetBobot
      ? `INSERT INTO aturan_cf (kode, id_gejala, id_kerusakan, cf_pakar)
         VALUES (@kode, @idGejala, @idKerusakan, @cf)
         ON CONFLICT(kode) DO UPDATE SET
           id_gejala = excluded.id_gejala,
           id_kerusakan = excluded.id_kerusakan,
           cf_pakar = excluded.cf_pakar`
      : `INSERT INTO aturan_cf (kode, id_gejala, id_kerusakan, cf_pakar)
         VALUES (@kode, @idGejala, @idKerusakan, @cf)
         ON CONFLICT(kode) DO UPDATE SET
           id_gejala = excluded.id_gejala,
           id_kerusakan = excluded.id_kerusakan`;
    const upsertAturanCf = db.prepare(aturanCfSql);

    // Duplikat pasangan gejala-kerusakan tidak boleh terbentuk: kode berbeda
    // dengan pasangan identik akan dilewati dan dilaporkan.
    const pasanganAda = db.prepare(
      'SELECT kode FROM aturan_cf WHERE id_gejala = ? AND id_kerusakan = ?'
    );
    laporan.dilewati = [];

    for (const [kode, kodeGejala, kodeKerusakan, cf] of master.DATA_ATURAN_CF) {
      const gejalaId = idGejala.get(kodeGejala);
      const kerusakanId = idKerusakan.get(kodeKerusakan);
      if (!gejalaId || !kerusakanId) continue;

      const bentrok = pasanganAda.get(gejalaId, kerusakanId);
      if (bentrok && bentrok.kode !== kode) {
        laporan.dilewati.push(
          `Aturan ${kode} ${kodeGejala}->${kodeKerusakan} dilewati; kode ${bentrok.kode} sudah memakai pasangan ini.`
        );
        continue;
      }

      // Aturan baru maupun lama masuk lewat satu upsert; tanpa --reset-bobot
      // bagian DO UPDATE tidak menyentuh cf_pakar sehingga bobot admin aman.
      upsertAturanCf.run({ kode, idGejala: gejalaId, idKerusakan: kerusakanId, cf });
    }
  });

  jalankan();
  return laporan;
}

function buatPetaKode(db, tabel) {
  return new Map(
    db.prepare(`SELECT id, kode FROM ${tabel}`).all().map((r) => [r.kode, r.id])
  );
}

function ringkasan(db) {
  const c = (tabel) => db.prepare(`SELECT COUNT(*) AS n FROM ${tabel}`).get().n;
  return {
    gejala: c('gejala'),
    kerusakan: c('kerusakan'),
    diagnostik: c('diagnostik'),
    aturanDiagnostik: c('aturan_diagnostik'),
    aturanCf: c('aturan_cf'),
    diagnosis: c('diagnosis'),
    admin: c('admin')
  };
}

function jalankanMigrasi() {
  const { DB_PATH, buatKoneksi } = require('./koneksi');
  const resetBobot = process.argv.includes('--reset-bobot');

  const db = buatKoneksi(DB_PATH);
  const sebelum = ringkasan(db);
  const laporan = migrasi(db, { resetBobot });
  const sesudah = ringkasan(db);
  db.close();

  console.log('Migrasi versi 2 selesai.');
  console.log(`Database: ${DB_PATH}`);
  if (laporan.kategoriBaru) console.log('Kolom kategori sudah tersedia di tabel gejala.');
  for (const pesan of laporan.dilewati || []) console.log(pesan);
  console.log(
    `Sebelum : ${sebelum.gejala} gejala, ${sebelum.kerusakan} kerusakan, ${sebelum.diagnostik} diagnostik, ` +
      `${sebelum.aturanDiagnostik} aturan diagnostik, ${sebelum.aturanCf} aturan CF, ` +
      `${sebelum.diagnosis} diagnosis, ${sebelum.admin} admin.`
  );
  console.log(
    `Sesudah : ${sesudah.gejala} gejala, ${sesudah.kerusakan} kerusakan, ${sesudah.diagnostik} diagnostik, ` +
      `${sesudah.aturanDiagnostik} aturan diagnostik, ${sesudah.aturanCf} aturan CF, ` +
      `${sesudah.diagnosis} diagnosis, ${sesudah.admin} admin.`
  );
  if (!resetBobot) {
    console.log('Bobot cf_pakar aturan lama dipertahankan. Gunakan --reset-bobot untuk menimpanya dengan nilai seed.');
  }
}

if (require.main === module) {
  jalankanMigrasi();
}

module.exports = { migrasi, ringkasan, jalankanMigrasi };

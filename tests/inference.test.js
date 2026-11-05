const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');

const { terapkanSkema, isiSeed } = require('../src/db/seed');
const v1 = require('../src/db/data_v1');
const v2 = require('../src/db/data_v2');
const { muatPengetahuan } = require('../src/db/pengetahuan');
const { jalankanInferensi } = require('../src/engine/inference');
const { migrasi, ringkasan } = require('../src/db/seed-update');

let db;
let pengetahuan;

before(() => {
  db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  terapkanSkema(db);
  isiSeed(db, v2);
  pengetahuan = muatPengetahuan(db);
});

after(() => {
  db.close();
});

function proses(cfUserPerGejala) {
  return jalankanInferensi({
    gejalaTerpilih: Object.entries(cfUserPerGejala).map(([kode, cfUser]) => ({
      kode,
      cfUser
    })),
    pengetahuan
  });
}

function ringkas(hasil) {
  return hasil.hasil.map((item) => ({
    kode: item.kode,
    persentase: item.persentase
  }));
}

test('S01: G02 yakin + G03 sangat yakin -> K01 = 89.6%', () => {
  const hasil = proses({ G02: 0.8, G03: 1.0 });
  assert.deepEqual(ringkas(hasil), [{ kode: 'K01', persentase: 89.6 }]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode),
    ['D02']
  );
});

test('S02: G04 sangat yakin + G05 yakin -> K03 = 89.2%, K04 = 60.0%', () => {
  const hasil = proses({ G04: 1.0, G05: 0.8 });
  assert.deepEqual(ringkas(hasil), [
    { kode: 'K03', persentase: 89.2 },
    { kode: 'K04', persentase: 60.0 }
  ]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode).sort(),
    ['D01', 'D04']
  );
});

test('S03: G07 cukup yakin + G08 sangat yakin -> K02 = 93.6%, K09 = 24.0%', () => {
  const hasil = proses({ G07: 0.6, G08: 1.0 });
  assert.deepEqual(ringkas(hasil), [
    { kode: 'K02', persentase: 93.6 },
    { kode: 'K09', persentase: 24.0 }
  ]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode),
    ['D03']
  );
});

test('S04: G01 yakin + G14 sangat yakin -> K07 = 94.0%, K04 = 56.0%', () => {
  const hasil = proses({ G01: 0.8, G14: 1.0 });
  assert.deepEqual(ringkas(hasil), [
    { kode: 'K07', persentase: 94.0 },
    { kode: 'K04', persentase: 56.0 }
  ]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode).sort(),
    ['D01']
  );
});

test('S05: G12 sangat yakin + G13 cukup yakin + G07 sedikit yakin', () => {
  const hasil = proses({ G12: 1.0, G13: 0.6, G07: 0.4 });
  assert.deepEqual(ringkas(hasil), [
    { kode: 'K09', persentase: 91.6 },
    { kode: 'K08', persentase: 36.0 },
    { kode: 'K02', persentase: 24.0 }
  ]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode).sort(),
    ['D03', 'D06']
  );
});

test('S06: tidak ada gejala -> pesan "Pilih minimal satu gejala"', () => {
  const kosong = jalankanInferensi({ gejalaTerpilih: [], pengetahuan });
  assert.equal(kosong.pesan, 'Pilih minimal satu gejala');
  assert.deepEqual(kosong.hasil, []);

  const semuaTidakTahu = proses({ G01: 0, G02: 0, G03: 0 });
  assert.equal(semuaTidakTahu.pesan, 'Pilih minimal satu gejala');
  assert.deepEqual(semuaTidakTahu.hasil, []);
});

test('S07: G16 sangat yakin + G17 yakin -> K11 = 97.2%', () => {
  const hasil = proses({ G16: 1.0, G17: 0.8 });
  assert.deepEqual(ringkas(hasil), [{ kode: 'K11', persentase: 97.2 }]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode),
    ['D07']
  );
});

test('S08: G22 sangat yakin + G32 yakin + G07 cukup yakin -> K02 = 96.4%, K08 = 50.0%, K09 = 24.0%', () => {
  const hasil = proses({ G22: 1.0, G32: 0.8, G07: 0.6 });
  assert.deepEqual(ringkas(hasil), [
    { kode: 'K02', persentase: 96.4 },
    { kode: 'K08', persentase: 50.0 },
    { kode: 'K09', persentase: 24.0 }
  ]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode),
    ['D03']
  );
});

test('S09: G28 sangat yakin + G29 yakin -> K05 = 95.6%, K04 = 40.0%', () => {
  const hasil = proses({ G28: 1.0, G29: 0.8 });
  assert.deepEqual(ringkas(hasil), [
    { kode: 'K05', persentase: 95.6 },
    { kode: 'K04', persentase: 40.0 }
  ]);
  assert.deepEqual(
    hasil.dugaan.map((d) => d.kode).sort(),
    ['D01']
  );
});

test('Integritas data seed versi 2', () => {
  const c = (tabel) => db.prepare(`SELECT COUNT(*) AS n FROM ${tabel}`).get().n;

  assert.equal(c('gejala'), 35, '35 gejala');
  assert.equal(c('kerusakan'), 16, '16 kerusakan');
  assert.equal(c('diagnostik'), 7, '7 diagnostik');
  assert.equal(c('aturan_diagnostik'), 16, '16 aturan diagnostik');
  assert.equal(c('aturan_cf'), 44, '44 aturan CF');

  // Setiap kerusakan dipakai minimal satu aturan CF.
  const kerusakanTanpaAturan = db
    .prepare(
      `SELECT kk.kode FROM kerusakan kk
       LEFT JOIN aturan_cf ac ON ac.id_kerusakan = kk.id
       WHERE ac.id IS NULL`
    )
    .all();
  assert.deepEqual(kerusakanTanpaAturan, [], 'setiap kerusakan punya aturan CF');

  // Setiap gejala dipakai minimal satu aturan (CF atau diagnostik).
  const gejalaTanpaAturan = db
    .prepare(
      `SELECT gg.kode FROM gejala gg
       WHERE NOT EXISTS (
         SELECT 1 FROM aturan_cf ac WHERE ac.id_gejala = gg.id
       )
         AND NOT EXISTS (
         SELECT 1 FROM aturan_diagnostik ad WHERE ad.kondisi_json LIKE '%' || gg.kode || '%'
       )`
    )
    .all();
  assert.deepEqual(gejalaTanpaAturan, [], 'setiap gejala dipakai minimal satu aturan');

  // Semua cf_pakar 0..1.
  const diLuarRentang = db
    .prepare('SELECT COUNT(*) AS n FROM aturan_cf WHERE cf_pakar < 0 OR cf_pakar > 1')
    .get().n;
  assert.equal(diLuarRentang, 0, 'cf_pakar selalu antara 0 dan 1');

  // Setiap referensi kode dalam kondisi aturan diagnostik valid.
  const kodeGejala = new Set(
    db.prepare('SELECT kode FROM gejala').all().map((r) => r.kode)
  );
  for (const aturan of db.prepare('SELECT kode, kondisi_json FROM aturan_diagnostik').all()) {
    const kondisi = JSON.parse(aturan.kondisi_json);
    for (const kodeGejalaAturan of kondisi.gejala) {
      assert.ok(kodeGejala.has(kodeGejalaAturan), `kondisi aturan ${aturan.kode} valid: ${kodeGejalaAturan}`);
    }
    const adaDiagnostik = db
      .prepare('SELECT 1 FROM diagnostik WHERE id = (SELECT id_diagnostik FROM aturan_diagnostik WHERE kode = ?)')
      .get(aturan.kode);
    assert.ok(adaDiagnostik, `aturan ${aturan.kode} mengarah ke diagnostik yang ada`);
  }

  // Setiap aturan CF mengarah ke gejala dan kerusakan yang ada.
  const aturanCfInvalid = db
    .prepare(
      `SELECT ac.kode FROM aturan_cf ac
       LEFT JOIN gejala g ON g.id = ac.id_gejala
       LEFT JOIN kerusakan k ON k.id = ac.id_kerusakan
       WHERE g.id IS NULL OR k.id IS NULL`
    )
    .all();
  assert.deepEqual(aturanCfInvalid, [], 'aturan CF mengarah ke gejala & kerusakan yang ada');

  // Kategori terisi untuk semua gejala.
  const tanpaKategori = db
    .prepare("SELECT COUNT(*) AS n FROM gejala WHERE kategori IS NULL OR kategori = ''")
    .get().n;
  assert.equal(tanpaKategori, 0, 'semua gejala punya kategori');
});

// ---------- Test migrasi seed:update ----------

// Database versi 1 lengkap dengan satu riwayat diagnosis dan bobot R01 yang
// sudah diubah admin (0.55). Migrasi lalu dijalankan dua kali berturut-turut.
test('Migrasi v1 -> v2 idempoten, data lama tidak hilang, bobot admin dipertahankan', () => {
  const dbMig = new Database(':memory:');
  dbMig.pragma('foreign_keys = ON');
  terapkanSkema(dbMig);
  isiSeed(dbMig, v1);

  // Ubah bobot satu aturan lama (R01) untuk mensimulasikan pakar.
  dbMig.prepare("UPDATE aturan_cf SET cf_pakar = 0.55 WHERE kode = 'R01'").run();

  // Satu riwayat diagnosis versi 1.
  dbMig
    .prepare(
      `INSERT INTO diagnosis (tanggal, jenis_perangkat, hasil_utama, cf_hasil)
       VALUES ('2024-01-01T08:00:00Z', 'pc', 'K01', 0.9)`
    )
    .run();
  const idDiagnosis = dbMig.prepare('SELECT id FROM diagnosis').get().id;
  const idGejalaG02 = dbMig.prepare("SELECT id FROM gejala WHERE kode = 'G02'").get().id;
  dbMig
    .prepare('INSERT INTO diagnosis_detail (id_diagnosis, id_gejala, cf_user) VALUES (?, ?, ?)')
    .run(idDiagnosis, idGejalaG02, 0.8);

  const sebelum = ringkasan(dbMig);
  assert.equal(sebelum.gejala, 15);
  assert.equal(sebelum.diagnosis, 1);
  assert.equal(sebelum.admin, 1);

  // Jalankan migrasi dua kali berturut-turut.
  migrasi(dbMig);
  const sesudahPertama = ringkasan(dbMig);
  migrasi(dbMig);
  const sesudahKedua = ringkasan(dbMig);

  // Jumlah master data versi 2 tercapai dan TIDAK berlipat.
  assert.equal(sesudahPertama.gejala, 35, '35 gejala setelah migrasi pertama');
  assert.equal(sesudahPertama.kerusakan, 16, '16 kerusakan setelah migrasi pertama');
  assert.equal(sesudahPertama.diagnostik, 7, '7 diagnostik setelah migrasi pertama');
  assert.equal(sesudahPertama.aturanDiagnostik, 16, '16 aturan diagnostik setelah migrasi pertama');
  assert.equal(sesudahPertama.aturanCf, 44, '44 aturan CF setelah migrasi pertama');

  assert.deepEqual(sesudahKedua, sesudahPertama, 'migrasi kedua tidak mengubah jumlah');

  // Riwayat diagnosis dan detail tidak dihapus.
  assert.equal(dbMig.prepare('SELECT COUNT(*) n FROM diagnosis').get().n, 1);
  assert.equal(dbMig.prepare('SELECT COUNT(*) n FROM diagnosis_detail').get().n, 1);

  // Akun admin lama tetap ada (tidak ditambahkan admin baru).
  assert.equal(dbMig.prepare('SELECT COUNT(*) n FROM admin').get().n, 1);

  // Bobot yang diubah admin pada aturan lama TIDAK ditimpa (default).
  assert.equal(
    dbMig.prepare("SELECT cf_pakar FROM aturan_cf WHERE kode = 'R01'").get().cf_pakar,
    0.55,
    'bobot R01 hasil perubahan admin tetap 0.55'
  );

  // Kategori terisi untuk gejala lama maupun baru.
  assert.equal(
    dbMig.prepare("SELECT kategori FROM gejala WHERE kode = 'G02'").get().kategori,
    'Memori'
  );
  assert.equal(
    dbMig.prepare("SELECT kategori FROM gejala WHERE kode = 'G23'").get().kategori,
    'Tampilan'
  );
  dbMig.close();
});

test('Migrasi dengan --reset-bobot menimpa bobot aturan lama', () => {
  const dbReset = new Database(':memory:');
  dbReset.pragma('foreign_keys = ON');
  terapkanSkema(dbReset);
  isiSeed(dbReset, v1);
  dbReset.prepare("UPDATE aturan_cf SET cf_pakar = 0.55 WHERE kode = 'R01'").run();

  migrasi(dbReset, { resetBobot: true });
  assert.equal(
    dbReset.prepare("SELECT cf_pakar FROM aturan_cf WHERE kode = 'R01'").get().cf_pakar,
    0.6,
    'bobot R01 kembali ke nilai seed 0.6'
  );
  assert.equal(ringkasan(dbReset).aturanCf, 44);
  dbReset.close();
});

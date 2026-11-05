// Memuat seluruh basis pengetahuan dari database agar mesin inferensi
// selalu memakai aturan terbaru yang diubah pakar lewat halaman admin.
function parseKondisi(json) {
  try {
    const kondisi = JSON.parse(json);
    const operator = String(kondisi.operator || 'OR').toUpperCase() === 'AND' ? 'AND' : 'OR';
    const gejala = Array.isArray(kondisi.gejala)
      ? kondisi.gejala.map(String).filter(Boolean)
      : [];
    return { operator, gejala };
  } catch (err) {
    return { operator: 'OR', gejala: [] };
  }
}

function muatPengetahuan(db) {
  const gejala = db
    .prepare('SELECT id, kode, nama, jenis_perangkat FROM gejala ORDER BY kode')
    .all();

  const kerusakan = db
    .prepare('SELECT id, kode, nama, deskripsi, solusi, jenis_perangkat FROM kerusakan ORDER BY kode')
    .all();

  const diagnostik = db
    .prepare('SELECT id, kode, nama FROM diagnostik ORDER BY kode')
    .all();

  const aturanDiagnostik = db
    .prepare(
      `SELECT ad.id, ad.kode, ad.kondisi_json, ad.id_diagnostik,
              d.kode AS diagnostik_kode, d.nama AS diagnostik_nama
       FROM aturan_diagnostik ad
       JOIN diagnostik d ON d.id = ad.id_diagnostik
       ORDER BY ad.kode`
    )
    .all()
    .map((row) => ({ ...row, kondisi: parseKondisi(row.kondisi_json) }));

  const aturanCf = db
    .prepare(
      `SELECT ac.id, ac.kode, ac.cf_pakar,
              g.kode AS gejala_kode, g.nama AS gejala_nama,
              k.kode AS kerusakan_kode, k.nama AS kerusakan_nama,
              k.jenis_perangkat AS kerusakan_perangkat
       FROM aturan_cf ac
       JOIN gejala g ON g.id = ac.id_gejala
       JOIN kerusakan k ON k.id = ac.id_kerusakan
       ORDER BY ac.kode`
    )
    .all();

  const mapping = db
    .prepare(
      `SELECT d.kode AS diagnostik_kode, d.nama AS diagnostik_nama,
              k.kode AS kerusakan_kode, k.nama AS kerusakan_nama,
              k.jenis_perangkat AS kerusakan_perangkat
       FROM diagnostik_kerusakan dk
       JOIN diagnostik d ON d.id = dk.id_diagnostik
       JOIN kerusakan k ON k.id = dk.id_kerusakan
       ORDER BY d.kode, k.kode`
    )
    .all();

  const ambangRow = db
    .prepare("SELECT nilai FROM pengaturan WHERE kunci = 'ambang_cf'")
    .get();
  const ambangAngka = ambangRow ? parseFloat(ambangRow.nilai) : NaN;
  const ambang = Number.isFinite(ambangAngka) ? ambangAngka : 0.2;

  return { gejala, kerusakan, diagnostik, aturanDiagnostik, aturanCf, mapping, ambang };
}

module.exports = { muatPengetahuan, parseKondisi };

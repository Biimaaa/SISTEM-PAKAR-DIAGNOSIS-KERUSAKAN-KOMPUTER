// Mesin inferensi dua tahap: Forward Chaining (tahap 1) dan
// Certainty Factor (tahap 2). Modul ini tidak bergantung pada Express
// sehingga dapat diuji secara terpisah.

const OPSI_CF_USER = [
  { nilai: 0.0, label: 'Tidak tahu' },
  { nilai: 0.4, label: 'Sedikit yakin' },
  { nilai: 0.6, label: 'Cukup yakin' },
  { nilai: 0.8, label: 'Yakin' },
  { nilai: 1.0, label: 'Sangat yakin' }
];

const CF_USER_NILAI = OPSI_CF_USER.map((o) => o.nilai);

// Format angka gaya Indonesia untuk teks penjelasan.
function angka(n, desimal = 4) {
  const teks = Number(n)
    .toFixed(desimal)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
  return teks.replace('.', ',');
}

function normalisasiGejala(gejalaTerpilih) {
  if (!gejalaTerpilih) return [];

  let daftar = [];
  if (Array.isArray(gejalaTerpilih)) {
    daftar = gejalaTerpilih.map((item) =>
      typeof item === 'string'
        ? { kode: item, cfUser: 1 }
        : { kode: String(item.kode || ''), cfUser: Number(item.cfUser) }
    );
  } else if (typeof gejalaTerpilih === 'object') {
    daftar = Object.entries(gejalaTerpilih).map(([kode, cfUser]) => ({
      kode,
      cfUser: Number(cfUser)
    }));
  }

  const unik = new Map();
  for (const item of daftar) {
    if (!item.kode) continue;
    if (!Number.isFinite(item.cfUser) || item.cfUser <= 0) continue;
    unik.set(item.kode, Math.min(1, Math.max(0, item.cfUser)));
  }

  return Array.from(unik.entries()).map(([kode, cfUser]) => ({ kode, cfUser }));
}

function evaluasiKondisi(kondisi, himpunanGejala) {
  if (!kondisi || !Array.isArray(kondisi.gejala) || kondisi.gejala.length === 0) {
    return false;
  }
  const operator = String(kondisi.operator || 'OR').toUpperCase();
  if (operator === 'AND') {
    return kondisi.gejala.every((kode) => himpunanGejala.has(kode));
  }
  return kondisi.gejala.some((kode) => himpunanGejala.has(kode));
}

function jalankanInferensi({ gejalaTerpilih, pengetahuan, ambang, jenisPerangkat }) {
  const gejalaAktif = normalisasiGejala(gejalaTerpilih);

  if (gejalaAktif.length === 0) {
    return {
      kosong: true,
      pesan: 'Pilih minimal satu gejala',
      dugaan: [],
      hasil: [],
      gejalaTerpilih: [],
      ambang: 0.2
    };
  }

  const petaGejala = new Map((pengetahuan.gejala || []).map((g) => [g.kode, g]));
  const petaKerusakan = new Map(
    (pengetahuan.kerusakan || []).map((k) => [k.kode, k])
  );

  // Hanya gejala yang dikenal basis pengetahuan yang diproses.
  const terpilih = gejalaAktif
    .filter((g) => petaGejala.has(g.kode))
    .map((g) => ({
      kode: g.kode,
      nama: petaGejala.get(g.kode).nama,
      cfUser: g.cfUser
    }));

  if (terpilih.length === 0) {
    return {
      kosong: true,
      pesan: 'Pilih minimal satu gejala',
      dugaan: [],
      hasil: [],
      gejalaTerpilih: [],
      ambang: 0.2
    };
  }

  const himpunanGejala = new Set(terpilih.map((g) => g.kode));
  const cfUserPerGejala = new Map(terpilih.map((g) => [g.kode, g.cfUser]));

  // ---------- Tahap 1: Forward Chaining ----------
  const petaMapping = new Map();
  for (const m of pengetahuan.mapping || []) {
    if (
      jenisPerangkat &&
      m.kerusakan_perangkat !== 'semua' &&
      m.kerusakan_perangkat !== jenisPerangkat
    ) {
      continue;
    }
    if (!petaMapping.has(m.diagnostik_kode)) {
      petaMapping.set(m.diagnostik_kode, []);
    }
    petaMapping.get(m.diagnostik_kode).push({
      kode: m.kerusakan_kode,
      nama: m.kerusakan_nama
    });
  }

  const dugaanMap = new Map();
  for (const aturan of pengetahuan.aturanDiagnostik || []) {
    const kondisi = aturan.kondisi || {
      operator: 'OR',
      gejala: []
    };
    if (!evaluasiKondisi(kondisi, himpunanGejala)) continue;

    const kodeDiagnostik = aturan.diagnostik_kode;
    if (!dugaanMap.has(kodeDiagnostik)) {
      dugaanMap.set(kodeDiagnostik, {
        kode: kodeDiagnostik,
        nama: aturan.diagnostik_nama,
        aturan: [],
        kerusakan: petaMapping.get(kodeDiagnostik) || []
      });
    }
    const grup = dugaanMap.get(kodeDiagnostik);
    if (!grup.aturan.includes(aturan.kode)) {
      grup.aturan.push(aturan.kode);
    }
  }
  const dugaan = Array.from(dugaanMap.values());

  // ---------- Tahap 2: Certainty Factor ----------
  const hasilMap = new Map();

  for (const aturan of pengetahuan.aturanCf || []) {
    // Batasi kerusakan khusus laptop saat pengguna mendiagnosis PC.
    if (
      jenisPerangkat &&
      aturan.kerusakan_perangkat !== 'semua' &&
      aturan.kerusakan_perangkat !== jenisPerangkat
    ) {
      continue;
    }

    if (!cfUserPerGejala.has(aturan.gejala_kode)) continue;

    const cfPakar = Number(aturan.cf_pakar);
    const cfUser = cfUserPerGejala.get(aturan.gejala_kode);
    if (!Number.isFinite(cfPakar) || !Number.isFinite(cfUser)) continue;

    // CF(gejala) = CF pakar x CF user
    const cfGejala = cfPakar * cfUser;

    if (!hasilMap.has(aturan.kerusakan_kode)) {
      const info = petaKerusakan.get(aturan.kerusakan_kode) || {};
      hasilMap.set(aturan.kerusakan_kode, {
        kode: aturan.kerusakan_kode,
        nama: aturan.kerusakan_nama,
        deskripsi: info.deskripsi || '',
        solusi: info.solusi || '',
        jenis_perangkat: info.jenis_perangkat || 'semua',
        cf: 0,
        gejalaPendukung: [],
        langkah: []
      });
    }

    const grup = hasilMap.get(aturan.kerusakan_kode);
    const cfLama = grup.cf;
    // CF gabungan = CF lama + CF baru x (1 - CF lama)
    const cfHasil = cfLama + cfGejala * (1 - cfLama);

    grup.gejalaPendukung.push({
      kode: aturan.gejala_kode,
      nama: aturan.gejala_nama,
      cfPakar,
      cfUser,
      cfGejala
    });

    grup.langkah.push({
      aturan: aturan.kode,
      kodeGejala: aturan.gejala_kode,
      cfPakar,
      cfUser,
      cfGejala,
      cfLama,
      cfBaru: cfGejala,
      cfHasil,
      teksCf: `CF(${aturan.gejala_kode}) = ${angka(cfPakar)} × ${angka(cfUser)} = ${angka(
        cfGejala
      )}`,
      teksGabung: `CF gabungan = ${angka(cfLama)} + ${angka(cfGejala)} × (1 - ${angka(
        cfLama
      )}) = ${angka(cfHasil)}`
    });

    grup.cf = cfHasil;
  }

  const batas = Number.isFinite(Number(ambang))
    ? Number(ambang)
    : Number.isFinite(Number(pengetahuan.ambang))
      ? Number(pengetahuan.ambang)
      : 0.2;

  const hasil = Array.from(hasilMap.values())
    .map((item) => ({
      ...item,
      persentase: Math.round(item.cf * 1000) / 10
    }))
    .filter((item) => item.cf >= batas)
    .sort((a, b) => b.cf - a.cf || a.kode.localeCompare(b.kode));

  return {
    kosong: false,
    pesan: null,
    dugaan,
    hasil,
    gejalaTerpilih: terpilih,
    ambang: batas
  };
}

module.exports = {
  OPSI_CF_USER,
  CF_USER_NILAI,
  normalisasiGejala,
  evaluasiKondisi,
  jalankanInferensi,
  angka
};

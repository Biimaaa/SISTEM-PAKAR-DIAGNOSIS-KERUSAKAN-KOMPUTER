const express = require('express');
const PDFDocument = require('pdfkit');

const { getDb } = require('../db/koneksi');
const { muatPengetahuan } = require('../db/pengetahuan');
const {
  jalankanInferensi,
  OPSI_CF_USER,
  CF_USER_NILAI
} = require('../engine/inference');
const {
  formatTanggal,
  formatPersen,
  formatAngka,
  labelPerangkat
} = require('../utils/format');

const router = express.Router();

function daftarGejala(db, perangkat) {
  return db
    .prepare(
      `SELECT id, kode, nama, jenis_perangkat, kategori
       FROM gejala
       WHERE jenis_perangkat = 'semua' OR jenis_perangkat = ?
       ORDER BY kategori, kode`
    )
    .all(perangkat);
}

function normalisasiArray(nilai) {
  if (Array.isArray(nilai)) return nilai;
  if (typeof nilai === 'string' && nilai !== '') return [nilai];
  return [];
}

function validPerangkat(nilai) {
  return nilai === 'laptop' || nilai === 'pc' ? nilai : null;
}

function buatSnapshot(hasilInferensi) {
  return {
    dugaan: hasilInferensi.dugaan,
    hasil: hasilInferensi.hasil,
    gejalaTerpilih: hasilInferensi.gejalaTerpilih,
    ambang: hasilInferensi.ambang
  };
}

// Mengambil snapshot hasil; bila data lama tidak punya snapshot, hitung ulang.
function ambilHasilDiagnosis(db, diagnosis) {
  if (diagnosis.hasil_json) {
    try {
      const data = JSON.parse(diagnosis.hasil_json);
      if (data && Array.isArray(data.hasil) && Array.isArray(data.dugaan)) {
        return {
          dugaan: data.dugaan,
          hasil: data.hasil,
          gejalaTerpilih: Array.isArray(data.gejalaTerpilih)
            ? data.gejalaTerpilih
            : [],
          ambang: Number.isFinite(Number(data.ambang)) ? Number(data.ambang) : 0.2
        };
      }
    } catch (err) {
      // Lanjut ke perhitungan ulang di bawah.
    }
  }

  const detail = db
    .prepare(
      `SELECT g.kode, d.cf_user
       FROM diagnosis_detail d
       JOIN gejala g ON g.id = d.id_gejala
       WHERE d.id_diagnosis = ?
       ORDER BY g.kode`
    )
    .all(diagnosis.id);

  const hasil = jalankanInferensi({
    gejalaTerpilih: detail.map((d) => ({ kode: d.kode, cfUser: d.cf_user })),
    pengetahuan: muatPengetahuan(db),
    jenisPerangkat: diagnosis.jenis_perangkat
  });
  return buatSnapshot(hasil);
}

router.get('/', (req, res) => {
  const db = getDb();
  const statistik = {
    gejala: db.prepare('SELECT COUNT(*) AS n FROM gejala').get().n,
    kerusakan: db.prepare('SELECT COUNT(*) AS n FROM kerusakan').get().n,
    aturan: db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM aturan_diagnostik) + (SELECT COUNT(*) FROM aturan_cf) AS n'
      )
      .get().n,
    diagnosis: db.prepare('SELECT COUNT(*) AS n FROM diagnosis').get().n
  };
  res.render('beranda', { judul: 'Beranda', statistik });
});

router.get('/diagnosis', (req, res) => {
  res.render('diagnosis/pilih', { judul: 'Mulai Diagnosis' });
});

router.get('/diagnosis/gejala', (req, res) => {
  const perangkat = validPerangkat(req.query.perangkat);
  if (!perangkat) {
    req.session.flash = {
      type: 'warning',
      message: 'Pilih jenis perangkat terlebih dahulu.'
    };
    return res.redirect('/diagnosis');
  }

  const db = getDb();
  const gejala = daftarGejala(db, perangkat);

  res.render('diagnosis/gejala', {
    judul: 'Pilih Gejala',
    perangkat,
    gejala,
    opsiCf: OPSI_CF_USER,
    dipilih: [],
    nilaiCf: {},
    error: null
  });
});

router.post('/diagnosis/proses', (req, res) => {
  const perangkat = validPerangkat(req.body.perangkat);
  if (!perangkat) {
    req.session.flash = {
      type: 'warning',
      message: 'Jenis perangkat tidak valid.'
    };
    return res.redirect('/diagnosis');
  }

  const db = getDb();
  const gejalaTersedia = daftarGejala(db, perangkat);
  const petaGejala = new Map(gejalaTersedia.map((g) => [g.kode, g]));

  const kodeDicentang = normalisasiArray(req.body.gejala)
    .map((kode) => String(kode))
    .filter((kode) => petaGejala.has(kode));

  const nilaiCf = {};
  for (const kode of kodeDicentang) {
    const nilai = Number(req.body[`cf_${kode}`]);
    nilaiCf[kode] = CF_USER_NILAI.includes(nilai) ? nilai : 0;
  }

  const gejalaTerpilih = kodeDicentang
    .map((kode) => ({ kode, cfUser: nilaiCf[kode] }))
    .filter((g) => g.cfUser > 0);

  if (gejalaTerpilih.length === 0) {
    return res.status(400).render('diagnosis/gejala', {
      judul: 'Pilih Gejala',
      perangkat,
      gejala: gejalaTersedia,
      opsiCf: OPSI_CF_USER,
      dipilih: kodeDicentang,
      nilaiCf,
      error: 'Pilih minimal satu gejala'
    });
  }

  const pengetahuan = muatPengetahuan(db);
  const hasilInferensi = jalankanInferensi({
    gejalaTerpilih,
    pengetahuan,
    jenisPerangkat: perangkat
  });
  const snapshot = buatSnapshot(hasilInferensi);
  const utama = snapshot.hasil[0] || null;

  const simpan = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO diagnosis (tanggal, jenis_perangkat, hasil_utama, cf_hasil, hasil_json)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(
        new Date().toISOString(),
        perangkat,
        utama ? utama.kode : null,
        utama ? utama.cf : 0,
        JSON.stringify(snapshot)
      );

    const insertDetail = db.prepare(
      `INSERT INTO diagnosis_detail (id_diagnosis, id_gejala, cf_user)
       VALUES (?, ?, ?)`
    );
    const petaIdGejala = new Map(pengetahuan.gejala.map((g) => [g.kode, g.id]));
    for (const gejala of snapshot.gejalaTerpilih) {
      const idGejala = petaIdGejala.get(gejala.kode);
      if (idGejala) {
        insertDetail.run(info.lastInsertRowid, idGejala, gejala.cfUser);
      }
    }
    return info.lastInsertRowid;
  });

  const idDiagnosis = simpan();
  res.redirect(`/hasil/${idDiagnosis}`);
});

router.get('/hasil/:id', (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return next();
  }

  const db = getDb();
  const diagnosis = db.prepare('SELECT * FROM diagnosis WHERE id = ?').get(id);
  if (!diagnosis) {
    return next();
  }

  const data = ambilHasilDiagnosis(db, diagnosis);
  res.render('hasil', {
    judul: `Hasil Diagnosis #${diagnosis.id}`,
    diagnosis,
    data
  });
});

router.get('/hasil/:id/pdf', (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return next();
  }

  const db = getDb();
  const diagnosis = db.prepare('SELECT * FROM diagnosis WHERE id = ?').get(id);
  if (!diagnosis) {
    return next();
  }

  const data = ambilHasilDiagnosis(db, diagnosis);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="hasil-diagnosis-${diagnosis.id}.pdf"`
  );
  doc.pipe(res);

  const bersih = (teks) =>
    String(teks || '')
      .replace(/×/g, 'x')
      .replace(/−/g, '-');

  doc
    .fontSize(18)
    .fillColor('#0d6efd')
    .text('Sistem Pakar Diagnosis Kerusakan Laptop dan PC', { align: 'center' });
  doc.moveDown(0.2);
  doc
    .fontSize(12)
    .fillColor('#444444')
    .text('Laporan Hasil Diagnosis', { align: 'center' });
  doc.moveDown();

  doc.fillColor('#000000').fontSize(10);
  doc.text(`Nomor diagnosis : #${diagnosis.id}`);
  doc.text(`Tanggal         : ${formatTanggal(diagnosis.tanggal)}`);
  doc.text(`Jenis perangkat : ${labelPerangkat(diagnosis.jenis_perangkat)}`);
  doc.moveDown();

  doc.fontSize(13).fillColor('#0d6efd').text('Dugaan Kelompok Masalah');
  doc.moveDown(0.3);
  doc.fillColor('#000000').fontSize(10);
  if (data.dugaan.length === 0) {
    doc.text('Tidak ada kelompok masalah yang cocok dengan gejala terpilih.');
  } else {
    for (const dugaan of data.dugaan) {
      const kerusakan = (dugaan.kerusakan || [])
        .map((k) => `${k.kode} ${k.nama}`)
        .join(', ');
      doc.text(
        bersih(
          `${dugaan.kode} - ${dugaan.nama} (aturan ${dugaan.aturan.join(', ')})${
            kerusakan ? `; kemungkinan: ${kerusakan}` : ''
          }`
        )
      );
    }
  }
  doc.moveDown();

  doc.fontSize(13).fillColor('#0d6efd').text('Hasil Certainty Factor');
  doc.moveDown(0.3);

  if (data.hasil.length === 0) {
    doc
      .fillColor('#000000')
      .fontSize(10)
      .text(
        `Tidak ada kerusakan dengan nilai CF di atas ambang ${formatAngka(
          data.ambang
        )}.`
      );
  } else {
    data.hasil.forEach((item, indeks) => {
      if (doc.y > 650) doc.addPage();

      doc
        .fillColor('#000000')
        .fontSize(11)
        .text(`${indeks + 1}. ${item.kode} - ${item.nama} | ${formatPersen(item.persentase)}`, {
          continued: false
        });
      if (item.deskripsi) {
        doc.fontSize(9).fillColor('#333333').text(bersih(item.deskripsi));
      }

      doc.moveDown(0.2);
      doc.fontSize(9).fillColor('#000000').text('Gejala pendukung:');
      for (const gejala of item.gejalaPendukung) {
        doc.text(
          bersih(
            `- ${gejala.kode} ${gejala.nama} | CF pakar ${formatAngka(
              gejala.cfPakar
            )} x CF user ${formatAngka(gejala.cfUser)} = ${formatAngka(
              gejala.cfGejala
            )}`
          )
        );
      }

      doc.moveDown(0.2);
      doc.text('Langkah perhitungan:');
      for (const langkah of item.langkah) {
        doc.text(bersih(`- ${langkah.teksCf}`));
        doc.text(bersih(`  ${langkah.teksGabung}`));
      }

      doc.moveDown(0.2);
      doc.text('Saran penanganan:');
      doc.text(bersih(item.solusi));
      doc.moveDown(0.6);
    });
  }

  doc.moveDown();
  doc
    .fontSize(8)
    .fillColor('#666666')
    .text(
      'Catatan: hasil sistem pakar bersifat informatif dan bukan pengganti pemeriksaan teknisi. ' +
        'Hentikan tindakan yang berisiko dan hubungi teknisi bila ragu.',
      { align: 'left' }
    );

  doc.end();
});

router.get('/riwayat', (req, res) => {
  const db = getDb();
  const riwayat = db
    .prepare(
      `SELECT d.id, d.tanggal, d.jenis_perangkat, d.hasil_utama, d.cf_hasil,
              k.nama AS hasil_nama
       FROM diagnosis d
       LEFT JOIN kerusakan k ON k.kode = d.hasil_utama
       ORDER BY d.id DESC
       LIMIT 200`
    )
    .all();

  res.render('riwayat', { judul: 'Riwayat Diagnosis', riwayat });
});

router.get('/tentang', (req, res) => {
  res.render('tentang', { judul: 'Tentang Sistem' });
});

module.exports = router;

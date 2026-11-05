const express = require('express');
const bcrypt = require('bcrypt');

const { getDb } = require('../db/koneksi');
const { parseKondisi } = require('../db/pengetahuan');
const { KATEGORI_GEJALA } = require('../db/data_v2');
const { wajibLogin, sudahLogin } = require('../middleware/auth');
const { pasangToken, verifikasiToken } = require('../middleware/csrf');

const router = express.Router();

function teks(nilai) {
  return String(nilai === undefined || nilai === null ? '' : nilai).trim();
}

function kodeBersih(nilai) {
  return teks(nilai).toUpperCase();
}

function validKode(kode) {
  return /^[A-Za-z0-9_-]{1,16}$/.test(kode);
}

function angkaId(nilai) {
  const n = Number(nilai);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function normalisasiArray(nilai) {
  if (Array.isArray(nilai)) return nilai;
  if (typeof nilai === 'string' && nilai !== '') return [nilai];
  return [];
}

function jenisValid(nilai) {
  return nilai === 'semua' || nilai === 'laptop';
}

function kategoriValid(nilai) {
  return KATEGORI_GEJALA.includes(teks(nilai));
}

function flash(req, type, message) {
  req.session.flash = { type, message };
}

function pesanKesalahan(err, pesanUnik) {
  if (
    err &&
    (err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
      String(err.message || '').includes('UNIQUE'))
  ) {
    return pesanUnik;
  }
  console.error('[ADMIN]', err);
  return 'Terjadi kesalahan saat memproses data. Periksa kembali isian Anda.';
}

// Sinkronisasi kode gejala di kondisi aturan diagnostik saat kode diubah.
function gantiKodeGejalaDiAturan(db, kodeLama, kodeBaru) {
  const aturan = db.prepare('SELECT id, kondisi_json FROM aturan_diagnostik').all();
  const update = db.prepare(
    'UPDATE aturan_diagnostik SET kondisi_json = ? WHERE id = ?'
  );
  for (const a of aturan) {
    const kondisi = parseKondisi(a.kondisi_json);
    if (!kondisi.gejala.includes(kodeLama)) continue;
    const gejalaBaru = kondisi.gejala.map((k) => (k === kodeLama ? kodeBaru : k));
    update.run(JSON.stringify({ operator: kondisi.operator, gejala: gejalaBaru }), a.id);
  }
}

// Menghapus kode gejala dari kondisi aturan; aturan kosong ikut dihapus.
function hapusKodeGejalaDariAturan(db, kode) {
  const aturan = db.prepare('SELECT id, kondisi_json FROM aturan_diagnostik').all();
  const update = db.prepare(
    'UPDATE aturan_diagnostik SET kondisi_json = ? WHERE id = ?'
  );
  const hapus = db.prepare('DELETE FROM aturan_diagnostik WHERE id = ?');
  for (const a of aturan) {
    const kondisi = parseKondisi(a.kondisi_json);
    if (!kondisi.gejala.includes(kode)) continue;
    const sisa = kondisi.gejala.filter((k) => k !== kode);
    if (sisa.length === 0) {
      hapus.run(a.id);
    } else {
      update.run(JSON.stringify({ operator: kondisi.operator, gejala: sisa }), a.id);
    }
  }
}

// ---------- Autentikasi ----------

router.use(pasangToken);
router.use((req, res, next) => {
  if (req.method === 'POST') return verifikasiToken(req, res, next);
  return next();
});

router.get('/login', sudahLogin, (req, res) => {
  res.render('admin/login', {
    judul: 'Login Admin',
    keluar: req.query.keluar === '1'
  });
});

router.post('/login', (req, res, next) => {
  const username = teks(req.body.username);
  const password = String(req.body.password || '');
  const db = getDb();
  const admin = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);

  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    flash(req, 'danger', 'Username atau kata sandi salah.');
    return res.redirect('/admin/login');
  }

  // Regenerasi session untuk mencegah session fixation.
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.adminId = admin.id;
    req.session.adminUser = admin.username;
    req.session.flash = {
      type: 'success',
      message: `Selamat datang, ${admin.username}.`
    };
    req.session.save(() => res.redirect('/admin'));
  });
});

router.use(wajibLogin);

function prosesLogout(req, res) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/admin/login?keluar=1');
  });
}

// POST dipakai tombol di panel; GET disediakan untuk kompatibilitas tautan langsung.
router.post('/logout', prosesLogout);
router.get('/logout', prosesLogout);

// ---------- Dashboard ----------

router.get('/', (req, res) => {
  const db = getDb();
  const jumlah = {
    gejala: db.prepare('SELECT COUNT(*) AS n FROM gejala').get().n,
    kerusakan: db.prepare('SELECT COUNT(*) AS n FROM kerusakan').get().n,
    diagnostik: db.prepare('SELECT COUNT(*) AS n FROM diagnostik').get().n,
    aturanDiagnostik: db.prepare('SELECT COUNT(*) AS n FROM aturan_diagnostik').get().n,
    aturanCf: db.prepare('SELECT COUNT(*) AS n FROM aturan_cf').get().n,
    diagnosis: db.prepare('SELECT COUNT(*) AS n FROM diagnosis').get().n
  };

  const grafik = db
    .prepare(
      `SELECT d.hasil_utama AS kode, k.nama AS nama, COUNT(*) AS jumlah
       FROM diagnosis d
       LEFT JOIN kerusakan k ON k.kode = d.hasil_utama
       WHERE d.hasil_utama IS NOT NULL
       GROUP BY d.hasil_utama
       ORDER BY jumlah DESC, d.hasil_utama
       LIMIT 10`
    )
    .all();

  const chartData = {
    labels: grafik.map((g) => `${g.kode} - ${g.nama || 'Tidak dikenal'}`),
    values: grafik.map((g) => g.jumlah)
  };

  const terbaru = db
    .prepare(
      `SELECT d.id, d.tanggal, d.jenis_perangkat, d.hasil_utama, d.cf_hasil,
              k.nama AS hasil_nama
       FROM diagnosis d
       LEFT JOIN kerusakan k ON k.kode = d.hasil_utama
       ORDER BY d.id DESC
       LIMIT 5`
    )
    .all();

  res.render('admin/dashboard', {
    judul: 'Dashboard Admin',
    active: 'dashboard',
    jumlah,
    chartData,
    terbaru,
    includeChart: true
  });
});

// ---------- CRUD Gejala ----------

router.get('/gejala', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM gejala ORDER BY kode').all();
  const idEdit = angkaId(req.query.edit);
  const edit = idEdit
    ? db.prepare('SELECT * FROM gejala WHERE id = ?').get(idEdit)
    : null;

  res.render('admin/gejala', {
    judul: 'Kelola Gejala',
    active: 'gejala',
    items,
    edit,
    kategoriGejala: KATEGORI_GEJALA
  });
});

router.post('/gejala', (req, res) => {
  const db = getDb();
  const kode = kodeBersih(req.body.kode);
  const nama = teks(req.body.nama);
  const jenis = teks(req.body.jenis_perangkat);
  const kategori = teks(req.body.kategori);

  if (!validKode(kode) || nama.length < 3 || !jenisValid(jenis) || !kategoriValid(kategori)) {
    flash(
      req,
      'danger',
      'Kode wajib 1-16 karakter, nama minimal 3 karakter, jenis perangkat valid, dan kategori wajib dipilih.'
    );
    return res.redirect('/admin/gejala');
  }

  try {
    db.prepare(
      'INSERT INTO gejala (kode, nama, jenis_perangkat, kategori) VALUES (?, ?, ?, ?)'
    ).run(kode, nama, jenis, kategori);
    flash(req, 'success', `Gejala ${kode} berhasil ditambahkan.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode gejala sudah digunakan.'));
  }
  res.redirect('/admin/gejala');
});

router.post('/gejala/:id/update', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const lama = id ? db.prepare('SELECT * FROM gejala WHERE id = ?').get(id) : null;
  if (!lama) {
    flash(req, 'danger', 'Gejala tidak ditemukan.');
    return res.redirect('/admin/gejala');
  }

  const kode = kodeBersih(req.body.kode);
  const nama = teks(req.body.nama);
  const jenis = teks(req.body.jenis_perangkat);
  const kategori = teks(req.body.kategori);

  if (!validKode(kode) || nama.length < 3 || !jenisValid(jenis) || !kategoriValid(kategori)) {
    flash(
      req,
      'danger',
      'Kode wajib 1-16 karakter, nama minimal 3 karakter, jenis perangkat valid, dan kategori wajib dipilih.'
    );
    return res.redirect(`/admin/gejala?edit=${id}`);
  }

  try {
    const simpan = db.transaction(() => {
      db.prepare(
        'UPDATE gejala SET kode = ?, nama = ?, jenis_perangkat = ?, kategori = ? WHERE id = ?'
      ).run(kode, nama, jenis, kategori, id);
      if (kode !== lama.kode) {
        gantiKodeGejalaDiAturan(db, lama.kode, kode);
      }
    });
    simpan();
    flash(req, 'success', `Gejala ${kode} berhasil diperbarui.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode gejala sudah digunakan.'));
  }
  res.redirect('/admin/gejala');
});

router.post('/gejala/:id/hapus', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const gejala = id ? db.prepare('SELECT * FROM gejala WHERE id = ?').get(id) : null;
  if (!gejala) {
    flash(req, 'danger', 'Gejala tidak ditemukan.');
    return res.redirect('/admin/gejala');
  }

  const hapus = db.transaction(() => {
    hapusKodeGejalaDariAturan(db, gejala.kode);
    db.prepare('DELETE FROM gejala WHERE id = ?').run(id);
  });
  hapus();
  flash(
    req,
    'success',
    `Gejala ${gejala.kode} dihapus beserta aturan CF yang memakainya.`
  );
  res.redirect('/admin/gejala');
});

// ---------- CRUD Kerusakan ----------

router.get('/kerusakan', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM kerusakan ORDER BY kode').all();
  const idEdit = angkaId(req.query.edit);
  const edit = idEdit
    ? db.prepare('SELECT * FROM kerusakan WHERE id = ?').get(idEdit)
    : null;

  res.render('admin/kerusakan', {
    judul: 'Kelola Kerusakan',
    active: 'kerusakan',
    items,
    edit
  });
});

router.post('/kerusakan', (req, res) => {
  const db = getDb();
  const kode = kodeBersih(req.body.kode);
  const nama = teks(req.body.nama);
  const deskripsi = teks(req.body.deskripsi);
  const solusi = teks(req.body.solusi);
  const jenis = teks(req.body.jenis_perangkat);

  if (
    !validKode(kode) ||
    nama.length < 3 ||
    deskripsi.length < 10 ||
    solusi.length < 10 ||
    !jenisValid(jenis)
  ) {
    flash(
      req,
      'danger',
      'Periksa kembali kode, nama, jenis perangkat, deskripsi, dan solusi (minimal 10 karakter).'
    );
    return res.redirect('/admin/kerusakan');
  }

  try {
    db.prepare(
      `INSERT INTO kerusakan (kode, nama, deskripsi, solusi, jenis_perangkat)
       VALUES (?, ?, ?, ?, ?)`
    ).run(kode, nama, deskripsi, solusi, jenis);
    flash(req, 'success', `Kerusakan ${kode} berhasil ditambahkan.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode kerusakan sudah digunakan.'));
  }
  res.redirect('/admin/kerusakan');
});

router.post('/kerusakan/:id/update', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const lama = id ? db.prepare('SELECT * FROM kerusakan WHERE id = ?').get(id) : null;
  if (!lama) {
    flash(req, 'danger', 'Kerusakan tidak ditemukan.');
    return res.redirect('/admin/kerusakan');
  }

  const kode = kodeBersih(req.body.kode);
  const nama = teks(req.body.nama);
  const deskripsi = teks(req.body.deskripsi);
  const solusi = teks(req.body.solusi);
  const jenis = teks(req.body.jenis_perangkat);

  if (
    !validKode(kode) ||
    nama.length < 3 ||
    deskripsi.length < 10 ||
    solusi.length < 10 ||
    !jenisValid(jenis)
  ) {
    flash(
      req,
      'danger',
      'Periksa kembali kode, nama, jenis perangkat, deskripsi, dan solusi (minimal 10 karakter).'
    );
    return res.redirect(`/admin/kerusakan?edit=${id}`);
  }

  try {
    const simpan = db.transaction(() => {
      db.prepare(
        `UPDATE kerusakan
         SET kode = ?, nama = ?, deskripsi = ?, solusi = ?, jenis_perangkat = ?
         WHERE id = ?`
      ).run(kode, nama, deskripsi, solusi, jenis, id);
      if (kode !== lama.kode) {
        // Menjaga statistik diagnosis tetap menunjuk kode kerusakan terbaru.
        db.prepare('UPDATE diagnosis SET hasil_utama = ? WHERE hasil_utama = ?').run(
          kode,
          lama.kode
        );
      }
    });
    simpan();
    flash(req, 'success', `Kerusakan ${kode} berhasil diperbarui.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode kerusakan sudah digunakan.'));
  }
  res.redirect('/admin/kerusakan');
});

router.post('/kerusakan/:id/hapus', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const kerusakan = id
    ? db.prepare('SELECT * FROM kerusakan WHERE id = ?').get(id)
    : null;
  if (!kerusakan) {
    flash(req, 'danger', 'Kerusakan tidak ditemukan.');
    return res.redirect('/admin/kerusakan');
  }

  db.prepare('DELETE FROM kerusakan WHERE id = ?').run(id);
  flash(
    req,
    'success',
    `Kerusakan ${kerusakan.kode} dihapus beserta aturan CF dan pemetaan terkait.`
  );
  res.redirect('/admin/kerusakan');
});

// ---------- CRUD Diagnostik + pemetaan ----------

router.get('/diagnostik', (req, res) => {
  const db = getDb();
  const items = db.prepare('SELECT * FROM diagnostik ORDER BY kode').all();
  const idEdit = angkaId(req.query.edit);
  const edit = idEdit
    ? db.prepare('SELECT * FROM diagnostik WHERE id = ?').get(idEdit)
    : null;

  const kerusakan = db.prepare('SELECT * FROM kerusakan ORDER BY kode').all();
  const mapping = new Map();
  for (const row of db
    .prepare('SELECT id_diagnostik, id_kerusakan FROM diagnostik_kerusakan')
    .all()) {
    if (!mapping.has(row.id_diagnostik)) mapping.set(row.id_diagnostik, []);
    mapping.get(row.id_diagnostik).push(row.id_kerusakan);
  }

  res.render('admin/diagnostik', {
    judul: 'Kelola Diagnostik',
    active: 'diagnostik',
    items,
    edit,
    kerusakan,
    mapping
  });
});

router.post('/diagnostik', (req, res) => {
  const db = getDb();
  const kode = kodeBersih(req.body.kode);
  const nama = teks(req.body.nama);

  if (!validKode(kode) || nama.length < 3) {
    flash(req, 'danger', 'Kode dan nama diagnostik wajib diisi dengan benar.');
    return res.redirect('/admin/diagnostik');
  }

  try {
    db.prepare('INSERT INTO diagnostik (kode, nama) VALUES (?, ?)').run(kode, nama);
    flash(req, 'success', `Diagnostik ${kode} berhasil ditambahkan.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode diagnostik sudah digunakan.'));
  }
  res.redirect('/admin/diagnostik');
});

router.post('/diagnostik/:id/update', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const lama = id ? db.prepare('SELECT * FROM diagnostik WHERE id = ?').get(id) : null;
  if (!lama) {
    flash(req, 'danger', 'Diagnostik tidak ditemukan.');
    return res.redirect('/admin/diagnostik');
  }

  const kode = kodeBersih(req.body.kode);
  const nama = teks(req.body.nama);
  if (!validKode(kode) || nama.length < 3) {
    flash(req, 'danger', 'Kode dan nama diagnostik wajib diisi dengan benar.');
    return res.redirect(`/admin/diagnostik?edit=${id}`);
  }

  try {
    db.prepare('UPDATE diagnostik SET kode = ?, nama = ? WHERE id = ?').run(
      kode,
      nama,
      id
    );
    flash(req, 'success', `Diagnostik ${kode} berhasil diperbarui.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode diagnostik sudah digunakan.'));
  }
  res.redirect('/admin/diagnostik');
});

router.post('/diagnostik/:id/hapus', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const diagnostik = id
    ? db.prepare('SELECT * FROM diagnostik WHERE id = ?').get(id)
    : null;
  if (!diagnostik) {
    flash(req, 'danger', 'Diagnostik tidak ditemukan.');
    return res.redirect('/admin/diagnostik');
  }

  db.prepare('DELETE FROM diagnostik WHERE id = ?').run(id);
  flash(
    req,
    'success',
    `Diagnostik ${diagnostik.kode} dihapus beserta aturan dan pemetaan terkait.`
  );
  res.redirect('/admin/diagnostik');
});

router.post('/diagnostik/mapping', (req, res) => {
  const db = getDb();
  const daftarDiagnostik = db.prepare('SELECT id FROM diagnostik').all();
  const idKerusakanValid = new Set(
    db.prepare('SELECT id FROM kerusakan').all().map((k) => k.id)
  );

  const simpan = db.transaction(() => {
    db.prepare('DELETE FROM diagnostik_kerusakan').run();
    const insert = db.prepare(
      'INSERT INTO diagnostik_kerusakan (id_diagnostik, id_kerusakan) VALUES (?, ?)'
    );
    for (const d of daftarDiagnostik) {
      const terpilih = normalisasiArray(req.body[`mapping_${d.id}`])
        .map((nilai) => Number(nilai))
        .filter((id) => idKerusakanValid.has(id));
      for (const idKerusakan of new Set(terpilih)) {
        insert.run(d.id, idKerusakan);
      }
    }
  });

  simpan();
  flash(req, 'success', 'Pemetaan diagnostik ke kerusakan berhasil disimpan.');
  res.redirect('/admin/diagnostik');
});

// ---------- CRUD Aturan Diagnostik ----------

router.get('/aturan-diagnostik', (req, res) => {
  const db = getDb();
  const items = db
    .prepare(
      `SELECT ad.*, d.kode AS diagnostik_kode, d.nama AS diagnostik_nama
       FROM aturan_diagnostik ad
       JOIN diagnostik d ON d.id = ad.id_diagnostik
       ORDER BY ad.kode`
    )
    .all()
    .map((row) => ({ ...row, kondisi: parseKondisi(row.kondisi_json) }));

  const idEdit = angkaId(req.query.edit);
  const edit = idEdit
    ? db
        .prepare('SELECT * FROM aturan_diagnostik WHERE id = ?')
        .get(idEdit)
    : null;
  if (edit) edit.kondisi = parseKondisi(edit.kondisi_json);

  const gejala = db.prepare('SELECT * FROM gejala ORDER BY kode').all();
  const diagnostik = db.prepare('SELECT * FROM diagnostik ORDER BY kode').all();

  res.render('admin/aturan_diagnostik', {
    judul: 'Kelola Aturan Diagnostik',
    active: 'aturan-diagnostik',
    items,
    edit,
    gejala,
    diagnostik
  });
});

router.post('/aturan-diagnostik', (req, res) => {
  const db = getDb();
  const kode = kodeBersih(req.body.kode);
  const idDiagnostik = angkaId(req.body.id_diagnostik);
  const operator = teks(req.body.operator).toUpperCase() === 'AND' ? 'AND' : 'OR';
  const kodeGejalaValid = db.prepare('SELECT kode FROM gejala').all().map((g) => g.kode);
  const gejala = normalisasiArray(req.body.gejala)
    .map((g) => String(g))
    .filter((g) => kodeGejalaValid.includes(g));

  if (!validKode(kode) || !idDiagnostik || gejala.length === 0) {
    flash(
      req,
      'danger',
      'Kode, diagnostik, dan minimal satu gejala harus diisi dengan benar.'
    );
    return res.redirect('/admin/aturan-diagnostik');
  }

  const diagnostik = db
    .prepare('SELECT id FROM diagnostik WHERE id = ?')
    .get(idDiagnostik);
  if (!diagnostik) {
    flash(req, 'danger', 'Diagnostik yang dipilih tidak ditemukan.');
    return res.redirect('/admin/aturan-diagnostik');
  }

  try {
    db.prepare(
      `INSERT INTO aturan_diagnostik (kode, kondisi_json, id_diagnostik)
       VALUES (?, ?, ?)`
    ).run(kode, JSON.stringify({ operator, gejala }), idDiagnostik);
    flash(req, 'success', `Aturan ${kode} berhasil ditambahkan.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode aturan sudah digunakan.'));
  }
  res.redirect('/admin/aturan-diagnostik');
});

router.post('/aturan-diagnostik/:id/update', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const lama = id
    ? db.prepare('SELECT * FROM aturan_diagnostik WHERE id = ?').get(id)
    : null;
  if (!lama) {
    flash(req, 'danger', 'Aturan diagnostik tidak ditemukan.');
    return res.redirect('/admin/aturan-diagnostik');
  }

  const kode = kodeBersih(req.body.kode);
  const idDiagnostik = angkaId(req.body.id_diagnostik);
  const operator = teks(req.body.operator).toUpperCase() === 'AND' ? 'AND' : 'OR';
  const kodeGejalaValid = db.prepare('SELECT kode FROM gejala').all().map((g) => g.kode);
  const gejala = normalisasiArray(req.body.gejala)
    .map((g) => String(g))
    .filter((g) => kodeGejalaValid.includes(g));

  if (!validKode(kode) || !idDiagnostik || gejala.length === 0) {
    flash(
      req,
      'danger',
      'Kode, diagnostik, dan minimal satu gejala harus diisi dengan benar.'
    );
    return res.redirect(`/admin/aturan-diagnostik?edit=${id}`);
  }

  const diagnostik = db
    .prepare('SELECT id FROM diagnostik WHERE id = ?')
    .get(idDiagnostik);
  if (!diagnostik) {
    flash(req, 'danger', 'Diagnostik yang dipilih tidak ditemukan.');
    return res.redirect(`/admin/aturan-diagnostik?edit=${id}`);
  }

  try {
    db.prepare(
      `UPDATE aturan_diagnostik
       SET kode = ?, kondisi_json = ?, id_diagnostik = ?
       WHERE id = ?`
    ).run(kode, JSON.stringify({ operator, gejala }), idDiagnostik, id);
    flash(req, 'success', `Aturan ${kode} berhasil diperbarui.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode aturan sudah digunakan.'));
  }
  res.redirect('/admin/aturan-diagnostik');
});

router.post('/aturan-diagnostik/:id/hapus', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const aturan = id
    ? db.prepare('SELECT * FROM aturan_diagnostik WHERE id = ?').get(id)
    : null;
  if (!aturan) {
    flash(req, 'danger', 'Aturan diagnostik tidak ditemukan.');
    return res.redirect('/admin/aturan-diagnostik');
  }

  db.prepare('DELETE FROM aturan_diagnostik WHERE id = ?').run(id);
  flash(req, 'success', `Aturan ${aturan.kode} berhasil dihapus.`);
  res.redirect('/admin/aturan-diagnostik');
});

// ---------- CRUD Aturan CF ----------

router.get('/aturan-cf', (req, res) => {
  const db = getDb();
  const items = db
    .prepare(
      `SELECT ac.*, g.kode AS gejala_kode, g.nama AS gejala_nama,
              k.kode AS kerusakan_kode, k.nama AS kerusakan_nama
       FROM aturan_cf ac
       JOIN gejala g ON g.id = ac.id_gejala
       JOIN kerusakan k ON k.id = ac.id_kerusakan
       ORDER BY ac.kode`
    )
    .all();

  const idEdit = angkaId(req.query.edit);
  const edit = idEdit ? db.prepare('SELECT * FROM aturan_cf WHERE id = ?').get(idEdit) : null;
  const gejala = db.prepare('SELECT * FROM gejala ORDER BY kode').all();
  const kerusakan = db.prepare('SELECT * FROM kerusakan ORDER BY kode').all();

  res.render('admin/aturan_cf', {
    judul: 'Kelola Aturan CF',
    active: 'aturan-cf',
    items,
    edit,
    gejala,
    kerusakan
  });
});

router.post('/aturan-cf', (req, res) => {
  const db = getDb();
  const kode = kodeBersih(req.body.kode);
  const idGejala = angkaId(req.body.id_gejala);
  const idKerusakan = angkaId(req.body.id_kerusakan);
  const cfPakar = Number(req.body.cf_pakar);

  if (
    !validKode(kode) ||
    !idGejala ||
    !idKerusakan ||
    !Number.isFinite(cfPakar) ||
    cfPakar < 0 ||
    cfPakar > 1
  ) {
    flash(
      req,
      'danger',
      'Kode, gejala, kerusakan wajib valid, dan CF pakar harus antara 0 sampai 1.'
    );
    return res.redirect('/admin/aturan-cf');
  }

  const gejala = db.prepare('SELECT id FROM gejala WHERE id = ?').get(idGejala);
  const kerusakan = db
    .prepare('SELECT id FROM kerusakan WHERE id = ?')
    .get(idKerusakan);
  if (!gejala || !kerusakan) {
    flash(req, 'danger', 'Gejala atau kerusakan yang dipilih tidak ditemukan.');
    return res.redirect('/admin/aturan-cf');
  }

  const duplikat = db
    .prepare(
      'SELECT id FROM aturan_cf WHERE id_gejala = ? AND id_kerusakan = ?'
    )
    .get(idGejala, idKerusakan);
  if (duplikat) {
    flash(req, 'danger', 'Pasangan gejala dan kerusakan tersebut sudah punya aturan.');
    return res.redirect('/admin/aturan-cf');
  }

  try {
    db.prepare(
      `INSERT INTO aturan_cf (kode, id_gejala, id_kerusakan, cf_pakar)
       VALUES (?, ?, ?, ?)`
    ).run(kode, idGejala, idKerusakan, cfPakar);
    flash(req, 'success', `Aturan ${kode} berhasil ditambahkan.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode aturan sudah digunakan.'));
  }
  res.redirect('/admin/aturan-cf');
});

router.post('/aturan-cf/:id/update', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const lama = id ? db.prepare('SELECT * FROM aturan_cf WHERE id = ?').get(id) : null;
  if (!lama) {
    flash(req, 'danger', 'Aturan CF tidak ditemukan.');
    return res.redirect('/admin/aturan-cf');
  }

  const kode = kodeBersih(req.body.kode);
  const idGejala = angkaId(req.body.id_gejala);
  const idKerusakan = angkaId(req.body.id_kerusakan);
  const cfPakar = Number(req.body.cf_pakar);

  if (
    !validKode(kode) ||
    !idGejala ||
    !idKerusakan ||
    !Number.isFinite(cfPakar) ||
    cfPakar < 0 ||
    cfPakar > 1
  ) {
    flash(
      req,
      'danger',
      'Kode, gejala, kerusakan wajib valid, dan CF pakar harus antara 0 sampai 1.'
    );
    return res.redirect(`/admin/aturan-cf?edit=${id}`);
  }

  const gejala = db.prepare('SELECT id FROM gejala WHERE id = ?').get(idGejala);
  const kerusakan = db
    .prepare('SELECT id FROM kerusakan WHERE id = ?')
    .get(idKerusakan);
  if (!gejala || !kerusakan) {
    flash(req, 'danger', 'Gejala atau kerusakan yang dipilih tidak ditemukan.');
    return res.redirect(`/admin/aturan-cf?edit=${id}`);
  }

  const duplikat = db
    .prepare(
      'SELECT id FROM aturan_cf WHERE id_gejala = ? AND id_kerusakan = ? AND id <> ?'
    )
    .get(idGejala, idKerusakan, id);
  if (duplikat) {
    flash(req, 'danger', 'Pasangan gejala dan kerusakan tersebut sudah punya aturan.');
    return res.redirect(`/admin/aturan-cf?edit=${id}`);
  }

  try {
    db.prepare(
      `UPDATE aturan_cf
       SET kode = ?, id_gejala = ?, id_kerusakan = ?, cf_pakar = ?
       WHERE id = ?`
    ).run(kode, idGejala, idKerusakan, cfPakar, id);
    flash(req, 'success', `Aturan ${kode} berhasil diperbarui.`);
  } catch (err) {
    flash(req, 'danger', pesanKesalahan(err, 'Kode aturan sudah digunakan.'));
  }
  res.redirect('/admin/aturan-cf');
});

router.post('/aturan-cf/:id/hapus', (req, res) => {
  const db = getDb();
  const id = angkaId(req.params.id);
  const aturan = id ? db.prepare('SELECT * FROM aturan_cf WHERE id = ?').get(id) : null;
  if (!aturan) {
    flash(req, 'danger', 'Aturan CF tidak ditemukan.');
    return res.redirect('/admin/aturan-cf');
  }

  db.prepare('DELETE FROM aturan_cf WHERE id = ?').run(id);
  flash(req, 'success', `Aturan ${aturan.kode} berhasil dihapus.`);
  res.redirect('/admin/aturan-cf');
});

// ---------- Riwayat ----------

router.get('/riwayat', (req, res) => {
  const db = getDb();
  const riwayat = db
    .prepare(
      `SELECT d.id, d.tanggal, d.jenis_perangkat, d.hasil_utama, d.cf_hasil,
              k.nama AS hasil_nama
       FROM diagnosis d
       LEFT JOIN kerusakan k ON k.kode = d.hasil_utama
       ORDER BY d.id DESC`
    )
    .all();

  res.render('admin/riwayat', {
    judul: 'Riwayat Diagnosis',
    active: 'riwayat',
    riwayat,
    includeDataTables: true
  });
});

// ---------- Pengaturan ----------

router.get('/pengaturan', (req, res) => {
  const db = getDb();
  const baris = db
    .prepare("SELECT nilai FROM pengaturan WHERE kunci = 'ambang_cf'")
    .get();
  const ambang = baris ? baris.nilai : '0.2';

  res.render('admin/pengaturan', {
    judul: 'Pengaturan',
    active: 'pengaturan',
    ambang
  });
});

router.post('/pengaturan/ambang', (req, res) => {
  const db = getDb();
  const ambang = Number(req.body.ambang_cf);
  if (!Number.isFinite(ambang) || ambang < 0 || ambang > 1) {
    flash(req, 'danger', 'Ambang CF harus berupa angka antara 0 sampai 1.');
    return res.redirect('/admin/pengaturan');
  }

  db.prepare(
    `INSERT INTO pengaturan (kunci, nilai) VALUES ('ambang_cf', ?)
     ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai`
  ).run(String(ambang));
  flash(req, 'success', 'Ambang CF berhasil diperbarui.');
  res.redirect('/admin/pengaturan');
});

router.post('/pengaturan/password', (req, res) => {
  const db = getDb();
  const lama = String(req.body.password_lama || '');
  const baru = String(req.body.password_baru || '');
  const konfirmasi = String(req.body.password_konfirmasi || '');

  const admin = db
    .prepare('SELECT * FROM admin WHERE id = ?')
    .get(req.session.adminId);
  if (!admin) {
    flash(req, 'danger', 'Akun admin tidak ditemukan. Silakan login ulang.');
    return res.redirect('/admin/login');
  }

  if (!bcrypt.compareSync(lama, admin.password_hash)) {
    flash(req, 'danger', 'Kata sandi lama tidak sesuai.');
    return res.redirect('/admin/pengaturan');
  }
  if (baru.length < 6) {
    flash(req, 'danger', 'Kata sandi baru minimal 6 karakter.');
    return res.redirect('/admin/pengaturan');
  }
  if (baru !== konfirmasi) {
    flash(req, 'danger', 'Konfirmasi kata sandi baru tidak cocok.');
    return res.redirect('/admin/pengaturan');
  }

  const hash = bcrypt.hashSync(baru, 10);
  db.prepare('UPDATE admin SET password_hash = ? WHERE id = ?').run(hash, admin.id);
  flash(req, 'success', 'Kata sandi berhasil diganti.');
  res.redirect('/admin/pengaturan');
});

module.exports = router;

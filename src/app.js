const path = require('path');
const express = require('express');
const session = require('express-session');

const { getDb } = require('./db/koneksi');
const publik = require('./routes/publik');
const admin = require('./routes/admin');
const { formatTanggal, formatPersen, formatAngka, labelPerangkat } = require('./utils/format');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Aset statis dan parser form.
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));

// Session httpOnly. Ganti SESSION_SECRET lewat environment saat produksi.
app.use(
  session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET || 'sistem-pakar-laptop-secret-ubah-di-produksi',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// Data umum untuk seluruh view.
app.use((req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  res.locals.adminUser = req.session.adminUser || null;
  res.locals.tahun = new Date().getFullYear();
  next();
});

app.locals.formatTanggal = formatTanggal;
app.locals.formatPersen = formatPersen;
app.locals.formatAngka = formatAngka;
app.locals.labelPerangkat = labelPerangkat;

app.use('/', publik);
app.use('/admin', admin);

// Halaman 404.
app.use((req, res) => {
  res.status(404).render('error/404');
});

// Penanganan error terpusat; stack trace hanya dicatat di server.
app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status === 403) {
    return res.status(403).render('error/403');
  }
  console.error('[ERROR]', err);
  return res.status(500).render('error/500');
});

function mulai() {
  const db = getDb();
  try {
    db.prepare('SELECT COUNT(*) AS n FROM gejala').get();
  } catch (err) {
    console.error('Database belum siap. Jalankan "npm run seed" terlebih dahulu.');
    process.exit(1);
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Sistem Pakar berjalan di http://localhost:${port}`);
  });
}

if (require.main === module) {
  mulai();
}

module.exports = app;

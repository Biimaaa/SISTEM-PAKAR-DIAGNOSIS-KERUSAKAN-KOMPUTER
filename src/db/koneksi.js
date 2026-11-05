const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

// Lokasi file database dapat dioverride lewat env DB_PATH (dipakai saat test).
const DB_PATH = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', '..', 'data', 'database.sqlite');

let koneksi = null;

function buatKoneksi(file = DB_PATH) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('foreign_keys = ON');
  if (file !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  return db;
}

// Koneksi tunggal untuk aplikasi.
function getDb() {
  if (!koneksi) {
    koneksi = buatKoneksi();
  }
  return koneksi;
}

function tutupDb() {
  if (koneksi) {
    koneksi.close();
    koneksi = null;
  }
}

module.exports = { DB_PATH, buatKoneksi, getDb, tutupDb };

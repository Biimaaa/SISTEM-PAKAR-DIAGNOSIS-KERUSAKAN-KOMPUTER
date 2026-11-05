function formatTanggal(nilai) {
  const tanggal = new Date(nilai);
  if (Number.isNaN(tanggal.getTime())) return nilai || '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(tanggal);
}

function formatPersen(nilai) {
  const angka = Number(nilai);
  if (!Number.isFinite(angka)) return '0,0%';
  return `${angka.toFixed(1).replace('.', ',')}%`;
}

function formatAngka(nilai, desimal = 4) {
  let teks = Number(nilai)
    .toFixed(desimal)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
  if (teks === '' || teks === '-0') teks = '0';
  return teks.replace('.', ',');
}

function labelPerangkat(nilai) {
  return nilai === 'laptop' ? 'Laptop' : 'PC / Desktop';
}

module.exports = { formatTanggal, formatPersen, formatAngka, labelPerangkat };

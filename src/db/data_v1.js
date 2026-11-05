// Master data versi 1. Dipakai oleh test migrasi untuk membangun database tertua.
const DATA_KERUSAKAN = [
  {
    kode: 'K01',
    nama: 'RAM bermasalah',
    deskripsi:
      'Modul memori (RAM) tidak terbaca stabil, kotor, atau rusak sehingga komputer bisa gagal menampilkan gambar, berbunyi beep berulang, atau mati saat digunakan.',
    solusi: [
      '1. Matikan komputer dan cabut sumber daya. Untuk laptop, lepaskan baterai bila mudah dilepas.',
      '2. Buka penutup RAM, keluarkan modul, lalu bersihkan pin tembaga dengan penghapus pensil secara hati-hati.',
      '3. Pasang kembali modul sampai terdengar klik dan pengait terkunci, lalu nyalakan komputer.',
      '4. Jika bunyi beep atau layar hitam tetap muncul, bawa ke teknisi untuk pengujian dan penggantian RAM.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K02',
    nama: 'Hard disk/SSD rusak',
    deskripsi:
      'Media penyimpanan mengalami bad sector atau kerusakan mekanis, menyebabkan booting lambat, file corrupt, atau bunyi klik.',
    solusi: [
      '1. Segera cadangkan data penting ke flashdisk atau penyimpanan eksternal selama komputer masih bisa menyala.',
      '2. Matikan komputer, lalu periksa kabel data dan daya hard disk (khusus PC) agar terpasang rapat.',
      '3. Nyalakan komputer dan periksa kesehatan disk memakai alat pemeriksa SMART bila tersedia.',
      '4. Jika muncul bunyi klik atau data sering hilang, hentikan pemakaian dan bawa ke teknisi untuk penggantian disk.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K03',
    nama: 'Overheating / kipas rusak',
    deskripsi:
      'Suhu komponen terlalu tinggi karena kipas kotor/rusak atau aliran udara buruk sehingga komputer mati atau restart sendiri.',
    solusi: [
      '1. Matikan komputer dan cabut sumber daya, lalu letakkan di permukaan datar yang tidak menutup ventilasi.',
      '2. Bersihkan debu pada ventilasi dan kipas memakai kuas lembut atau udara bertekanan rendah.',
      '3. Pastikan kipas berputar normal saat komputer menyala dan hindari memakai laptop di atas kasur.',
      '4. Jika kipas tidak berputar atau suhu tetap tinggi, bawa ke teknisi untuk pembersihan dan penggantian thermal paste/kipas.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K04',
    nama: 'Power supply (PSU) lemah',
    deskripsi:
      'Pasokan daya tidak stabil atau kekurangan daya sehingga komputer tidak menyala, mati sendiri, atau restart saat beban tinggi.',
    solusi: [
      '1. Periksa kabel daya dan stopkontak, lalu coba colokkan ke stopkontak lain yang diketahui berfungsi.',
      '2. Lepaskan perangkat tambahan yang tidak diperlukan untuk mengurangi beban daya.',
      '3. Untuk PC, pastikan sakelar di belakang PSU sudah menyala dan kabel 24-pin terpasang rapat.',
      '4. Jika tetap tidak menyala atau sering mati, bawa PSU ke teknisi untuk diuji; jangan membuka casing PSU sendiri karena berbahaya.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K05',
    nama: 'Baterai/charger rusak (khusus laptop)',
    deskripsi:
      'Baterai atau adaptor charger laptop tidak lagi mampu menyimpan atau menyalurkan daya dengan baik.',
    solusi: [
      '1. Periksa sambungan adaptor charger dan pastikan lampu indikator pengisian menyala.',
      '2. Coba charger lain yang sesuai spesifikasi bila tersedia, dan hindari memakai charger sembarangan.',
      '3. Lepaskan baterai bila model laptop memungkinkan, lalu pasang kembali dengan posisi yang benar.',
      '4. Jika baterai cepat habis atau tidak mengisi sama sekali, bawa laptop dan charger ke teknisi untuk penggantian.'
    ].join('\n'),
    jenis_perangkat: 'laptop'
  },
  {
    kode: 'K06',
    nama: 'VGA/GPU bermasalah',
    deskripsi:
      'Kartu grafis atau chip grafis mengalami gangguan sehingga muncul garis-garis, kedip, atau tampilan tidak normal.',
    solusi: [
      '1. Simpan pekerjaan, lalu restart komputer dan pasang kembali kabel monitor ke port yang benar.',
      '2. Untuk PC, matikan komputer, lepaskan kartu grafis, bersihkan pin dengan hati-hati, lalu pasang kembali sampai rapat.',
      '3. Perbarui driver grafis dari situs resmi pembuat perangkat bila komputer masih bisa menyala normal.',
      '4. Jika garis-garis tetap muncul, bawa ke teknisi untuk pengujian GPU; hindari memaksa menekan komponen.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K07',
    nama: 'Motherboard rusak',
    deskripsi:
      'Papan utama mengalami kerusakan jalur, komponen daya, atau chip sehingga komputer tidak tampil meski indikator menyala.',
    solusi: [
      '1. Cabut sumber daya, lepaskan perangkat tambahan (USB, kartu ekspansi), lalu coba nyalakan kembali.',
      '2. Untuk PC, periksa kabel daya utama dan kabel front panel agar tidak longgar.',
      '3. Jangan membongkar motherboard sendiri; coba lakukan reset CMOS hanya bila Anda yakin dengan prosedurnya.',
      '4. Segera bawa ke teknisi untuk pemeriksaan motherboard karena kerusakan papan utama memerlukan alat khusus.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K08',
    nama: 'Sistem operasi/driver error',
    deskripsi:
      'Berkas sistem operasi atau driver bermasalah sehingga muncul blue screen, aplikasi crash, atau booting gagal.',
    solusi: [
      '1. Cadangkan data penting, lalu restart komputer dan masuk ke Safe Mode bila memungkinkan.',
      '2. Perbarui atau rollback driver perangkat yang baru dipasang melalui Device Manager.',
      '3. Jalankan pemindaian sistem (sfc /scannow) bila Anda terbiasa memakai Command Prompt.',
      '4. Jika masalah berlanjut, bawa ke teknisi untuk instalasi ulang sistem operasi setelah data dicadangkan.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K09',
    nama: 'Virus/malware',
    deskripsi:
      'Perangkat terinfeksi program berbahaya yang dapat menampilkan iklan, memperlambat sistem, atau merusak berkas.',
    solusi: [
      '1. Putuskan koneksi internet sementara dan cadangkan data penting ke media yang bersih.',
      '2. Perbarui antivirus yang tepercaya, lalu jalankan pemindaian penuh.',
      '3. Hapus program atau ekstensi browser yang tidak dikenal dan hindari mengunduh dari situs tidak resmi.',
      '4. Jika iklan atau pop-up tetap muncul, bawa ke teknisi untuk pembersihan menyeluruh atau instalasi ulang sistem.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K10',
    nama: 'Layar/LCD rusak (khusus laptop)',
    deskripsi:
      'Panel layar laptop pecah atau backlight mati sehingga tampilan tidak muncul, bergaris, atau gelap.',
    solusi: [
      '1. Hubungkan laptop ke monitor eksternal untuk memastikan apakah masalah ada pada layar atau sistem.',
      '2. Hindari menekan atau menutup laptop dengan benda di atas keyboard karena dapat memperparah kerusakan panel.',
      '3. Jangan membongkar panel layar sendiri; kabel fleksibel layar mudah rusak.',
      '4. Bawa laptop ke teknisi untuk pemeriksaan kabel fleksibel dan penggantian panel LCD bila diperlukan.'
    ].join('\n'),
    jenis_perangkat: 'laptop'
  }
];

const DATA_GEJALA = [
  ['G01', 'Komputer tidak menyala sama sekali', 'semua'],
  ['G02', 'Menyala tetapi layar hitam', 'semua'],
  ['G03', 'Bunyi beep berulang', 'semua'],
  ['G04', 'Mati atau restart sendiri', 'semua'],
  ['G05', 'Kipas berisik atau bodi sangat panas', 'semua'],
  ['G06', 'Muncul blue screen', 'semua'],
  ['G07', 'Booting sangat lambat', 'semua'],
  ['G08', 'Terdengar bunyi klik dari hard disk', 'semua'],
  ['G09', 'Layar bergaris atau berkedip', 'semua'],
  ['G10', 'Baterai tidak mengisi atau cepat habis (laptop)', 'laptop'],
  ['G11', 'File sering corrupt atau hilang', 'semua'],
  ['G12', 'Iklan atau pop-up muncul sendiri', 'semua'],
  ['G13', 'Aplikasi sering crash atau not responding', 'semua'],
  ['G14', 'Lampu indikator menyala tetapi tidak ada tampilan dan tidak ada bunyi beep', 'semua'],
  ['G15', 'Layar pecah atau backlight mati (laptop)', 'laptop']
];

const DATA_DIAGNOSTIK = [
  ['D01', 'Masalah daya dan papan utama'],
  ['D02', 'Masalah memori'],
  ['D03', 'Masalah penyimpanan'],
  ['D04', 'Masalah suhu'],
  ['D05', 'Masalah tampilan'],
  ['D06', 'Masalah perangkat lunak']
];

const DATA_ATURAN_DIAGNOSTIK = [
  { kode: 'A01', operator: 'OR', gejala: ['G01', 'G04'], diagnostik: 'D01' },
  { kode: 'A02', operator: 'OR', gejala: ['G10'], diagnostik: 'D01' },
  { kode: 'A03', operator: 'OR', gejala: ['G14'], diagnostik: 'D01' },
  { kode: 'A04', operator: 'AND', gejala: ['G02', 'G03'], diagnostik: 'D02' },
  { kode: 'A05', operator: 'OR', gejala: ['G07', 'G08', 'G11'], diagnostik: 'D03' },
  { kode: 'A06', operator: 'OR', gejala: ['G04', 'G05'], diagnostik: 'D04' },
  { kode: 'A07', operator: 'OR', gejala: ['G09', 'G15'], diagnostik: 'D05' },
  { kode: 'A08', operator: 'OR', gejala: ['G06', 'G12', 'G13'], diagnostik: 'D06' }
];

const DATA_MAPPING_DIAGNOSTIK = {
  D01: ['K04', 'K05', 'K07'],
  D02: ['K01'],
  D03: ['K02'],
  D04: ['K03'],
  D05: ['K06', 'K10'],
  D06: ['K08', 'K09']
};

const DATA_ATURAN_CF = [
  ['R01', 'G02', 'K01', 0.6],
  ['R02', 'G03', 'K01', 0.8],
  ['R03', 'G06', 'K01', 0.5],
  ['R04', 'G04', 'K03', 0.7],
  ['R05', 'G05', 'K03', 0.8],
  ['R06', 'G07', 'K02', 0.6],
  ['R07', 'G08', 'K02', 0.9],
  ['R08', 'G09', 'K06', 0.8],
  ['R09', 'G10', 'K05', 0.8],
  ['R10', 'G01', 'K04', 0.7],
  ['R11', 'G04', 'K04', 0.6],
  ['R12', 'G14', 'K07', 0.9],
  ['R13', 'G01', 'K07', 0.5],
  ['R14', 'G11', 'K02', 0.6],
  ['R15', 'G06', 'K08', 0.7],
  ['R16', 'G13', 'K08', 0.6],
  ['R17', 'G07', 'K09', 0.4],
  ['R18', 'G12', 'K09', 0.9],
  ['R19', 'G15', 'K10', 0.9],
  ['R20', 'G09', 'K10', 0.4]
];

module.exports = {
  DATA_KERUSAKAN,
  DATA_GEJALA,
  DATA_DIAGNOSTIK,
  DATA_ATURAN_DIAGNOSTIK,
  DATA_MAPPING_DIAGNOSTIK,
  DATA_ATURAN_CF
};

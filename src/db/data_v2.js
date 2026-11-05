// Master data versi 2: dipakai npm run seed (instalasi baru)
// dan npm run seed:update (migrasi idempoten dari database versi 1).

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
  },
  {
    kode: 'K11',
    nama: 'Keyboard atau touchpad rusak',
    deskripsi:
      'Tombol keyboard tidak merespons atau mengetik sendiri, dan touchpad tidak merespons, biasanya karena kabel fleksibel longgar, kelembapan, atau kerusakan internal.',
    solusi: [
      '1. Matikan laptop, lalu bersihkan celah tombol dan permukaan touchpad dengan kuas lembut atau kain kering.',
      '2. Uji keyboard dan touchpad di pengaturan sistem untuk melihat tombol mana yang tidak berfungsi.',
      '3. Perbarui atau instal ulang driver keyboard/touchpad melalui Device Manager bila komputer mengizinkan.',
      '4. Jika tombol tetap mengetik sendiri atau touchpad mati total, bawa ke teknisi untuk pemeriksaan kabel fleksibel atau penggantian part.'
    ].join('\n'),
    jenis_perangkat: 'laptop'
  },
  {
    kode: 'K12',
    nama: 'Port USB atau konektor bermasalah',
    deskripsi:
      'Port USB tidak mengenali perangkat yang dipasang karena koneksi mantul, tp pin bengkok, atau driver port bermasalah.',
    solusi: [
      '1. Uji perangkat USB yang sama ke port atau komputer lain untuk memastikan perangkat masih baik.',
      '2. Matikan komputer, lalu periksa port dan bersihkan debu dengan kuas lembut; jangan memaksa perangkat masuk.',
      '3. Perbarui atau instal ulang driver USB melalui Device Manager.',
      '4. Jika port tetap mati atau longgar, bawa ke teknisi untuk pemeriksaan jalur port di motherboard.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K13',
    nama: 'Audio/speaker bermasalah',
    deskripsi:
      'Tidak ada suara, suara pecah, atau sangat pelan; biasanya karena pengaturan/disable driver audio, atau kerusakan modul speaker.',
    solusi: [
      '1. Periksa ikon volume dan pastikan perangkat keluaran yang benar (speaker) sudah dipilih.',
      '2. Perbarui atau instal ulang driver audio melalui Device Manager.',
      '3. Uji dengan earphone/earpiece keluaran lain; bila earphone berbunyi, kemungkinan speaker rusak.',
      '4. Jika speaker menguak suara pecah terus, bawa ke teknisi untuk penggantian modul speaker.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K14',
    nama: 'Modul WiFi/jaringan bermasalah',
    deskripsi:
      'Jaringan nirkabel tidak terdeteksi atau sinyal sering terputus karena driver jaringan bermasalah atau modul WiFi rusak.',
    solusi: [
      '1. Pastikan tombol/switch WiFi tidak dalam keadaan mati (pesawat/flight mode) dan router beroperasi normal.',
      '2. Restart laptop dan router WiFi, lalu hubungkan kembali ke jaringan dengan kata sandi yang benar.',
      '3. Perbarui atau instal ulang driver jaringan nirkabel melalui situs resmi produsen.',
      '4. Bila WiFi tetap tidak terdeteksi di beberapa perangkat/jaringan lain, bawa ke teknisi untuk penggantian modul WiFi.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K15',
    nama: 'Baterai CMOS lemah',
    deskripsi:
      'Baterai CMOS di motherboard lemah sehingga pengaturan BIOS, tanggal, dan jam terus kembali ke default setiap komputer dinyalakan.',
    solusi: [
      '1. Catat pengaturan BIOS penting sebelum mengganti baterai CMOS.',
      '2. Matikan komputer dan cabut sumber daya; untuk PC ganti baterai CR2032 pada motherboard.',
      '3. Untuk laptop, penggantian menjadi lebih teknis; bila yakin lihat manual, atau langsung bawa ke teknisi.',
      '4. Setelah diganti, masuk BIOS untuk menset ulang tanggal, jam, dan pengaturan dasar.'
    ].join('\n'),
    jenis_perangkat: 'semua'
  },
  {
    kode: 'K16',
    nama: 'Engsel atau kabel fleksibel layar bermasalah',
    deskripsi:
      'Engsel layar longgar atau kabel fleksibel mulai tergelinciak sehingga layar mati/kedip saat digerakkan.',
    solusi: [
      '1. Hindari menggerakkan dan membuka layar terlalu lebar untuk sementara untuk mengurangi beban pada kabel fleksibel.',
      '2. Rapatkan baut engsel eksternal yang terlihat dengan obeng yang sesuai.',
      '3. Uji dengan menghubungkan laptop ke monitor eksternal untuk memastikan masalah ada di layar/kabel fleksibel.',
      '4. Jika layar tetap mati saat digerakkan, bawa ke teknisi untuk penggantian kabel fleksibel atau engsel.'
    ].join('\n'),
    jenis_perangkat: 'laptop'
  }
];

const DATA_GEJALA = [
  ['G01', 'Komputer tidak menyala sama sekali', 'semua', 'Daya dan papan utama'],
  ['G02', 'Menyala tetapi layar hitam', 'semua', 'Memori'],
  ['G03', 'Bunyi beep berulang', 'semua', 'Memori'],
  ['G04', 'Mati atau restart sendiri', 'semua', 'Daya dan papan utama'],
  ['G05', 'Kipas berisik atau bodi sangat panas', 'semua', 'Suhu'],
  ['G06', 'Muncul blue screen', 'semua', 'Perangkat lunak'],
  ['G07', 'Booting sangat lambat', 'semua', 'Penyimpanan dan boot'],
  ['G08', 'Terdengar bunyi klik dari hard disk', 'semua', 'Penyimpanan dan boot'],
  ['G09', 'Layar bergaris atau berkedip', 'semua', 'Tampilan'],
  ['G10', 'Baterai tidak mengisi atau cepat habis', 'laptop', 'Daya dan papan utama'],
  ['G11', 'File sering corrupt atau hilang', 'semua', 'Penyimpanan dan boot'],
  ['G12', 'Iklan atau pop-up muncul sendiri', 'semua', 'Perangkat lunak'],
  ['G13', 'Aplikasi sering crash atau not responding', 'semua', 'Perangkat lunak'],
  ['G14', 'Lampu indikator menyala tetapi tidak ada tampilan dan tidak ada bunyi beep', 'semua', 'Daya dan papan utama'],
  ['G15', 'Layar pecah atau backlight mati', 'laptop', 'Tampilan'],
  ['G16', 'Tombol keyboard tidak berfungsi atau mengetik sendiri', 'laptop', 'Periferal dan konektivitas'],
  ['G17', 'Touchpad atau kursor tidak merespons', 'laptop', 'Periferal dan konektivitas'],
  ['G18', 'Port USB tidak mengenali perangkat', 'semua', 'Periferal dan konektivitas'],
  ['G19', 'Tidak ada suara atau suara speaker pecah', 'semua', 'Periferal dan konektivitas'],
  ['G20', 'WiFi tidak terdeteksi atau sering terputus', 'semua', 'Periferal dan konektivitas'],
  ['G21', 'Tanggal dan jam kembali ke default setiap dinyalakan', 'semua', 'Daya dan papan utama'],
  ['G22', 'Muncul pesan No bootable device atau Operating system not found', 'semua', 'Penyimpanan dan boot'],
  ['G23', 'Layar redup atau warna tidak normal (kekuningan, kebiruan, pudar)', 'semua', 'Tampilan'],
  ['G24', 'Muncul bintik mati, garis vertikal, atau bercak pada layar', 'semua', 'Tampilan'],
  ['G25', 'Gambar normal di layar eksternal tetapi tidak muncul di layar laptop', 'laptop', 'Tampilan'],
  ['G26', 'Kipas tidak berputar sama sekali', 'semua', 'Suhu'],
  ['G27', 'Performa turun drastis saat menjalankan game atau aplikasi berat', 'semua', 'Suhu'],
  ['G28', 'Baterai menggembung atau bodi laptop terangkat', 'laptop', 'Daya dan papan utama'],
  ['G29', 'Charger atau adaptor sangat panas atau berbau gosong', 'semua', 'Daya dan papan utama'],
  ['G30', 'Muncul bintik warna atau kotak-kotak pada tampilan saat game', 'semua', 'Tampilan'],
  ['G31', 'Komputer menyala beberapa detik lalu mati', 'semua', 'Daya dan papan utama'],
  ['G32', 'Muncul pesan Disk read error atau peringatan SMART', 'semua', 'Penyimpanan dan boot'],
  ['G33', 'Kapasitas RAM terbaca kurang dari yang terpasang', 'semua', 'Memori'],
  ['G34', 'Webcam atau mikrofon tidak terdeteksi', 'laptop', 'Periferal dan konektivitas'],
  ['G35', 'Engsel layar longgar atau layar mati saat digerakkan', 'laptop', 'Tampilan']
];

const DATA_DIAGNOSTIK = [
  ['D01', 'Masalah daya dan papan utama'],
  ['D02', 'Masalah memori'],
  ['D03', 'Masalah penyimpanan'],
  ['D04', 'Masalah suhu'],
  ['D05', 'Masalah tampilan'],
  ['D06', 'Masalah perangkat lunak'],
  ['D07', 'Masalah periferal dan konektivitas']
];

const DATA_ATURAN_DIAGNOSTIK = [
  { kode: 'A01', operator: 'OR', gejala: ['G01', 'G04'], diagnostik: 'D01' },
  { kode: 'A02', operator: 'OR', gejala: ['G10'], diagnostik: 'D01' },
  { kode: 'A03', operator: 'OR', gejala: ['G14'], diagnostik: 'D01' },
  { kode: 'A04', operator: 'AND', gejala: ['G02', 'G03'], diagnostik: 'D02' },
  { kode: 'A05', operator: 'OR', gejala: ['G07', 'G08', 'G11'], diagnostik: 'D03' },
  { kode: 'A06', operator: 'OR', gejala: ['G04', 'G05'], diagnostik: 'D04' },
  { kode: 'A07', operator: 'OR', gejala: ['G09', 'G15'], diagnostik: 'D05' },
  { kode: 'A08', operator: 'OR', gejala: ['G06', 'G12', 'G13'], diagnostik: 'D06' },
  { kode: 'A09', operator: 'OR', gejala: ['G16', 'G17'], diagnostik: 'D07' },
  { kode: 'A10', operator: 'OR', gejala: ['G18', 'G19', 'G34'], diagnostik: 'D07' },
  { kode: 'A11', operator: 'OR', gejala: ['G20'], diagnostik: 'D07' },
  { kode: 'A12', operator: 'OR', gejala: ['G21', 'G28', 'G29', 'G31'], diagnostik: 'D01' },
  { kode: 'A13', operator: 'OR', gejala: ['G23', 'G24', 'G25', 'G30', 'G35'], diagnostik: 'D05' },
  { kode: 'A14', operator: 'OR', gejala: ['G26', 'G27'], diagnostik: 'D04' },
  { kode: 'A15', operator: 'OR', gejala: ['G22', 'G32'], diagnostik: 'D03' },
  { kode: 'A16', operator: 'OR', gejala: ['G33'], diagnostik: 'D02' }
];

const DATA_MAPPING_DIAGNOSTIK = {
  D01: ['K04', 'K05', 'K07', 'K15'],
  D02: ['K01'],
  D03: ['K02'],
  D04: ['K03'],
  D05: ['K06', 'K10', 'K16'],
  D06: ['K08', 'K09'],
  D07: ['K11', 'K12', 'K13', 'K14']
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
  ['R20', 'G09', 'K10', 0.4],
  ['R21', 'G16', 'K11', 0.9],
  ['R22', 'G17', 'K11', 0.9],
  ['R23', 'G18', 'K12', 0.8],
  ['R24', 'G19', 'K13', 0.8],
  ['R25', 'G34', 'K12', 0.6],
  ['R26', 'G20', 'K14', 0.9],
  ['R27', 'G21', 'K15', 0.9],
  ['R28', 'G22', 'K02', 0.8],
  ['R29', 'G22', 'K08', 0.5],
  ['R30', 'G32', 'K02', 0.9],
  ['R31', 'G33', 'K01', 0.9],
  ['R32', 'G23', 'K10', 0.6],
  ['R33', 'G24', 'K10', 0.8],
  ['R34', 'G25', 'K10', 0.9],
  ['R35', 'G26', 'K03', 0.8],
  ['R36', 'G27', 'K03', 0.6],
  ['R37', 'G28', 'K05', 0.9],
  ['R38', 'G29', 'K05', 0.7],
  ['R39', 'G29', 'K04', 0.5],
  ['R40', 'G30', 'K06', 0.9],
  ['R41', 'G31', 'K04', 0.7],
  ['R42', 'G31', 'K07', 0.4],
  ['R43', 'G35', 'K16', 0.9],
  ['R44', 'G23', 'K06', 0.3]
];

const KATEGORI_GEJALA = [
  'Daya dan papan utama',
  'Memori',
  'Penyimpanan dan boot',
  'Suhu',
  'Tampilan',
  'Perangkat lunak',
  'Periferal dan konektivitas',
  'Lainnya'
];

module.exports = {
  DATA_KERUSAKAN,
  DATA_GEJALA,
  DATA_DIAGNOSTIK,
  DATA_ATURAN_DIAGNOSTIK,
  DATA_MAPPING_DIAGNOSTIK,
  DATA_ATURAN_CF,
  KATEGORI_GEJALA
};

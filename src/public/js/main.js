// Interaksi ringan halaman pengguna dan admin.
document.addEventListener('DOMContentLoaded', function () {
  // Aktifkan pilihan keyakinan hanya jika gejala dicentang.
  var checkboxGejala = document.querySelectorAll('[data-gejala-checkbox]');
  var penghitung = document.getElementById('jumlah-gejala-dipilih');

  function perbaruiJumlah() {
    if (!penghitung) return;
    var jumlah = document.querySelectorAll('[data-gejala-checkbox]:checked').length;
    penghitung.textContent = jumlah;
  }

  checkboxGejala.forEach(function (checkbox) {
    var item = checkbox.closest('.gejala-item');
    var select = item ? item.querySelector('[data-cf-select]') : null;

    function sinkron() {
      if (select) select.disabled = !checkbox.checked;
      if (item) item.classList.toggle('terpilih', checkbox.checked);
      perbaruiJumlah();
    }

    checkbox.addEventListener('change', sinkron);
    sinkron();
  });

  // Konfirmasi aksi hapus.
  document.querySelectorAll('form[data-konfirmasi]').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      var pesan = form.getAttribute('data-konfirmasi') || 'Yakin ingin menghapus data ini?';
      if (!window.confirm(pesan)) event.preventDefault();
    });
  });

  // Pencarian gejala pada form diagnosis (filter langsung via JavaScript).
  var kolomCariGejala = document.getElementById('cariGejala');
  if (kolomCariGejala) {
    var pesanKosong = document.getElementById('tidakDitemukan');
    var tombolBukaSemua = document.getElementById('bukaSemuaGrup');

    function bukaGrup(element) {
      var item = element.closest('.accordion-item');
      var panel = item ? item.querySelector('.accordion-collapse') : null;
      if (item && panel && !panel.classList.contains('show')) {
        var tombol = item.querySelector('.accordion-button');
        if (tombol) tombol.classList.remove('collapsed');
        if (window.bootstrap && window.bootstrap.Collapse) {
          var objek = window.bootstrap.Collapse.getOrCreateInstance(panel);
          objek.show();
        } else {
          panel.classList.add('show');
        }
        item.setAttribute('aria-expanded', 'true');
      }
    }

    kolomCariGejala.addEventListener('input', function () {
      var kata = kolomCariGejala.value.trim().toLowerCase();
      var adaHasil = false;

      document.querySelectorAll('[data-gejala-item]').forEach(function (item) {
        var cocok = kata === '' || item.getAttribute('data-cari').includes(kata);
        item.classList.toggle('d-none', !cocok);
        if (cocok) {
          adaHasil = true;
          if (kata !== '') bukaGrup(item);
        }
      });

      // Kelompok yang seluruh itemnya tersembunyi ikut disembunyikan.
      document.querySelectorAll('.accordion-item[data-grup]').forEach(function (grup) {
        var itemTampil = grup.querySelectorAll('[data-gejala-item]:not(.d-none)');
        var grupItem = grup.closest('.accordion'); // pembungkus untuk tabel admin
        var pembungkus = grupItem || grup;
        pembungkus.classList.toggle('d-none', itemTampil.length === 0 && kata !== '');
      });

      if (pesanKosong) pesanKosong.classList.toggle('d-none', adaHasil || kata === '');
    });

    if (tombolBukaSemua) {
      tombolBukaSemua.addEventListener('click', function () {
        kolomCariGejala.value = '';
        kolomCariGejala.dispatchEvent(new Event('input'));
        document.querySelectorAll('.accordion-collapse').forEach(function (panel) {
          if (window.bootstrap && window.bootstrap.Collapse) {
            window.bootstrap.Collapse.getOrCreateInstance(panel).show();
          } else {
            panel.classList.add('show');
          }
        });
      });
    }
  }

  // Tombol "Tampilkan semua" pada halaman hasil diagnosis.
  var tombolSisanya = document.getElementById('btnTampilkanSisanya');
  if (tombolSisanya) {
    tombolSisanya.addEventListener('click', function () {
      document.querySelectorAll('tr[data-grup-sisa]').forEach(function (baris) {
        baris.classList.remove('d-none');
      });
      tombolSisanya.classList.add('d-none');
    });
  }
});

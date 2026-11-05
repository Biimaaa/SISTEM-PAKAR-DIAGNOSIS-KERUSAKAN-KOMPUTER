// Middleware autentikasi admin berbasis session.
function wajibLogin(req, res, next) {
  if (req.session && req.session.adminId) return next();

  req.session.flash = {
    type: 'warning',
    message: 'Silakan masuk terlebih dahulu untuk mengakses halaman admin.'
  };
  return res.redirect('/admin/login');
}

// Mencegah halaman login dibuka lagi saat sudah masuk.
function sudahLogin(req, res, next) {
  if (req.session && req.session.adminId) return res.redirect('/admin');
  return next();
}

module.exports = { wajibLogin, sudahLogin };

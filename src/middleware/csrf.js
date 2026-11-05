const crypto = require('crypto');

// Membuat token CSRF per session dan menyediakannya ke view.
function pasangToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function tokenSama(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
}

// Menolak POST admin yang tidak membawa token session yang sah.
function verifikasiToken(req, res, next) {
  const token = req.body && req.body._csrf;
  if (!tokenSama(token, req.session.csrfToken)) {
    const err = new Error('Token CSRF tidak valid atau sudah kedaluwarsa.');
    err.status = 403;
    return next(err);
  }
  next();
}

module.exports = { pasangToken, verifikasiToken };

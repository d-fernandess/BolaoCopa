const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'bolao-copa-2026-secret';

function auth(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Token inválido' }); }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

module.exports = { auth, adminOnly, JWT_SECRET };

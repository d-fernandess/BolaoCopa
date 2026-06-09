const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../db');
const { auth, JWT_SECRET } = require('../middleware');

// Register — via invite token
router.post('/register', (req, res) => {
  const { name, email, password, invite_token } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

  const db = getDB();
  if (db.prepare(`SELECT id FROM users WHERE email=?`).get(email))
    return res.status(409).json({ error: 'E-mail já cadastrado' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`INSERT INTO users(name,email,password) VALUES(?,?,?)`).run(name, email, hash);
  const userId = result.lastInsertRowid;

  // If invite_token provided, create pending membership
  if (invite_token) {
    const bolao = db.prepare(`SELECT id FROM boloes WHERE invite_token=?`).get(invite_token);
    if (bolao) {
      db.prepare(`INSERT OR IGNORE INTO memberships(bolao_id,user_id,approved) VALUES(?,?,0)`).run(bolao.id, userId);
    }
  }

  res.json({ message: 'Cadastro realizado! Aguarde aprovação do administrador.' });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  const db = getDB();
  const user = db.prepare(`SELECT * FROM users WHERE email=?`).get(email);
  if (!user || !bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'E-mail ou senha incorretos' });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET, { expiresIn: '60d' }
  );
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// Me
router.get('/me', auth, (req, res) => {
  const user = getDB().prepare(`SELECT id,name,email,role FROM users WHERE id=?`).get(req.user.id);
  res.json(user);
});

// Lookup invite token (for pre-filling bolão name on register page)
router.get('/invite/:token', (req, res) => {
  const bolao = getDB().prepare(`SELECT id,name,description FROM boloes WHERE invite_token=?`).get(req.params.token);
  if (!bolao) return res.status(404).json({ error: 'Convite inválido' });
  res.json(bolao);
});

module.exports = router;

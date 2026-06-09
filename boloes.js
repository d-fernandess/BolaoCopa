const router = require('express').Router();
const { getDB } = require('../db');
const { auth, adminOnly } = require('../middleware');

router.use(auth);

router.get('/mine', (req, res) => {
  const rows = getDB().prepare(`SELECT * FROM palpites WHERE user_id=?`).all(req.user.id);
  res.json(rows);
});

router.post('/batch', (req, res) => {
  const { palpites } = req.body;
  if (!Array.isArray(palpites)) return res.status(400).json({ error: 'Formato inválido' });
  const db = getDB();
  const upsert = db.prepare(`INSERT INTO palpites(user_id,match_id,g1,g2) VALUES(?,?,?,?)
    ON CONFLICT(user_id,match_id) DO UPDATE SET g1=excluded.g1,g2=excluded.g2`);
  const getMatch = db.prepare(`SELECT locked FROM matches WHERE id=?`);
  let saved = 0;
  palpites.forEach(({ match_id, g1, g2 }) => {
    if (match_id===undefined||g1===undefined||g2===undefined) return;
    const m = getMatch.get(match_id);
    if (!m || m.locked) return;
    upsert.run(req.user.id, match_id, g1, g2);
    saved++;
  });
  res.json({ saved });
});

// Bonus palpites
router.get('/bonus', (req, res) => {
  const row = getDB().prepare(`SELECT * FROM bonus_palpites WHERE user_id=?`).get(req.user.id);
  res.json(row || { campeao:'', vice:'', artilheiro:'' });
});

router.post('/bonus', (req, res) => {
  const { campeao, vice, artilheiro } = req.body;
  getDB().prepare(`INSERT INTO bonus_palpites(user_id,campeao,vice,artilheiro) VALUES(?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET campeao=excluded.campeao,vice=excluded.vice,artilheiro=excluded.artilheiro`)
    .run(req.user.id, campeao||'', vice||'', artilheiro||'');
  res.json({ ok: true });
});

// Admin: bonus config
router.get('/bonus-config', (req, res) => {
  const row = getDB().prepare(`SELECT * FROM bonus_config WHERE id=1`).get();
  res.json(row || {});
});

router.post('/bonus-config', adminOnly, (req, res) => {
  const { campeao, vice, artilheiro } = req.body;
  getDB().prepare(`UPDATE bonus_config SET campeao=?,vice=?,artilheiro=? WHERE id=1`).run(campeao||'',vice||'',artilheiro||'');
  res.json({ ok: true });
});

// Admin: list all users
router.get('/admin/users', adminOnly, (req, res) => {
  const rows = getDB().prepare(`SELECT id,name,email,role,created_at FROM users ORDER BY created_at DESC`).all();
  res.json(rows);
});

module.exports = router;

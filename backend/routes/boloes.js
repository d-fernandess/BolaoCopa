const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../db');
const { auth, adminOnly } = require('../middleware');

router.use(auth);

// List bolões for current user
router.get('/', (req, res) => {
  const db = getDB();
  let rows;
  if (req.user.role === 'admin') {
    rows = db.prepare(`
      SELECT b.*, COUNT(m.user_id) as member_count
      FROM boloes b LEFT JOIN memberships m ON b.id=m.bolao_id AND m.approved=1
      GROUP BY b.id ORDER BY b.created_at DESC
    `).all();
  } else {
    rows = db.prepare(`
      SELECT b.*, COUNT(m2.user_id) as member_count
      FROM boloes b
      JOIN memberships m ON b.id=m.bolao_id AND m.user_id=? AND m.approved=1
      LEFT JOIN memberships m2 ON b.id=m2.bolao_id AND m2.approved=1
      GROUP BY b.id ORDER BY b.created_at DESC
    `).all(req.user.id);
  }
  res.json(rows);
});

// Get single bolão (with members)
router.get('/:id', (req, res) => {
  const db = getDB();
  const bolao = db.prepare(`SELECT * FROM boloes WHERE id=?`).get(req.params.id);
  if (!bolao) return res.status(404).json({ error: 'Bolão não encontrado' });
  if (req.user.role !== 'admin') {
    const m = db.prepare(`SELECT approved FROM memberships WHERE bolao_id=? AND user_id=?`).get(req.params.id, req.user.id);
    if (!m || !m.approved) return res.status(403).json({ error: 'Acesso negado' });
  }
  const members = db.prepare(`
    SELECT u.id,u.name,u.email, mem.approved FROM users u
    JOIN memberships mem ON u.id=mem.user_id WHERE mem.bolao_id=?
    ORDER BY mem.approved DESC, u.name ASC
  `).all(req.params.id);
  res.json({ ...bolao, members });
});

// Create bolão (admin only)
router.post('/', adminOnly, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const db = getDB();
  const token = uuidv4().replace(/-/g,'').slice(0,12); // short token
  const result = db.prepare(`INSERT INTO boloes(name,description,invite_token,created_by) VALUES(?,?,?,?)`).run(name, description||'', token, req.user.id);
  // Admin auto-approved as member
  db.prepare(`INSERT OR IGNORE INTO memberships(bolao_id,user_id,approved) VALUES(?,?,1)`).run(result.lastInsertRowid, req.user.id);
  const bolao = db.prepare(`SELECT * FROM boloes WHERE id=?`).get(result.lastInsertRowid);
  res.json(bolao);
});

// Update bolão
router.patch('/:id', adminOnly, (req, res) => {
  const { name, description } = req.body;
  getDB().prepare(`UPDATE boloes SET name=?,description=? WHERE id=?`).run(name, description||'', req.params.id);
  res.json({ ok: true });
});

// Delete bolão
router.delete('/:id', adminOnly, (req, res) => {
  const db = getDB();
  db.prepare(`DELETE FROM memberships WHERE bolao_id=?`).run(req.params.id);
  db.prepare(`DELETE FROM boloes WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

// Regenerate invite token
router.post('/:id/new-token', adminOnly, (req, res) => {
  const token = uuidv4().replace(/-/g,'').slice(0,12);
  getDB().prepare(`UPDATE boloes SET invite_token=? WHERE id=?`).run(token, req.params.id);
  res.json({ invite_token: token });
});

// Pending members
router.get('/:id/pending', adminOnly, (req, res) => {
  const rows = getDB().prepare(`
    SELECT u.id,u.name,u.email,mem.joined_at FROM users u
    JOIN memberships mem ON u.id=mem.user_id
    WHERE mem.bolao_id=? AND mem.approved=0 ORDER BY mem.joined_at ASC
  `).all(req.params.id);
  res.json(rows);
});

// Approve member
router.patch('/:id/members/:uid/approve', adminOnly, (req, res) => {
  getDB().prepare(`UPDATE memberships SET approved=1 WHERE bolao_id=? AND user_id=?`).run(req.params.id, req.params.uid);
  res.json({ ok: true });
});

// Remove member
router.delete('/:id/members/:uid', adminOnly, (req, res) => {
  getDB().prepare(`DELETE FROM memberships WHERE bolao_id=? AND user_id=?`).run(req.params.id, req.params.uid);
  res.json({ ok: true });
});

// Ranking for bolão
router.get('/:id/ranking', (req, res) => {
  const db = getDB();
  if (req.user.role !== 'admin') {
    const m = db.prepare(`SELECT approved FROM memberships WHERE bolao_id=? AND user_id=?`).get(req.params.id, req.user.id);
    if (!m || !m.approved) return res.status(403).json({ error: 'Acesso negado' });
  }
  const members = db.prepare(`
    SELECT u.id,u.name FROM users u
    JOIN memberships mem ON u.id=mem.user_id WHERE mem.bolao_id=? AND mem.approved=1
  `).all(req.params.id);
  const matches = db.prepare(`SELECT * FROM matches WHERE result_g1 IS NOT NULL`).all();
  const phases  = db.prepare(`SELECT * FROM phases`).all();
  const multMap = Object.fromEntries(phases.map(p => [p.id, p.multiplier]));
  const bonusCfg = db.prepare(`SELECT * FROM bonus_config WHERE id=1`).get() || {};

  const ranking = members.map(u => {
    let pts=0, exact=0, winners=0, knockout=0, bonus=0;
    matches.forEach(m => {
      const pal = db.prepare(`SELECT * FROM palpites WHERE user_id=? AND match_id=?`).get(u.id, m.id);
      if (!pal) return;
      const s = calcScore(pal.g1, pal.g2, m.result_g1, m.result_g2, multMap[m.phase_id]||1);
      pts += s.total; if(s.exact) exact++; if(s.hitWinner) winners++;
      if(m.phase_id !== 'grupos') knockout += s.total;
    });
    const bp = db.prepare(`SELECT * FROM bonus_palpites WHERE user_id=?`).get(u.id) || {};
    if (bonusCfg.campeao    && bp.campeao    && norm(bp.campeao)    === norm(bonusCfg.campeao))    bonus += 30;
    if (bonusCfg.vice       && bp.vice       && norm(bp.vice)       === norm(bonusCfg.vice))       bonus += 15;
    if (bonusCfg.artilheiro && bp.artilheiro && norm(bp.artilheiro) === norm(bonusCfg.artilheiro)) bonus += 10;
    pts += bonus;
    return { ...u, pts, exact, winners, knockout, bonus };
  }).sort((a,b) => b.pts-a.pts || b.exact-a.exact || b.winners-a.winners || b.knockout-a.knockout);

  res.json(ranking);
});

function norm(s) { return (s||'').trim().toLowerCase(); }

function calcScore(pg1, pg2, rg1, rg2, mult) {
  const exact = pg1===rg1 && pg2===rg2;
  const pW = pg1>pg2?1:pg1<pg2?2:0, rW = rg1>rg2?1:rg1<rg2?2:0;
  const hitWinner = pW===rW;
  if (exact) return { total: Math.round(10*mult), exact:true, hitWinner:true };
  if (!hitWinner) return { total:0, exact:false, hitWinner:false };
  const vg = rW===1?rg1:rg2, pg = rW===1?pg1:pg2;
  const base = pg===vg ? 7 : 5;
  return { total: Math.round(base*mult), exact:false, hitWinner:true };
}

module.exports = router;

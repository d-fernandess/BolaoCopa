const router = require('express').Router();
const { getDB } = require('../db');
const { auth, adminOnly } = require('../middleware');

router.use(auth);

router.get('/', (req, res) => {
  const rows = getDB().prepare(`
    SELECT m.*, p.label as phase_label, p.sort_order, p.multiplier
    FROM matches m JOIN phases p ON m.phase_id=p.id
    ORDER BY p.sort_order, m.match_date, m.id
  `).all();
  res.json(rows);
});

router.get('/phases', (req, res) => {
  const rows = getDB().prepare(`
    SELECT DISTINCT p.id,p.label,p.sort_order,p.multiplier
    FROM phases p JOIN matches m ON p.id=m.phase_id
    ORDER BY p.sort_order
  `).all();
  res.json(rows);
});

router.post('/', adminOnly, (req, res) => {
  const { phase_id, team1, team2, match_time, match_date } = req.body;
  if (!phase_id || !team1 || !team2) return res.status(400).json({ error: 'Dados incompletos' });
  if (phase_id === 'grupos') return res.status(400).json({ error: 'Fase de grupos é fixa' });
  const r = getDB().prepare(`INSERT INTO matches(phase_id,team1,team2,match_time,match_date) VALUES(?,?,?,?,?)`).run(phase_id,team1,team2,match_time||'A definir',match_date||'');
  res.json({ id: r.lastInsertRowid });
});

router.patch('/:id/result', adminOnly, (req, res) => {
  const { g1, g2 } = req.body;
  if (g1===undefined||g2===undefined) return res.status(400).json({ error: 'Placar incompleto' });
  getDB().prepare(`UPDATE matches SET result_g1=?,result_g2=?,locked=1 WHERE id=?`).run(g1,g2,req.params.id);
  res.json({ ok: true });
});

router.delete('/:id', adminOnly, (req, res) => {
  const db = getDB();
  const m = db.prepare(`SELECT phase_id FROM matches WHERE id=?`).get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Não encontrado' });
  if (m.phase_id==='grupos') return res.status(400).json({ error: 'Fase de grupos é fixa' });
  db.prepare(`DELETE FROM palpites WHERE match_id=?`).run(req.params.id);
  db.prepare(`DELETE FROM matches WHERE id=?`).run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;

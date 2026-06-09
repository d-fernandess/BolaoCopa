const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'bolao.db');
let db;

function getDB() {
  if (!db) db = new Database(DB_PATH);
  return db;
}

function initDB() {
  const db = getDB();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT DEFAULT 'player',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS boloes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      description  TEXT DEFAULT '',
      invite_token TEXT UNIQUE NOT NULL,
      created_by   INTEGER NOT NULL,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memberships (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      bolao_id  INTEGER NOT NULL,
      user_id   INTEGER NOT NULL,
      approved  INTEGER DEFAULT 0,
      joined_at TEXT DEFAULT (datetime('now')),
      UNIQUE(bolao_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS phases (
      id         TEXT PRIMARY KEY,
      label      TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      multiplier REAL NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS matches (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id   TEXT NOT NULL,
      grp        TEXT,
      team1      TEXT NOT NULL,
      team2      TEXT NOT NULL,
      match_time TEXT,
      match_date TEXT,
      result_g1  INTEGER,
      result_g2  INTEGER,
      locked     INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS palpites (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id  INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      g1       INTEGER NOT NULL,
      g2       INTEGER NOT NULL,
      UNIQUE(user_id, match_id)
    );

    CREATE TABLE IF NOT EXISTS bonus_config (
      id          INTEGER PRIMARY KEY DEFAULT 1,
      campeao     TEXT DEFAULT '',
      vice        TEXT DEFAULT '',
      artilheiro  TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS bonus_palpites (
      user_id    INTEGER PRIMARY KEY,
      campeao    TEXT DEFAULT '',
      vice       TEXT DEFAULT '',
      artilheiro TEXT DEFAULT ''
    );
  `);

  // Phases
  const phases = [
    ['grupos',   'Fase de Grupos',   1, 1.0],
    ['oitavas',  'Oitavas de Final', 2, 1.5],
    ['quartas',  'Quartas de Final', 3, 2.0],
    ['semis',    'Semifinal',        4, 2.5],
    ['terceiro', '3º Lugar',         5, 2.0],
    ['final',    'Final',            6, 3.0],
  ];
  const ip = db.prepare(`INSERT OR IGNORE INTO phases(id,label,sort_order,multiplier) VALUES(?,?,?,?)`);
  phases.forEach(p => ip.run(...p));

  // bonus_config row
  db.prepare(`INSERT OR IGNORE INTO bonus_config(id) VALUES(1)`).run();

  // Seed group matches
  const existing = db.prepare(`SELECT COUNT(*) as c FROM matches WHERE phase_id='grupos'`).get();
  if (existing.c === 0) {
    const im = db.prepare(`INSERT INTO matches(phase_id,grp,team1,team2,match_time,match_date) VALUES(?,?,?,?,?,?)`);
    const gm = [
      // GRUPO A
      ['grupos','A','🇲🇽 México','🇿🇦 África do Sul','11/06 · 16h · Cid. México','2026-06-11'],
      ['grupos','A','🇰🇷 Coreia do Sul','🇨🇿 Rep. Tcheca','11/06 · 23h · Guadalajara','2026-06-11'],
      ['grupos','A','🇲🇽 México','🇨🇿 Rep. Tcheca','18/06 · 13h · Atlanta','2026-06-18'],
      ['grupos','A','🇿🇦 África do Sul','🇰🇷 Coreia do Sul','18/06 · 22h · Guadalajara','2026-06-18'],
      ['grupos','A','🇲🇽 México','🇰🇷 Coreia do Sul','24/06 · 22h · Cid. México','2026-06-24'],
      ['grupos','A','🇿🇦 África do Sul','🇨🇿 Rep. Tcheca','24/06 · 22h · Monterrey','2026-06-24'],
      // GRUPO B
      ['grupos','B','🇨🇦 Canadá','🇧🇦 Bósnia','12/06 · 16h · Toronto','2026-06-12'],
      ['grupos','B','🇶🇦 Catar','🇨🇭 Suíça','13/06 · 16h · Santa Clara','2026-06-13'],
      ['grupos','B','🇨🇦 Canadá','🇨🇭 Suíça','18/06 · 16h · Inglewood','2026-06-18'],
      ['grupos','B','🇧🇦 Bósnia','🇶🇦 Catar','18/06 · 19h · Vancouver','2026-06-18'],
      ['grupos','B','🇨🇦 Canadá','🇶🇦 Catar','24/06 · 16h · Vancouver','2026-06-24'],
      ['grupos','B','🇧🇦 Bósnia','🇨🇭 Suíça','24/06 · 16h · Seattle','2026-06-24'],
      // GRUPO C
      ['grupos','C','🇧🇷 Brasil','🇲🇦 Marrocos','13/06 · 19h · East Rutherford','2026-06-13'],
      ['grupos','C','🇭🇹 Haiti','🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escócia','13/06 · 22h · Foxborough','2026-06-13'],
      ['grupos','C','🇧🇷 Brasil','🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escócia','19/06 · 19h · Foxborough','2026-06-19'],
      ['grupos','C','🇲🇦 Marrocos','🇭🇹 Haiti','19/06 · 21h30 · Filadélfia','2026-06-19'],
      ['grupos','C','🇧🇷 Brasil','🇭🇹 Haiti','24/06 · 19h · Miami','2026-06-24'],
      ['grupos','C','🇲🇦 Marrocos','🏴󠁧󠁢󠁳󠁣󠁴󠁿 Escócia','24/06 · 19h · Atlanta','2026-06-24'],
      // GRUPO D
      ['grupos','D','🇺🇸 EUA','🇵🇾 Paraguai','12/06 · 22h · Inglewood','2026-06-12'],
      ['grupos','D','🇦🇺 Austrália','🇹🇷 Turquia','14/06 · 1h · Vancouver','2026-06-14'],
      ['grupos','D','🇺🇸 EUA','🇹🇷 Turquia','19/06 · 16h · Seattle','2026-06-19'],
      ['grupos','D','🇵🇾 Paraguai','🇦🇺 Austrália','20/06 · 0h · Santa Clara','2026-06-20'],
      ['grupos','D','🇺🇸 EUA','🇦🇺 Austrália','25/06 · 23h · Inglewood','2026-06-25'],
      ['grupos','D','🇵🇾 Paraguai','🇹🇷 Turquia','25/06 · 23h · Santa Clara','2026-06-25'],
      // GRUPO E
      ['grupos','E','🇩🇪 Alemanha','🇨🇮 C. do Marfim','14/06 · 14h · Houston','2026-06-14'],
      ['grupos','E','🇪🇨 Equador','🇨🇼 Curaçao','14/06 · 20h · Filadélfia','2026-06-14'],
      ['grupos','E','🇩🇪 Alemanha','🇪🇨 Equador','20/06 · 17h · Toronto','2026-06-20'],
      ['grupos','E','🇨🇮 C. do Marfim','🇨🇼 Curaçao','20/06 · 21h · Kansas City','2026-06-20'],
      ['grupos','E','🇩🇪 Alemanha','🇨🇼 Curaçao','25/06 · 17h · East Rutherford','2026-06-25'],
      ['grupos','E','🇨🇮 C. do Marfim','🇪🇨 Equador','25/06 · 17h · Filadélfia','2026-06-25'],
      // GRUPO F
      ['grupos','F','🇳🇱 Holanda','🇯🇵 Japão','14/06 · 17h · Dallas','2026-06-14'],
      ['grupos','F','🇸🇪 Suécia','🇹🇳 Tunísia','14/06 · 23h · Monterrey','2026-06-14'],
      ['grupos','F','🇳🇱 Holanda','🇹🇳 Tunísia','20/06 · 14h · Houston','2026-06-20'],
      ['grupos','F','🇯🇵 Japão','🇸🇪 Suécia','21/06 · 1h · Monterrey','2026-06-21'],
      ['grupos','F','🇳🇱 Holanda','🇸🇪 Suécia','25/06 · 20h · Kansas City','2026-06-25'],
      ['grupos','F','🇯🇵 Japão','🇹🇳 Tunísia','25/06 · 20h · Dallas','2026-06-25'],
      // GRUPO G
      ['grupos','G','🇧🇪 Bélgica','🇮🇷 Irã','15/06 · 16h · Seattle','2026-06-15'],
      ['grupos','G','🇳🇿 N. Zelândia','🇪🇬 Egito','15/06 · 22h · Inglewood','2026-06-15'],
      ['grupos','G','🇧🇪 Bélgica','🇳🇿 N. Zelândia','21/06 · 16h · Inglewood','2026-06-21'],
      ['grupos','G','🇮🇷 Irã','🇪🇬 Egito','21/06 · 22h · Vancouver','2026-06-21'],
      ['grupos','G','🇧🇪 Bélgica','🇪🇬 Egito','27/06 · 0h · Vancouver','2026-06-27'],
      ['grupos','G','🇳🇿 N. Zelândia','🇮🇷 Irã','27/06 · 0h · Seattle','2026-06-27'],
      // GRUPO H
      ['grupos','H','🇪🇸 Espanha','🇨🇻 Cabo Verde','15/06 · 13h · Atlanta','2026-06-15'],
      ['grupos','H','🇸🇦 Arábia Saudita','🇺🇾 Uruguai','15/06 · 19h · Miami','2026-06-15'],
      ['grupos','H','🇪🇸 Espanha','🇺🇾 Uruguai','21/06 · 13h · Atlanta','2026-06-21'],
      ['grupos','H','🇨🇻 Cabo Verde','🇸🇦 Arábia Saudita','21/06 · 19h · Miami','2026-06-21'],
      ['grupos','H','🇪🇸 Espanha','🇸🇦 Arábia Saudita','26/06 · 21h · Guadalajara','2026-06-26'],
      ['grupos','H','🇨🇻 Cabo Verde','🇺🇾 Uruguai','26/06 · 21h · Houston','2026-06-26'],
      // GRUPO I
      ['grupos','I','🇫🇷 França','🇸🇳 Senegal','16/06 · 16h · East Rutherford','2026-06-16'],
      ['grupos','I','🇮🇶 Iraque','🇳🇴 Noruega','16/06 · 19h · Foxborough','2026-06-16'],
      ['grupos','I','🇫🇷 França','🇳🇴 Noruega','22/06 · 18h · Filadélfia','2026-06-22'],
      ['grupos','I','🇸🇳 Senegal','🇮🇶 Iraque','22/06 · 21h · East Rutherford','2026-06-22'],
      ['grupos','I','🇫🇷 França','🇮🇶 Iraque','26/06 · 16h · Foxborough','2026-06-26'],
      ['grupos','I','🇸🇳 Senegal','🇳🇴 Noruega','26/06 · 16h · Toronto','2026-06-26'],
      // GRUPO J
      ['grupos','J','🇦🇷 Argentina','🇩🇿 Argélia','16/06 · 22h · Kansas City','2026-06-16'],
      ['grupos','J','🇦🇹 Áustria','🇯🇴 Jordânia','17/06 · 1h · Santa Clara','2026-06-17'],
      ['grupos','J','🇦🇷 Argentina','🇯🇴 Jordânia','22/06 · 14h · Dallas','2026-06-22'],
      ['grupos','J','🇩🇿 Argélia','🇦🇹 Áustria','23/06 · 0h · Santa Clara','2026-06-23'],
      ['grupos','J','🇦🇷 Argentina','🇦🇹 Áustria','27/06 · 23h · Dallas','2026-06-27'],
      ['grupos','J','🇩🇿 Argélia','🇯🇴 Jordânia','27/06 · 23h · Kansas City','2026-06-27'],
      // GRUPO K
      ['grupos','K','🇵🇹 Portugal','🇨🇩 RD. Congo','17/06 · 14h · Houston','2026-06-17'],
      ['grupos','K','🇺🇿 Uzbequistão','🇨🇴 Colômbia','17/06 · 23h · Cid. México','2026-06-17'],
      ['grupos','K','🇵🇹 Portugal','🇨🇴 Colômbia','23/06 · 14h · Houston','2026-06-23'],
      ['grupos','K','🇨🇩 RD. Congo','🇺🇿 Uzbequistão','23/06 · 23h · Guadalajara','2026-06-23'],
      ['grupos','K','🇵🇹 Portugal','🇺🇿 Uzbequistão','27/06 · 20h30 · Miami','2026-06-27'],
      ['grupos','K','🇨🇩 RD. Congo','🇨🇴 Colômbia','27/06 · 20h30 · Atlanta','2026-06-27'],
      // GRUPO L
      ['grupos','L','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra','🇬🇭 Gana','17/06 · 17h · Dallas','2026-06-17'],
      ['grupos','L','🇵🇦 Panamá','🇭🇷 Croácia','17/06 · 20h · Toronto','2026-06-17'],
      ['grupos','L','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra','🇵🇦 Panamá','23/06 · 17h · Foxborough','2026-06-23'],
      ['grupos','L','🇬🇭 Gana','🇭🇷 Croácia','23/06 · 20h · Toronto','2026-06-23'],
      ['grupos','L','🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra','🇭🇷 Croácia','27/06 · 18h · East Rutherford','2026-06-27'],
      ['grupos','L','🇬🇭 Gana','🇵🇦 Panamá','27/06 · 18h · Filadélfia','2026-06-27'],
    ];
    gm.forEach(m => im.run(...m));
    console.log(`✅ ${gm.length} jogos da fase de grupos inseridos`);
  }

  // Seed admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bolao.com';
  const adminPass  = process.env.ADMIN_PASS  || 'admin123';
  const adminName  = process.env.ADMIN_NAME  || 'Administrador';
  if (!db.prepare(`SELECT id FROM users WHERE email=?`).get(adminEmail)) {
    const hash = bcrypt.hashSync(adminPass, 10);
    db.prepare(`INSERT INTO users(name,email,password,role) VALUES(?,?,?,'admin')`).run(adminName, adminEmail, hash);
    console.log(`✅ Admin criado: ${adminEmail} / ${adminPass} — TROQUE A SENHA!`);
  }
}

module.exports = { getDB, initDB };

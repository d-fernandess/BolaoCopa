import React, { useState, useCallback } from 'react';

// ── Toast hook ──────────────────────────────────────────────────────────────
export function useToast() {
  const [msg, setMsg] = useState('');
  const show = useCallback((m) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 2800);
  }, []);
  const Toast = msg ? (
    <div className="toast-wrap">
      <div className="toast">{msg}</div>
    </div>
  ) : null;
  return [show, Toast];
}

// ── Scoring ─────────────────────────────────────────────────────────────────
export function calcScore(pg1, pg2, rg1, rg2, mult = 1) {
  if (pg1 === '' || pg2 === '' || pg1 === undefined || pg2 === undefined)
    return { total: 0, exact: false, hitGoals: false, hitWinner: false };
  pg1 = parseInt(pg1); pg2 = parseInt(pg2);
  const exact = pg1 === rg1 && pg2 === rg2;
  const pW = pg1 > pg2 ? 1 : pg1 < pg2 ? 2 : 0;
  const rW = rg1 > rg2 ? 1 : rg1 < rg2 ? 2 : 0;
  const hitWinner = pW === rW;
  if (exact) return { total: Math.round(10 * mult), exact: true, hitGoals: true, hitWinner: true };
  if (!hitWinner) return { total: 0, exact: false, hitGoals: false, hitWinner: false };
  const vg = rW === 1 ? rg1 : rg2;
  const pg = rW === 1 ? pg1 : pg2;
  const hitGoals = pg === vg;
  const base = hitGoals ? 7 : 5;
  return { total: Math.round(base * mult), exact: false, hitGoals, hitWinner: true };
}

export function ScoreBadge({ s }) {
  if (!s) return <span className="badge badge-pending">Aguardando</span>;
  const mult = s.mult > 1 ? ` ×${s.mult}` : '';
  if (s.exact)    return <span className="badge badge-exact">🎯 Exato +{s.total}</span>;
  if (s.hitGoals) return <span className="badge badge-winner">⚽ Venc.+Gols +{s.total}{mult}</span>;
  if (s.hitWinner)return <span className="badge badge-winner">✅ Vencedor +{s.total}{mult}</span>;
  return <span className="badge badge-miss">❌ Errou</span>;
}

// ── Date helpers ─────────────────────────────────────────────────────────────
export function friendlyDate(dateKey) {
  if (!dateKey) return '';
  const [y, mo, d] = dateKey.split('-').map(Number);
  const dt   = new Date(y, mo - 1, d);
  const now  = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((dt - now) / 86400000);
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const days   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const label  = `${d} ${months[mo - 1]}`;
  if (diff === 0)  return `Hoje · ${label}`;
  if (diff === 1)  return `Amanhã · ${label}`;
  if (diff === -1) return `Ontem · ${label}`;
  if (diff > 1 && diff <= 6) return `${days[dt.getDay()]} · ${label}`;
  return label;
}

export function groupByDate(matches) {
  const map = {};
  matches.forEach(m => {
    const k = m.match_date || '';
    if (!map[k]) map[k] = [];
    map[k].push(m);
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

export function flag(str)     { return str.split(' ')[0] || '🏴'; }
export function teamName(str) { return str.split(' ').slice(1).join(' ') || str; }

const AV = ['#1a7a4a','#185fa5','#993556','#533ab7','#854f0b','#0e6b6b'];
export function avatarColor(i) { return AV[i % AV.length]; }

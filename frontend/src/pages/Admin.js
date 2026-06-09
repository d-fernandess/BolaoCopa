import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useToast, flag, teamName } from '../components/ui';

const PHASES = [
  {id:'dezesseis',label:'16avos de Final'},
  {id:'oitavas',  label:'Oitavas de Final'},
  {id:'quartas',  label:'Quartas de Final'},
  {id:'semis',    label:'Semifinal'},
  {id:'terceiro', label:'3º Lugar'},
  {id:'final',    label:'Final'},
];
const ALL_PHASES = [{id:'grupos',label:'Fase de Grupos'},...PHASES];

export default function Admin() {
  const [tab, setTab]         = useState('boloes');
  const [boloes, setBoloes]   = useState([]);
  const [matches, setMatches] = useState([]);
  const [matchPhase, setMatchPhase] = useState('grupos');
  const [matchGroup, setMatchGroup] = useState('A');
  const [bonusCfg, setBonusCfg] = useState({ campeao:'', vice:'', artilheiro:'' });
  const [pendingMap, setPendingMap] = useState({});
  const [newBolao, setNewBolao] = useState({ name:'', description:'' });
  const [newMatch, setNewMatch] = useState({ phase_id:'dezesseis', team1:'', team2:'', datetime:'' });
  const [rankings, setRankings] = useState({});
  const [selectedBolao, setSelectedBolao] = useState(null);
  const [showToast, Toast] = useToast();

  const load = useCallback(async () => {
    const [b, m, bc] = await Promise.all([api.getBoloes(), api.getMatches(), api.getBonusCfg()]);
    setBoloes(b); setMatches(m); setBonusCfg(bc||{});
    const pm = {};
    await Promise.all(b.map(async bo => { pm[bo.id] = await api.getPending(bo.id); }));
    setPendingMap(pm);
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPending = Object.values(pendingMap).flat().length;
  const phaseMatches = matches.filter(m =>
    m.phase_id === matchPhase && (matchPhase !== 'grupos' || m.grp === matchGroup)
  );

  async function createBolao() {
    if (!newBolao.name) return showToast('Nome obrigatório!');
    await api.createBolao(newBolao);
    setNewBolao({ name:'', description:'' });
    showToast('Bolão criado! 🎉'); load();
  }

  async function copyLink(bolao) {
    const url = `${window.location.origin}/cadastro/${bolao.invite_token}`;
    try { await navigator.clipboard.writeText(url); showToast('Link copiado! 📋'); }
    catch { showToast(url); }
  }

  async function newToken(bolao) {
    if (!window.confirm('Gerar novo link? O link anterior deixará de funcionar.')) return;
    await api.newToken(bolao.id); load(); showToast('Novo link gerado!');
  }

  async function approve(bid, uid) { await api.approveMember(bid, uid); load(); showToast('Aprovado! ✅'); }
  async function remove(bid, uid)  { await api.removeMember(bid, uid);  load(); showToast('Removido.'); }

  async function addMatch() {
    if (!newMatch.team1 || !newMatch.team2) return showToast('Informe os dois times!');
    if (!newMatch.datetime) return showToast('Informe a data e hora!');

    // Parse datetime-local → match_time string and match_date
    const dt = new Date(newMatch.datetime);
    const day   = String(dt.getDate()).padStart(2,'0');
    const month = String(dt.getMonth()+1).padStart(2,'0');
    const hh    = String(dt.getHours()).padStart(2,'0');
    const mm    = dt.getMinutes();
    const match_time = `${day}/${month} · ${hh}h${mm ? String(mm).padStart(2,'0') : ''} · Várias cidades`;
    const match_date = `${dt.getFullYear()}-${month}-${day}`;

    await api.addMatch({ phase_id: newMatch.phase_id, team1: newMatch.team1, team2: newMatch.team2, match_time, match_date });
    setNewMatch(n => ({...n, team1:'', team2:'', datetime:''}));
    showToast('Jogo adicionado! 🏟️'); load();
  }

  async function saveResult(id) {
    const g1 = document.getElementById(`rg1-${id}`)?.value;
    const g2 = document.getElementById(`rg2-${id}`)?.value;
    if (g1===''||g2==='') return showToast('Informe os dois placares!');
    await api.setResult(id, { g1: parseInt(g1), g2: parseInt(g2) });
    showToast('Resultado salvo! ⚽'); load();
  }

  async function delMatch(id) {
    if (!window.confirm('Remover este jogo?')) return;
    await api.deleteMatch(id); load();
  }

  async function loadRanking(bolaoId) {
    setSelectedBolao(bolaoId);
    const r = await api.getRanking(bolaoId);
    setRankings(prev => ({...prev, [bolaoId]: r}));
  }

  async function saveBonusCfg() {
    await api.saveBonusCfg(bonusCfg);
    showToast('Bônus registrado! 🏅');
  }

  const tabStyle = (t) => ({
    cursor:'pointer', padding:'8px 14px', borderRadius:8, border:'none',
    fontFamily:'inherit', fontWeight:700, fontSize:'.82rem', transition:'all .15s',
    background: tab===t ? 'var(--gold)' : 'var(--surface2)',
    color: tab===t ? '#0b1a10' : 'var(--muted)',
    minHeight:40,
  });

  return (
    <>
      <div className="section-title">⚙️ Painel Admin</div>

      <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:'1.5rem'}}>
        {[['boloes','⚽ Bolões'],['jogos','🏟️ Jogos'],['ranking','🏆 Rankings'],['bonus','🏅 Bônus']].map(([t,l])=>(
          <button key={t} style={tabStyle(t)} onClick={() => setTab(t)}>
            {l}
            {t==='boloes' && totalPending > 0 &&
              <span style={{background:'var(--red)',color:'#fff',borderRadius:99,padding:'1px 6px',fontSize:'.65rem',marginLeft:6}}>{totalPending}</span>}
          </button>
        ))}
      </div>

      {/* ── BOLÕES ── */}
      {tab === 'boloes' && (
        <>
          <div className="card card-accent" style={{marginBottom:'1.25rem'}}>
            <div style={{fontWeight:700,marginBottom:'.75rem',fontSize:'.9rem'}}>➕ Criar novo bolão</div>
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input className="form-input" placeholder="Ex: Bolão da Firma" value={newBolao.name}
                onChange={e => setNewBolao(n=>({...n,name:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Descrição (opcional)</label>
              <input className="form-input" placeholder="Ex: Premiação em dinheiro" value={newBolao.description}
                onChange={e => setNewBolao(n=>({...n,description:e.target.value}))} />
            </div>
            <button className="btn btn-green" onClick={createBolao}>🎉 Criar Bolão</button>
          </div>

          {boloes.map(b => {
            const pending = pendingMap[b.id] || [];
            const url = `${window.location.origin}/cadastro/${b.invite_token}`;
            return (
              <div key={b.id} className="card">
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'.5rem',flexWrap:'wrap',marginBottom:'.75rem'}}>
                  <div>
                    <div style={{fontWeight:700}}>{b.name}</div>
                    {b.description&&<div className="text-xs text-muted">{b.description}</div>}
                    <div className="text-xs text-muted" style={{marginTop:3}}>👥 {b.member_count} aprovados</div>
                  </div>
                  <button className="btn btn-red btn-xs" onClick={() => api.deleteBolao(b.id).then(load)}>✕</button>
                </div>
                <div className="invite-box" style={{marginBottom:'.75rem'}}>
                  <div className="text-xs text-muted" style={{marginBottom:4}}>🔗 Link de convite</div>
                  <div className="invite-url" style={{wordBreak:'break-all',fontSize:'.78rem'}}>{url}</div>
                </div>
                <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:pending.length?'.75rem':0}}>
                  <button className="btn btn-outline btn-sm" onClick={() => copyLink(b)}>📋 Copiar Link</button>
                  <button className="btn btn-sm" style={{background:'var(--surface2)',color:'var(--muted)',border:'1px solid var(--border)'}} onClick={() => newToken(b)}>🔄 Novo link</button>
                </div>
                {pending.length > 0 && (
                  <div style={{borderTop:'1px solid var(--border)',paddingTop:'.75rem',marginTop:'.75rem'}}>
                    <div style={{fontWeight:600,fontSize:'.82rem',marginBottom:'.5rem',color:'var(--gold)'}}>
                      ⏳ Aguardando aprovação ({pending.length})
                    </div>
                    {pending.map(u => (
                      <div key={u.id} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.4rem 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:500,fontSize:'.85rem'}}>{u.name}</div>
                          <div className="text-xs text-muted">{u.email}</div>
                        </div>
                        <button className="btn btn-green btn-xs" onClick={() => approve(b.id, u.id)}>✅ Aprovar</button>
                        <button className="btn btn-red btn-xs" onClick={() => remove(b.id, u.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ── JOGOS ── */}
      {tab === 'jogos' && (
        <>
          <div className="card card-accent" style={{marginBottom:'1.25rem'}}>
            <div style={{fontWeight:700,marginBottom:'.75rem',fontSize:'.9rem'}}>➕ Adicionar jogo do mata-mata</div>
            <div className="g2" style={{marginBottom:'.6rem'}}>
              <div>
                <label className="form-label">Time 1 (ex: 🇧🇷 Brasil)</label>
                <input className="form-input" placeholder="🏴 País 1" value={newMatch.team1}
                  onChange={e => setNewMatch(n=>({...n,team1:e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Time 2</label>
                <input className="form-input" placeholder="🏴 País 2" value={newMatch.team2}
                  onChange={e => setNewMatch(n=>({...n,team2:e.target.value}))} />
              </div>
            </div>
            <div className="g2" style={{marginBottom:'.9rem'}}>
              <div>
                <label className="form-label">📅 Data e Hora</label>
                <input className="form-input" type="datetime-local" value={newMatch.datetime}
                  style={{colorScheme:'dark'}}
                  onChange={e => setNewMatch(n=>({...n,datetime:e.target.value}))} />
              </div>
              <div>
                <label className="form-label">Fase</label>
                <select className="form-input" value={newMatch.phase_id}
                  onChange={e => setNewMatch(n=>({...n,phase_id:e.target.value}))}>
                  {PHASES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-green" onClick={addMatch}>🏟️ Adicionar Jogo</button>
          </div>

          <div className="card">
            <div style={{fontWeight:700,marginBottom:'.75rem',fontSize:'.9rem'}}>📋 Registrar Resultados</div>
            <div className="tabs">
              {ALL_PHASES.filter(ph => matches.some(m => m.phase_id === ph.id)).map(ph => (
                <button key={ph.id} className={`tab ${matchPhase===ph.id?'active':''}`}
                  onClick={() => setMatchPhase(ph.id)}>{ph.label}</button>
              ))}
            </div>
            {matchPhase === 'grupos' && (
              <div className="tabs" style={{marginBottom:'.875rem'}}>
                {'ABCDEFGHIJKL'.split('').map(g => (
                  <button key={g} className={`tab ${matchGroup===g?'active':''}`}
                    style={{padding:'4px 10px',fontSize:'.72rem'}}
                    onClick={() => setMatchGroup(g)}>Gr. {g}</button>
                ))}
              </div>
            )}
            {phaseMatches.length === 0 ? (
              <div className="text-muted text-sm" style={{padding:'.5rem 0'}}>Nenhum jogo nesta fase.</div>
            ) : phaseMatches.map(m => (
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.6rem 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
                <div style={{flex:1,minWidth:150}}>
                  <div className="text-sm">{teamName(m.team1)} × {teamName(m.team2)}</div>
                  <div className="text-xs text-muted">{m.match_time}</div>
                </div>
                <input id={`rg1-${m.id}`} type="number" min="0" max="99" defaultValue={m.result_g1??''}
                  placeholder="—" style={{width:44,height:38,textAlign:'center',fontSize:'1rem',fontWeight:700,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)',outline:'none'}} />
                <span className="text-muted">×</span>
                <input id={`rg2-${m.id}`} type="number" min="0" max="99" defaultValue={m.result_g2??''}
                  placeholder="—" style={{width:44,height:38,textAlign:'center',fontSize:'1rem',fontWeight:700,background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:6,color:'var(--text)',outline:'none'}} />
                <button className="btn btn-outline btn-sm" onClick={() => saveResult(m.id)}>Salvar</button>
                {m.result_g1!==null&&<span className="text-xs" style={{color:'var(--green-light)'}}>✓ {m.result_g1}×{m.result_g2}</span>}
                {m.phase_id!=='grupos'&&<button className="btn btn-red btn-xs" onClick={() => delMatch(m.id)}>✕</button>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── BÔNUS ── */}
      {tab === 'bonus' && (
        <div className="card card-accent">
          <div style={{fontWeight:700,marginBottom:'.25rem',fontSize:'.9rem'}}>🏅 Resultados dos Bônus</div>
          <p className="text-xs text-muted" style={{marginBottom:'.875rem',lineHeight:1.5}}>
            Registre aqui ao final do torneio para os pontos bônus serem aplicados automaticamente.
          </p>
          <div className="g3" style={{marginBottom:'.875rem'}}>
            {[['campeao','🏆','Campeão (+30)'],['vice','🥈','Vice-campeão (+15)'],['artilheiro','⚽','Artilheiro (+20)']].map(([k,ic,lb])=>(
              <div key={k}>
                <label className="form-label">{ic} {lb}</label>
                <input className="form-input" placeholder="País ou jogador" value={bonusCfg[k]||''}
                  onChange={e => setBonusCfg(b=>({...b,[k]:e.target.value}))} />
              </div>
            ))}
          </div>
          <button className="btn btn-green" onClick={saveBonusCfg}>💾 Salvar</button>
        </div>
      )}

      {/* ── RANKINGS ── */}
      {tab === 'ranking' && (
        <>
          {boloes.length === 0 ? (
            <div className="no-content"><span className="icon">🏆</span>Nenhum bolão criado ainda.</div>
          ) : boloes.map(b => {
            const members = b.members || [];
            const rank = rankings[b.id] || [];
            const medals = ['🥇','🥈','🥉'];
            return (
              <div key={b.id} className="card" style={{marginBottom:'1rem'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'.75rem',flexWrap:'wrap',gap:'.5rem'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'.9rem'}}>🏆 {b.name}</div>
                    <div className="text-xs text-muted">👥 {b.member_count} membros aprovados</div>
                  </div>
                  <button className="btn btn-outline btn-sm" onClick={() => loadRanking(b.id)}>
                    📊 Ver Ranking
                  </button>
                </div>

                {selectedBolao === b.id && (
                  rank.length === 0 ? (
                    <div className="text-sm text-muted" style={{padding:'.5rem 0'}}>Nenhum palpite ainda neste bolão.</div>
                  ) : rank.map((r, i) => (
                    <div key={r.id} style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.5rem 0',borderBottom:'1px solid var(--border)'}}>
                      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',minWidth:28,color: i===0?'var(--gold)':i===1?'#c0c0c0':i===2?'#cd7f32':'var(--muted)'}}>
                        {medals[i]||(i+1)}
                      </div>
                      <div style={{width:36,height:36,borderRadius:'50%',background:['#1a7a4a','#185fa5','#993556','#533ab7','#854f0b','#993c1d'][i%6],display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:'.82rem',flexShrink:0}}>
                        {r.name.slice(0,2).toUpperCase()}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:500,fontSize:'.88rem',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</div>
                        <div className="text-xs text-muted">{r.exact} exatos · {r.winners} venc.</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.2rem',color:'var(--gold)'}}>{r.pts}</div>
                        <div className="text-xs text-muted">pts</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </>
      )}

      {Toast}
    </>
  );
}

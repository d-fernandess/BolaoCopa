import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useToast, flag, teamName } from '../components/ui';

const PHASES = [
  {id:'oitavas',label:'Oitavas de Final'},
  {id:'quartas',label:'Quartas de Final'},
  {id:'semis',label:'Semifinal'},
  {id:'terceiro',label:'3º Lugar'},
  {id:'final',label:'Final'},
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
  const [newMatch, setNewMatch] = useState({ phase_id:'oitavas', team1:'', team2:'', match_time:'', match_date:'' });
  const [showToast, Toast] = useToast();

  const load = useCallback(async () => {
    const [b, m, bc] = await Promise.all([api.getBoloes(), api.getMatches(), api.getBonusCfg()]);
    setBoloes(b); setMatches(m); setBonusCfg(bc||{});
    // load pending for each bolão
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
    const b = await api.createBolao(newBolao);
    setNewBolao({ name:'', description:'' });
    showToast('Bolão criado! 🎉'); load();
    return b;
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
    if (!newMatch.team1||!newMatch.team2) return showToast('Informe os dois times!');
    await api.addMatch(newMatch);
    setNewMatch(n => ({...n, team1:'', team2:'', match_time:'', match_date:''}));
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

  async function saveBonusCfg() {
    await api.saveBonusCfg(bonusCfg);
    showToast('Bônus registrado! 🏅'); load();
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
        {[['boloes','⚽ Bolões'],['jogos','🏟️ Jogos'],['bonus','🏅 Bônus']].map(([t,l])=>(
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
          {/* Create */}
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

          {/* List */}
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

                {/* Invite link */}
                <div className="invite-box" style={{marginBottom:'.75rem'}}>
                  <div className="text-xs text-muted" style={{marginBottom:4}}>🔗 Link de convite</div>
                  <div className="invite-url" style={{wordBreak:'break-all',fontSize:'.78rem'}}>{url}</div>
                </div>
                <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:pending.length?'.75rem':0}}>
                  <button className="btn btn-outline btn-sm" onClick={() => copyLink(b)}>📋 Copiar Link</button>
                  <button className="btn btn-sm" style={{background:'var(--surface2)',color:'var(--muted)',border:'1px solid var(--border)'}} onClick={() => newToken(b)}>🔄 Novo link</button>
                </div>

                {/* Pending */}
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
          {/* Add knockout match */}
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
                <label className="form-label">Data (AAAA-MM-DD)</label>
                <input className="form-input" type="date" value={newMatch.match_date}
                  onChange={e => setNewMatch(n=>({...n,match_date:e.target.value}))} />
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

          {/* Results */}
          <div className="card">
            <div style={{fontWeight:700,marginBottom:'.75rem',fontSize:'.9rem'}}>📋 Registrar Resultados</div>
            {/* Phase tabs */}
            <div className="tabs">
              {ALL_PHASES.filter(ph => matches.some(m => m.phase_id === ph.id)).map(ph => (
                <button key={ph.id} className={`tab ${matchPhase===ph.id?'active':''}`}
                  onClick={() => setMatchPhase(ph.id)}>{ph.label}</button>
              ))}
            </div>
            {/* Group tabs for grupos phase */}
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
            {[['campeao','🏆','Campeão (+30)'],['vice','🥈','Vice-campeão (+15)'],['artilheiro','⚽','Artilheiro (+10)']].map(([k,ic,lb])=>(
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

      {Toast}
    </>
  );
}

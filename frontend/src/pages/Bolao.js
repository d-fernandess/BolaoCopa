import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api';
import { useToast, calcScore, ScoreBadge, friendlyDate, groupByDate, flag, teamName, avatarColor } from '../components/ui';

const PHASE_MULT = { grupos:1, dezesseis:1.25, oitavas:1.5, quartas:2, semis:2.5, terceiro:2, final:3 };

export default function Bolao() {
  const { id }  = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [showToast, Toast] = useToast();

  const [tab, setTab]         = useState('palpites');
  const [bolao, setBolao]     = useState(null);
  const [matches, setMatches] = useState([]);
  const [palpites, setPalpites] = useState({});
  const [bonus, setBonus]     = useState({ campeao:'', vice:'', artilheiro:'' });
  const [ranking, setRanking] = useState([]);
  const [dateRange, setDateRange] = useState('next');
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    const [b, m, p, bns] = await Promise.all([api.getBolao(id), api.getMatches(), api.getMine(), api.getBonus()]);
    setBolao(b);
    setMatches(m);
    const map = {}; p.forEach(x => { map[x.match_id] = { g1: x.g1, g2: x.g2 }; });
    setPalpites(map);
    setBonus(bns);
  }, [id]);

  useEffect(() => { load().catch(() => nav('/')); }, [load, nav]);

  useEffect(() => {
    if (tab === 'ranking') api.getRanking(id).then(setRanking);
  }, [tab, id]);

  // Date filtering
  const today = new Date(); today.setHours(0,0,0,0);
  const todayKey = today.toISOString().slice(0,10);

  function getFiltered() {
    if (dateRange === 'all') return matches;
    const buckets = groupByDate(matches);
    if (dateRange === 'next') {
      const up = buckets.find(([k]) => k >= todayKey);
      const target = up ? up[0] : (buckets.length ? buckets[buckets.length-1][0] : null);
      return target ? matches.filter(m => m.match_date === target) : [];
    }
    const days = parseInt(dateRange);
    const limit = new Date(today.getTime() + days * 86400000).toISOString().slice(0,10);
    let filtered = matches.filter(m => m.match_date >= todayKey && m.match_date <= limit);
    if (filtered.length === 0) {
      const up = buckets.find(([k]) => k >= todayKey);
      const target = up ? up[0] : (buckets.length ? buckets[buckets.length-1][0] : null);
      filtered = target ? matches.filter(m => m.match_date === target) : [];
    }
    return filtered;
  }

  async function save() {
    setSaving(true);
    try {
      const batch = Object.entries(palpites)
        .filter(([, v]) => v.g1 !== '' && v.g1 !== undefined && v.g2 !== '' && v.g2 !== undefined)
        .map(([mid, v]) => ({ match_id: parseInt(mid), g1: parseInt(v.g1), g2: parseInt(v.g2) }));
      await api.saveBatch(batch);
      await api.saveBonus(bonus);
      showToast('Palpites salvos! ✅');
    } catch(e) { showToast('Erro: ' + e.message); }
    finally { setSaving(false); }
  }

  if (!bolao) return <div className="no-content"><span className="icon">⏳</span>Carregando...</div>;

  const medals = ['🥇','🥈','🥉'];
  const rankClass = ['gold','silver','bronze'];
  const filtered = getFiltered();
  const dateBuckets = groupByDate(filtered);

  return (
    <>
      {/* Back + title */}
      <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.25rem'}}>
        <button onClick={() => nav('/')} style={{background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:'1.4rem',lineHeight:1,padding:'0 4px'}}>‹</button>
        <h1 className="section-title" style={{margin:0}}>{bolao.name}</h1>
      </div>

      {/* Main tabs */}
      <div className="tabs" style={{marginBottom:'1.25rem'}}>
        {[['palpites','⚽ Palpites'],['ranking','🏆 Ranking'],['meus','📋 Meus'],['regras','📖 Regras']].map(([t,l]) => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>{l}</button>
        ))}
      </div>

      {/* ── PALPITES ── */}
      {tab === 'palpites' && (
        <>
          <div className="alert" style={{marginBottom:'1rem'}}>
            <span>⏰</span>
            <span><strong>Atenção!</strong> Palpites fecham 1h antes de cada jogo.</span>
          </div>

          {/* Bonus palpites */}
          <div className="card card-accent" style={{marginBottom:'1rem'}}>
            <div style={{fontWeight:700,fontSize:'.88rem',marginBottom:'.6rem'}}>
              🏅 Palpites Bônus
              <span className="text-xs text-muted" style={{fontWeight:400,marginLeft:'.5rem'}}>(até o início da Copa)</span>
            </div>
            <div className="g3">
              {[['campeao','🏆','Campeão'],['vice','🥈','Vice'],['artilheiro','⚽','Artilheiro']].map(([k,ic,lb]) => (
                <div key={k}>
                  <label className="form-label">{ic} {lb}</label>
                  <input className="form-input" style={{fontSize:'.85rem',minHeight:40,padding:'.5rem .75rem'}}
                    placeholder="País ou jogador" value={bonus[k]||''}
                    onChange={e => setBonus(b => ({...b,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
          </div>

          {/* Date filter */}
          <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'1rem',flexWrap:'wrap'}}>
            <span className="text-xs text-muted" style={{whiteSpace:'nowrap'}}>📅 Mostrar:</span>
            <select className="form-input" style={{width:'auto',flex:1,maxWidth:240,minHeight:40,fontSize:'.85rem',padding:'.45rem .85rem'}}
              value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="next">Próxima rodada</option>
              <option value="2">Próximos 2 dias</option>
              <option value="3">Próximos 3 dias</option>
              <option value="5">Próximos 5 dias</option>
              <option value="7">Próxima semana</option>
              <option value="14">Próximas 2 semanas</option>
              <option value="all">Todos os jogos</option>
            </select>
          </div>

          {dateBuckets.length === 0 ? (
            <div className="no-content"><span className="icon">🗓️</span>Nenhum jogo no período selecionado.</div>
          ) : dateBuckets.map(([dateKey, dayMatches]) => (
            <div key={dateKey}>
              <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.8px',margin:'1rem 0 .5rem'}}>{friendlyDate(dateKey)}</div>
              {dayMatches.map(m => {
                const pal = palpites[m.id] || {};
                // Lock 30min before kickoff
                const kickoff = m.match_date && m.match_time ? (() => {
                  const dm = m.match_time.match(/(\d{1,2})\/(\d{2})/);
                  const hm = m.match_time.match(/·\s*(\d{1,2})h(\d{2})?/);
                  if (!dm) return null;
                  return new Date(2026, parseInt(dm[2])-1, parseInt(dm[1]), hm?parseInt(hm[1]):0, hm&&hm[2]?parseInt(hm[2]):0);
                })() : null;
                const locked = !!m.locked || m.result_g1 !== null || (kickoff && (kickoff - new Date()) < 30*60*1000);
                const label = m.grp ? `Grupo ${m.grp}` : m.phase_label;
                const hourM = m.match_time?.match(/·\s*(\d{1,2}h(?:\d{2})?)/);
                const hour  = hourM ? hourM[1] : '';
                const loc   = m.match_time?.split('·').slice(-1)[0]?.trim() || '';
                return (
                  <div key={m.id} className="match-card">
                    <div className="match-head">
                      <span>{hour}{hour ? ' · ' : ''}{loc}</span>
                      <span className="phase-pill">{label}</span>
                    </div>
                    <div className="match-body">
                      <div className="team">
                        <span className="team-flag">{flag(m.team1)}</span>
                        <div className="team-name">{teamName(m.team1)}</div>
                      </div>
                      <div>
                        <div className="score-wrap">
                          <input className="score-inp" type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="99"
                            placeholder="—" value={pal.g1 ?? ''} disabled={locked}
                            onChange={e => setPalpites(p => ({...p,[m.id]:{...p[m.id],g1:e.target.value}}))} />
                          <span className="score-sep">×</span>
                          <input className="score-inp" type="number" inputMode="numeric" pattern="[0-9]*" min="0" max="99"
                            placeholder="—" value={pal.g2 ?? ''} disabled={locked}
                            onChange={e => setPalpites(p => ({...p,[m.id]:{...p[m.id],g2:e.target.value}}))} />
                        </div>
                        {m.result_g1 !== null && <div className="result-label">✅ {m.result_g1}×{m.result_g2}</div>}
                        {locked && m.result_g1 === null && <div style={{textAlign:'center',fontSize:'.68rem',color:'var(--red)',marginTop:4}}>🔒 Encerrado</div>}
                      </div>
                      <div className="team">
                        <span className="team-flag">{flag(m.team2)}</span>
                        <div className="team-name">{teamName(m.team2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          <div style={{textAlign:'center',marginTop:'1.5rem'}}>
            <button className="btn" style={{minWidth:200}} onClick={save} disabled={saving}>
              {saving ? 'Salvando...' : '💾 Salvar Palpites'}
            </button>
          </div>
        </>
      )}

      {/* ── RANKING ── */}
      {tab === 'ranking' && (
        <>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.625rem',marginBottom:'1.5rem'}}>
            {[['👥',bolao.members?.filter(m=>m.approved).length||0,'Jogadores'],['⚽',matches.length,'Jogos'],['✅',matches.filter(m=>m.result_g1!==null).length,'Resultados']].map(([ic,v,lb])=>(
              <div key={lb} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'.875rem .5rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',color:'var(--gold)'}}>{v}</div>
                <div className="text-xs text-muted">{ic} {lb}</div>
              </div>
            ))}
          </div>
          {ranking.length === 0 ? (
            <div className="no-content"><span className="icon">📊</span>Nenhum palpite ainda.</div>
          ) : ranking.map((r,i) => (
            <div key={r.id} className={`rank-item ${rankClass[i]||''}`}>
              <div className="rank-pos">{medals[i]||(i+1)}</div>
              <div className="rank-avatar" style={{background:avatarColor(i)}}>{r.name.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="rank-name">{r.name}{r.id===user?.id&&<span className="text-xs text-muted"> (você)</span>}</div>
                {r.bonus>0&&<div className="text-xs" style={{color:'var(--gold)'}}>+{r.bonus} bônus</div>}
              </div>
              <div style={{textAlign:'right'}}>
                <div className="rank-pts">{r.pts}</div>
                <div className="rank-sub">{r.exact} exatos · {r.winners} venc.</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── MEUS PALPITES ── */}
      {tab === 'meus' && (
        <>
          {groupByDate(matches).map(([dateKey, dayMatches]) => (
            <div key={dateKey} style={{marginBottom:'1rem'}}>
              <div style={{fontSize:'.72rem',fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'.5rem'}}>{friendlyDate(dateKey)}</div>
              <div className="card" style={{padding:'.75rem 1rem'}}>
                {dayMatches.map(m => {
                  const pal = palpites[m.id];
                  const hasScore = pal && pal.g1!==undefined && pal.g2!==undefined;
                  const hasResult = m.result_g1 !== null && m.result_g1 !== undefined;
                  let badge = null;
                  if (hasScore && hasResult) {
                    const mult = PHASE_MULT[m.phase_id] || 1;
                    const s = calcScore(pal.g1, pal.g2, m.result_g1, m.result_g2, mult);
                    badge = <ScoreBadge s={s} />;
                  } else if (hasResult) {
                    badge = <span className="badge badge-pending">Sem palpite</span>;
                  } else if (hasScore) {
                    badge = <span className="badge badge-pending">Aguardando</span>;
                  } else {
                    badge = <span className="badge badge-miss">Sem palpite</span>;
                  }
                  return (
                    <div key={m.id} style={{display:'flex',alignItems:'center',padding:'.45rem 0',borderBottom:'1px solid var(--border)',gap:'.5rem',minHeight:44}}>
                      <span className="text-sm" style={{flex:1,minWidth:0}}>{teamName(m.team1)} × {teamName(m.team2)}</span>
                      {hasScore && <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.05rem',color:'var(--gold)',whiteSpace:'nowrap'}}>{pal.g1} × {pal.g2}</span>}
                      {badge}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── REGRAS ── */}
      {tab === 'regras' && (
        <>
          <div style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'.6rem'}}>Pontuação base</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.5rem',marginBottom:'1.5rem'}}>
            {[['🎯','10','Placar exato'],['⚽','7','Venc. + gols'],['✅','5','Vencedor'],['❌','0','Errou']].map(([ic,v,lb])=>(
              <div key={lb} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'.75rem .5rem',textAlign:'center'}}>
                <div style={{fontSize:'1.3rem'}}>{ic}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',color:'var(--gold)'}}>{v}</div>
                <div className="text-xs text-muted" style={{marginTop:2,lineHeight:1.3}}>{lb}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'.6rem'}}>Multiplicadores</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'1.5rem'}}>
            {[['×1','Grupos'],['×1,25','16avos'],['×1,5','Oitavas'],['×2','Quartas'],['×2,5','Semi'],['×3','Final']].map(([v,lb])=>(
              <div key={lb} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'.625rem .5rem',textAlign:'center'}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.3rem',color:'var(--gold)'}}>{v}</div>
                <div className="text-xs text-muted">{lb}</div>
              </div>
            ))}
          </div>

          <div style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'.6rem'}}>Bônus especiais</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'1.5rem'}}>
            {[['🏆','+30','Campeão'],['🥈','+15','Vice'],['⚽','+20','Artilheiro']].map(([ic,v,lb])=>(
              <div key={lb} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:'var(--r-sm)',padding:'.75rem .5rem',textAlign:'center'}}>
                <div style={{fontSize:'1.3rem'}}>{ic}</div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:'1.6rem',color:'var(--gold)'}}>{v}</div>
                <div className="text-xs text-muted">{lb}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <p className="text-sm" style={{lineHeight:1.85,color:'var(--muted)'}}>
              🔒 Palpites fecham <strong style={{color:'var(--text)'}}>1h antes</strong> de cada jogo.<br/>
              🏅 Bônus de campeão, vice e artilheiro podem ser alterados até o início da Copa.<br/><br/>
              <strong style={{color:'var(--text)'}}>Critérios de desempate:</strong><br/>
              1. Mais placares exatos<br/>
              2. Mais vencedores acertados<br/>
              3. Mais pontos no mata-mata<br/>
              4. Persistindo: divisão da premiação
            </p>
          </div>

          <div className="card" style={{marginTop:'.5rem'}}>
            <div style={{fontSize:'.78rem',fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.8px',marginBottom:'.75rem'}}>Exemplo — Brasil 2×1 Sérvia</div>
            {[['2×1','🎯 +10','badge-exact'],['2×0','⚽ +7','badge-winner'],['3×1','✅ +5','badge-winner'],['1×0','✅ +5','badge-winner'],['0×1','❌ 0','badge-miss'],['1×1','❌ 0','badge-miss']].map(([p,r,cls])=>(
              <div key={p} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.35rem 0',borderBottom:'1px solid var(--border)'}}>
                <span className="text-sm">Palpite {p}</span>
                <span className={`badge ${cls}`}>{r}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {Toast}
    </>
  );
}

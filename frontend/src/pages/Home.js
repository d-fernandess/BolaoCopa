import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { avatarColor } from '../components/ui';

export default function Home() {
  const [boloes, setBoloes] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => { api.getBoloes().then(setBoloes).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="no-content"><span className="icon">⏳</span>Carregando...</div>;

  return (
    <>
      <div className="section-title">⚽ Meus Bolões</div>
      {boloes.length === 0 ? (
        <div className="no-content">
          <span className="icon">🏟️</span>
          Você ainda não está em nenhum bolão.<br/>
          <span className="text-sm">Peça o link de convite ao administrador.</span>
        </div>
      ) : boloes.map((b, i) => (
        <div key={b.id} onClick={() => nav(`/bolao/${b.id}`)}
          style={{cursor:'pointer', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r)', padding:'1rem', marginBottom:'.75rem', display:'flex', alignItems:'center', gap:'1rem', boxShadow:'0 1px 6px rgba(0,0,0,.2)', transition:'border-color .15s'}}
          onMouseEnter={e => e.currentTarget.style.borderColor='var(--gold)'}
          onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
        >
          <div style={{width:52,height:52,borderRadius:'50%',background:avatarColor(i),display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.5rem',flexShrink:0}}>⚽</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:'1rem'}}>{b.name}</div>
            {b.description && <div className="text-xs text-muted" style={{marginTop:2}}>{b.description}</div>}
            <div className="text-xs text-muted" style={{marginTop:4}}>👥 {b.member_count} participante{b.member_count!==1?'s':''}</div>
          </div>
          <div style={{color:'var(--muted)',fontSize:'1.2rem'}}>›</div>
        </div>
      ))}
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';

export default function Register() {
  const { token } = useParams();
  const [bolao, setBolao] = useState(null);
  const [form, setForm]   = useState({ name:'', email:'', password:'' });
  const [err, setErr]     = useState('');
  const [done, setDone]   = useState(false);
  const [busy, setBusy]   = useState(false);

  useEffect(() => {
    if (token) api.getInvite(token).then(setBolao).catch(() => {});
  }, [token]);

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      await api.register({ ...form, invite_token: token });
      setDone(true);
    } catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <span className="auth-logo">Bolão <span>Copa</span> ⚽</span>
          {bolao ? (
            <div style={{marginTop:'.5rem'}}>
              <div className="text-sm text-muted">Você foi convidado para</div>
              <div style={{fontWeight:700, fontSize:'1.05rem', color:'var(--gold)', marginTop:2}}>{bolao.name}</div>
            </div>
          ) : (
            <p className="text-muted text-sm">Crie sua conta para participar</p>
          )}
        </div>

        <div className="card">
          {done ? (
            <div style={{textAlign:'center', padding:'1rem 0'}}>
              <div style={{fontSize:'2.5rem', marginBottom:'.75rem'}}>🎉</div>
              <h3 style={{marginBottom:'.5rem'}}>Cadastro realizado!</h3>
              <p className="text-muted text-sm" style={{lineHeight:1.6}}>
                Aguarde o administrador aprovar seu acesso.<br/>
                Você receberá uma mensagem quando estiver liberado.
              </p>
              <Link to="/login" className="btn" style={{marginTop:'1.25rem', display:'inline-flex'}}>
                Ir para Login
              </Link>
            </div>
          ) : (
            <>
              {err && <div className="alert alert-red" style={{marginBottom:'1rem'}}>⚠️ {err}</div>}
              <form onSubmit={submit}>
                <div className="form-group">
                  <label className="form-label">Nome completo</label>
                  <input className="form-input" placeholder="Seu nome" required
                    value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input className="form-input" type="email" placeholder="seu@email.com" required
                    value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Senha</label>
                  <input className="form-input" type="password" placeholder="Mínimo 6 caracteres" minLength={6} required
                    value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
                </div>
                <button className="btn btn-block" disabled={busy}>
                  {busy ? 'Criando conta...' : '✅ Criar conta'}
                </button>
              </form>
            </>
          )}
        </div>
        {!done && (
          <p style={{textAlign:'center', fontSize:'.85rem', color:'var(--muted)', marginTop:'1rem'}}>
            Já tem conta? <Link to="/login" style={{color:'var(--gold)'}}>Entrar</Link>
          </p>
        )}
      </div>
    </div>
  );
}

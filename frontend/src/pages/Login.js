import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email:'', password:'' });
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await login(form.email, form.password); nav('/'); }
    catch(e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div style={{textAlign:'center', marginBottom:'2rem'}}>
          <span className="auth-logo">Bolão <span>Copa</span> ⚽</span>
          <p className="text-muted text-sm">Entre na sua conta para jogar</p>
        </div>
        <div className="card">
          {err && <div className="alert alert-red" style={{marginBottom:'1rem'}}>⚠️ {err}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input className="form-input" type="email" placeholder="seu@email.com" required
                value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} />
            </div>
            <div className="form-group">
              <label className="form-label">Senha</label>
              <input className="form-input" type="password" placeholder="••••••••" required
                value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            </div>
            <button className="btn btn-block" disabled={busy}>{busy ? 'Entrando...' : '🔐 Entrar'}</button>
          </form>
        </div>
        <p style={{textAlign:'center', fontSize:'.85rem', color:'var(--muted)', marginTop:'1rem'}}>
          Não tem conta? <Link to="/cadastro" style={{color:'var(--gold)'}}>Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}

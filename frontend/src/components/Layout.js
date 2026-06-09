import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="logo" style={{cursor:'pointer'}} onClick={() => nav('/')}>
            Bolão <span>Copa</span> ⚽
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'.5rem'}}>
            {isAdmin && (
              <button
                onClick={() => nav('/admin')}
                style={{background: pathname.startsWith('/admin') ? 'rgba(245,200,66,.2)' : 'none', border:'1px solid rgba(245,200,66,.3)', borderRadius:8, color:'var(--gold)', fontSize:'.78rem', padding:'5px 10px', cursor:'pointer', fontFamily:'inherit', fontWeight:600}}
              >
                ⚙️ Admin
              </button>
            )}
            <div className="header-user">
              <strong>{user?.name}</strong>
              <button className="header-logout" onClick={logout}>Sair</button>
            </div>
          </div>
        </div>
      </header>

      <div className="main-layout">
        <Outlet />
      </div>

      <nav className="bottom-nav">
        <button
          className={pathname === '/' ? 'active' : ''}
          onClick={() => nav('/')}
        >
          <span className="icon">⚽</span>
          Bolões
        </button>
        {isAdmin && (
          <button
            className={pathname.startsWith('/admin') ? 'active' : ''}
            onClick={() => nav('/admin')}
          >
            <span className="icon">⚙️</span>
            Admin
          </button>
        )}
        <button onClick={logout}>
          <span className="icon">🚪</span>
          Sair
        </button>
      </nav>
    </>
  );
}

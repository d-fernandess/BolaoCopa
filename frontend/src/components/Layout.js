import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { pathname } = useLocation();

  const tabs = [
    { path:'/',      icon:'⚽', label:'Bolões' },
    ...(user?.role === 'admin' ? [{ path:'/admin', icon:'⚙️', label:'Admin' }] : []),
  ];

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="logo" style={{cursor:'pointer'}} onClick={() => nav('/')}>
            Bolão <span>Copa</span> ⚽
          </div>
          <div className="header-user">
            <strong>{user?.name}</strong>
            <button className="header-logout" onClick={logout}>Sair</button>
          </div>
        </div>
      </header>

      <div className="main-layout">
        <Outlet />
      </div>

      <nav className="bottom-nav">
        {tabs.map(t => (
          <button
            key={t.path}
            className={pathname === t.path || (t.path !== '/' && pathname.startsWith(t.path)) ? 'active' : ''}
            onClick={() => nav(t.path)}
          >
            <span className="icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
        <button onClick={logout}>
          <span className="icon">🚪</span>
          Sair
        </button>
      </nav>
    </>
  );
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('bolao_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          localStorage.removeItem('bolao_token');
          setLoading(false);
          return;
        }
        setUser({ id: payload.id, name: payload.name, email: payload.email, role: payload.role });
      } catch {
        localStorage.removeItem('bolao_token');
      } finally {
        setLoading(false);
      }
    } else setLoading(false);
  }, []);

  async function login(email, password) {
    const d = await api.login({ email, password });
    localStorage.setItem('bolao_token', d.token);
    const payload = JSON.parse(atob(d.token.split('.')[1]));
    const u = { id: payload.id, name: payload.name, email: payload.email, role: payload.role };
    setUser(u);
    return u;
  }

  function logout() { localStorage.removeItem('bolao_token'); setUser(null); }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{!loading && children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (localStorage.getItem('bolao_token')) {
      api.me().then(setUser).catch(() => localStorage.removeItem('bolao_token')).finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  async function login(email, password) {
    const d = await api.login({ email, password });
    localStorage.setItem('bolao_token', d.token);
    setUser(d.user); return d.user;
  }

  function logout() { localStorage.removeItem('bolao_token'); setUser(null); }

  return <Ctx.Provider value={{ user, loading, login, logout }}>{!loading && children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

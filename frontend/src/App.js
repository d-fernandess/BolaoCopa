import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login    from './pages/Login';
import Register from './pages/Register';
import Home     from './pages/Home';
import Bolao    from './pages/Bolao';
import Admin    from './pages/Admin';
import Layout   from './components/Layout';

function Guard({ children, admin }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"           element={<Login />} />
          <Route path="/cadastro"        element={<Register />} />
          <Route path="/cadastro/:token" element={<Register />} />
          <Route element={<Guard><Layout /></Guard>}>
            <Route path="/"           element={<Home />} />
            <Route path="/bolao/:id"  element={<Bolao />} />
            <Route path="/admin"      element={<Guard admin><Admin /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Nav from './components/Nav.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Keys from './pages/Keys.jsx';
import Account from './pages/Account.jsx';
import { useState, useCallback } from 'react';

export default function App() {
  const [authed, setAuthed] = useState(false);

  const handleLogin = useCallback(() => setAuthed(true), []);
  const handleLogout = useCallback(() => setAuthed(false), []);

  return (
    <BrowserRouter>
      {authed && <Nav onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={
          authed ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
        } />
        <Route path="/" element={
          <ProtectedRoute authed={authed}>
            <Overview />
          </ProtectedRoute>
        } />
        <Route path="/keys" element={
          <ProtectedRoute authed={authed}>
            <Keys />
          </ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute authed={authed}>
            <Account />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

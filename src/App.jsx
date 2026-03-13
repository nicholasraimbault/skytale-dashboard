// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Nav from './components/Nav.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Overview from './pages/Overview.jsx';
import Keys from './pages/Keys.jsx';
import Channels from './pages/Channels.jsx';
import Agents from './pages/Agents.jsx';
import Account from './pages/Account.jsx';
import Security from './pages/Security.jsx';
import Welcome from './pages/Welcome.jsx';
import ChannelDetail from './pages/ChannelDetail.jsx';
import Federation from './pages/Federation.jsx';
import Pricing from './pages/Pricing.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import Playground from './pages/Playground.jsx';
import Compliance from './pages/Compliance.jsx';
import Settings from './pages/Settings.jsx';
import Activity from './pages/Activity.jsx';
import Team from './pages/Team.jsx';
import { getAccount } from './api.js';
import { useState, useEffect, useCallback } from 'react';

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAccount({ skipAuthRedirect: true })
      .then(() => setAuthed(true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = useCallback(() => setAuthed(false), []);

  if (loading) return null;

  return (
    <BrowserRouter>
      {authed && <Nav onLogout={handleLogout} />}
      {authed && <CommandPalette />}
      <Routes>
        <Route path="/login" element={
          authed ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/" element={
          <ProtectedRoute authed={authed}>
            <Overview />
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <ProtectedRoute authed={authed}>
            <Security />
          </ProtectedRoute>
        } />
        <Route path="/welcome" element={
          <ProtectedRoute authed={authed}>
            <Welcome />
          </ProtectedRoute>
        } />
        <Route path="/keys" element={
          <ProtectedRoute authed={authed}>
            <Keys />
          </ProtectedRoute>
        } />
        <Route path="/channels" element={
          <ProtectedRoute authed={authed}>
            <Channels />
          </ProtectedRoute>
        } />
        <Route path="/channels/:id" element={
          <ProtectedRoute authed={authed}>
            <ChannelDetail />
          </ProtectedRoute>
        } />
        <Route path="/federation" element={
          <ProtectedRoute authed={authed}>
            <Federation />
          </ProtectedRoute>
        } />
        <Route path="/pricing" element={
          <ProtectedRoute authed={authed}>
            <Pricing />
          </ProtectedRoute>
        } />
        <Route path="/agents" element={
          <ProtectedRoute authed={authed}>
            <Agents />
          </ProtectedRoute>
        } />
        <Route path="/account" element={
          <ProtectedRoute authed={authed}>
            <Account />
          </ProtectedRoute>
        } />
        <Route path="/playground" element={
          <ProtectedRoute authed={authed}>
            <Playground />
          </ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute authed={authed}>
            <Compliance />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute authed={authed}>
            <Settings />
          </ProtectedRoute>
        } />
        <Route path="/activity" element={
          <ProtectedRoute authed={authed}>
            <Activity />
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute authed={authed}>
            <Team />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

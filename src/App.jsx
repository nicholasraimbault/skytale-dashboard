// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { getAccount } from './api.js';

// Eager imports (needed immediately)
import Nav from './components/Nav.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import CommandPalette from './components/CommandPalette.jsx';

// Lazy-loaded pages
const Overview = lazy(() => import('./pages/Overview.jsx'));
const Keys = lazy(() => import('./pages/Keys.jsx'));
const Channels = lazy(() => import('./pages/Channels.jsx'));
const Agents = lazy(() => import('./pages/Agents.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Security = lazy(() => import('./pages/Security.jsx'));
const Welcome = lazy(() => import('./pages/Welcome.jsx'));
const ChannelDetail = lazy(() => import('./pages/ChannelDetail.jsx'));
const Federation = lazy(() => import('./pages/Federation.jsx'));
const Pricing = lazy(() => import('./pages/Pricing.jsx'));
const Playground = lazy(() => import('./pages/Playground.jsx'));
const Compliance = lazy(() => import('./pages/Compliance.jsx'));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Activity = lazy(() => import('./pages/Activity.jsx'));
const Team = lazy(() => import('./pages/Team.jsx'));

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    getAccount({ skipAuthRedirect: true })
      .then(() => setAuthed(true))
      .catch((err) => {
        if (err.message !== 'Session expired') setAuthError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = useCallback(() => setAuthed(false), []);

  if (loading)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
        }}
      >
        Loading...
      </div>
    );

  if (authError && !authed)
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '1rem',
          color: 'var(--text-muted)',
        }}
      >
        <p>Unable to connect to Skytale. Please check your connection.</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );

  return (
    <BrowserRouter>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      {authed && <Nav onLogout={handleLogout} />}
      {authed && <CommandPalette />}
      <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute authed={authed}>
                <Overview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/security"
            element={
              <ProtectedRoute authed={authed}>
                <Security />
              </ProtectedRoute>
            }
          />
          <Route
            path="/welcome"
            element={
              <ProtectedRoute authed={authed}>
                <Welcome />
              </ProtectedRoute>
            }
          />
          <Route
            path="/keys"
            element={
              <ProtectedRoute authed={authed}>
                <Keys />
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels"
            element={
              <ProtectedRoute authed={authed}>
                <Channels />
              </ProtectedRoute>
            }
          />
          <Route
            path="/channels/:id"
            element={
              <ProtectedRoute authed={authed}>
                <ChannelDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/federation"
            element={
              <ProtectedRoute authed={authed}>
                <Federation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pricing"
            element={
              <ProtectedRoute authed={authed}>
                <Pricing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute authed={authed}>
                <Agents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute authed={authed}>
                <Account />
              </ProtectedRoute>
            }
          />
          <Route
            path="/playground"
            element={
              <ProtectedRoute authed={authed}>
                <Playground />
              </ProtectedRoute>
            }
          />
          <Route
            path="/compliance"
            element={
              <ProtectedRoute authed={authed}>
                <Compliance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute authed={authed}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute authed={authed}>
                <Activity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute authed={authed}>
                <Team />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState } from 'react';
import { login } from '../api.js';
import '../styles/pages.css';

export default function Login({ onLogin }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!apiKey.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await login(apiKey.trim());
      onLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-brand">
          skytale<span>.</span>
        </div>
        <p className="login-subtitle">
          Sign in with your API key to access the dashboard.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="api-key">API Key</label>
            <input
              id="api-key"
              type="password"
              className="input"
              placeholder="sk_live_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !apiKey.trim()}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          {error && <p className="error-msg">{error}</p>}
        </form>
      </div>
    </div>
  );
}

// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useRef } from 'react';
import { getKeys, createKey, revokeKey } from '../api.js';
import { formatDate } from '../utils.js';
import '../styles/pages.css';

function daysSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function keyAgeBadge(createdAt) {
  const days = daysSince(createdAt);
  if (days > 90) {
    return { className: 'key-age-badge badge-warning', label: `${days} days old` };
  }
  if (days < 30) {
    return { className: 'key-age-badge badge-active', label: `${days}d` };
  }
  return null;
}

export default function Keys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
  const [copied, setCopied] = useState(false);
  const nameRef = useRef(null);

  async function fetchKeys() {
    try {
      const data = await getKeys();
      setKeys(data?.keys || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchKeys();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newKeyName.trim()) {
      nameRef.current?.focus();
      return;
    }

    setCreating(true);
    setError(null);
    setNewKeySecret(null);

    try {
      const result = await createKey(newKeyName.trim());
      setNewKeySecret(result.key);
      setNewKeyName('');
      await fetchKeys();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return;

    setRevokingId(id);
    setError(null);

    try {
      await revokeKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setRevokingId(null);
    }
  }

  if (loading)
    return (
      <div className="page">
        <p className="loading">Loading API keys...</p>
      </div>
    );

  return (
    <main className="page" id="main-content">
      <div className="keys-header">
        <div className="keys-header-left">
          <h1>API Keys</h1>
          <p>Manage keys for accessing the Skytale API.</p>
        </div>
      </div>

      {newKeySecret && (
        <div className="new-key-banner">
          <p>Copy your new API key now. You will not be able to see it again.</p>
          <div className="new-key-row">
            <code>{newKeySecret}</code>
            <button
              className="btn-copy"
              aria-label="Copy to clipboard"
              onClick={() => {
                navigator.clipboard.writeText(newKeySecret);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <form className="create-key-form" onSubmit={handleCreate}>
        <label htmlFor="key-name" className="visually-hidden">
          Key name
        </label>
        <input
          id="key-name"
          ref={nameRef}
          type="text"
          className="input"
          placeholder="Key name (e.g. production)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? 'Creating...' : 'Create key'}
        </button>
      </form>

      {error && <p className="error-msg">{error}</p>}

      <div className="key-list">
        {keys.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              No API keys yet. Create one to get started.
            </p>
          </div>
        ) : (
          keys.map((key) => {
            const ageBadge = keyAgeBadge(key.created_at);
            const days = daysSince(key.created_at);
            return (
              <div
                key={key.id}
                className="card key-item"
                style={{ flexDirection: 'column', alignItems: 'stretch' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div className="key-info">
                    <span className="key-name">
                      {key.name}
                      {ageBadge && <span className={ageBadge.className}>{ageBadge.label}</span>}
                    </span>
                    <span className="key-prefix">{key.prefix}...</span>
                    <span className="key-created">
                      Created {formatDate(key.created_at)}
                      {key.last_used_at
                        ? ` · Last used ${formatDate(key.last_used_at)}`
                        : ' · Never used'}
                    </span>
                  </div>
                  <button
                    className="btn-danger"
                    onClick={() => handleRevoke(key.id)}
                    disabled={revokingId === key.id}
                  >
                    {revokingId === key.id ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
                {days > 90 && (
                  <p className="key-rotation-warning">
                    This key was created {days} days ago. Consider rotating it for better security.
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}

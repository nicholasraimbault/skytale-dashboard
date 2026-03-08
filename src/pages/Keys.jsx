// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useRef } from 'react';
import { getKeys, createKey, revokeKey } from '../api.js';
import '../styles/pages.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Keys() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState(null);
  const [revokingId, setRevokingId] = useState(null);
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

  if (loading) return <div className="page"><p className="loading">Loading API keys...</p></div>;

  return (
    <div className="page">
      <div className="keys-header">
        <div className="keys-header-left">
          <h1>API Keys</h1>
          <p>Manage keys for accessing the Skytale API.</p>
        </div>
      </div>

      {newKeySecret && (
        <div className="new-key-banner">
          <p>
            Copy your new API key now. You will not be able to see it again.
          </p>
          <code>{newKeySecret}</code>
        </div>
      )}

      <form className="create-key-form" onSubmit={handleCreate}>
        <input
          ref={nameRef}
          type="text"
          className="input"
          placeholder="Key name (e.g. production)"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
        />
        <button
          type="submit"
          className="btn-primary"
          disabled={creating}
        >
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
          keys.map((key) => (
            <div key={key.id} className="card key-item">
              <div className="key-info">
                <span className="key-name">{key.name}</span>
                <span className="key-prefix">{key.prefix}...</span>
                {key.created_at && (
                  <span className="key-created">Created {formatDate(key.created_at)}</span>
                )}
              </div>
              <button
                className="btn-danger"
                onClick={() => handleRevoke(key.id)}
                disabled={revokingId === key.id}
              >
                {revokingId === key.id ? 'Revoking...' : 'Revoke'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

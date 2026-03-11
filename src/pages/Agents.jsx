// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { getAgents, registerAgent, deleteAgent } from '../api.js';
import '../styles/pages.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function truncateDid(did) {
  if (!did || did.length <= 24) return did;
  return did.slice(0, 16) + '...' + did.slice(-4);
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingDid, setDeletingDid] = useState(null);
  const [form, setForm] = useState({ displayName: '', did: '', capabilities: '', endpoint: '' });

  async function fetchAgents() {
    try {
      const data = await getAgents();
      setAgents(data?.agents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAgents(); }, []);

  async function handleRegister(e) {
    e.preventDefault();
    if (!form.did.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const caps = form.capabilities.split(',').map(c => c.trim()).filter(Boolean);
      await registerAgent({
        did: form.did.trim(),
        display_name: form.displayName.trim() || undefined,
        capabilities: caps.length ? caps : undefined,
        endpoint: form.endpoint.trim() || undefined,
      });
      setForm({ displayName: '', did: '', capabilities: '', endpoint: '' });
      setShowForm(false);
      await fetchAgents();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(did) {
    if (!window.confirm('Delete this agent? This cannot be undone.')) return;
    setDeletingDid(did);
    setError(null);
    try {
      await deleteAgent(did);
      setAgents((prev) => prev.filter((a) => a.did !== did));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingDid(null);
    }
  }

  if (loading) return <div className="page"><p className="loading">Loading agents...</p></div>;

  return (
    <div className="page">
      <div className="keys-header">
        <div className="keys-header-left">
          <h1>Agents</h1>
          <p>Your registered agent identities.</p>
        </div>
        {!showForm && (
          <button className="btn-primary" onClick={() => setShowForm(true)}>Register</button>
        )}
      </div>

      {showForm && (
        <form className="agent-register-form card" onSubmit={handleRegister}>
          <div className="agent-form-row">
            <input className="input" placeholder="Display name" value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            <input className="input" placeholder="DID (did:key:z6Mk...)" value={form.did}
              onChange={(e) => setForm({ ...form, did: e.target.value })} required />
          </div>
          <div className="agent-form-row">
            <input className="input" placeholder="Capabilities (comma-separated)" value={form.capabilities}
              onChange={(e) => setForm({ ...form, capabilities: e.target.value })} />
            <input className="input" placeholder="Endpoint URL (optional)" value={form.endpoint}
              onChange={(e) => setForm({ ...form, endpoint: e.target.value })} />
          </div>
          <div className="agent-form-actions">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Registering...' : 'Register'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="key-list">
        {agents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              No agents registered. Register your first agent to enable discovery and trust circles.
            </p>
          </div>
        ) : (
          agents.map((agent) => (
            <div key={agent.id} className="card key-item">
              <div className="key-info">
                <span className="key-name">
                  {agent.display_name || truncateDid(agent.did)}
                  <span className={`agent-status ${agent.status === 'active' ? 'active' : ''}`}></span>
                </span>
                <span className="key-prefix">{truncateDid(agent.did)}</span>
                {agent.capabilities?.length > 0 && (
                  <span className="key-created">{agent.capabilities.join(', ')}</span>
                )}
                {agent.created_at && (
                  <span className="key-created">Registered {formatDate(agent.created_at)}</span>
                )}
              </div>
              <button
                className="btn-danger"
                onClick={() => handleDelete(agent.did)}
                disabled={deletingDid === agent.did}
              >
                {deletingDid === agent.did ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

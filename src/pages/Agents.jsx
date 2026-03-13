// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { getAgents, registerAgent, deleteAgent, updateAgent } from '../api.js';
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

const VISIBILITY_OPTIONS = ['public', 'organization', 'private'];

function VisibilityBadge({ visibility }) {
  const v = visibility || 'public';
  return (
    <span className={`visibility-badge visibility-${v}`}>
      {v}
    </span>
  );
}

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingDid, setDeletingDid] = useState(null);
  const [form, setForm] = useState({ displayName: '', did: '', capabilities: '', endpoint: '', visibility: 'public' });

  // Edit state
  const [editingDid, setEditingDid] = useState(null);
  const [editForm, setEditForm] = useState({ displayName: '', capabilities: '', endpoint: '', visibility: 'public' });
  const [saving, setSaving] = useState(false);

  // Filter state
  const [capabilityFilter, setCapabilityFilter] = useState('');
  const [didFilter, setDidFilter] = useState('');

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
        visibility: form.visibility || 'public',
      });
      setForm({ displayName: '', did: '', capabilities: '', endpoint: '', visibility: 'public' });
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

  function startEdit(agent) {
    setEditingDid(agent.did);
    setEditForm({
      displayName: agent.display_name || '',
      capabilities: (agent.capabilities || []).join(', '),
      endpoint: agent.endpoint || '',
      visibility: agent.visibility || 'public',
    });
  }

  function cancelEdit() {
    setEditingDid(null);
    setEditForm({ displayName: '', capabilities: '', endpoint: '', visibility: 'public' });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const caps = editForm.capabilities.split(',').map(c => c.trim()).filter(Boolean);
      await updateAgent(editingDid, {
        display_name: editForm.displayName.trim() || undefined,
        capabilities: caps.length ? caps : undefined,
        endpoint: editForm.endpoint.trim() || undefined,
        visibility: editForm.visibility || 'public',
      });
      setEditingDid(null);
      await fetchAgents();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Client-side filtering
  const filteredAgents = agents.filter((agent) => {
    if (capabilityFilter.trim()) {
      const filterLower = capabilityFilter.trim().toLowerCase();
      const hasCap = (agent.capabilities || []).some(
        (c) => c.toLowerCase().includes(filterLower)
      );
      if (!hasCap) return false;
    }
    if (didFilter.trim()) {
      if (!agent.did?.toLowerCase().startsWith(didFilter.trim().toLowerCase())) return false;
    }
    return true;
  });

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
          <div className="agent-form-row">
            <select
              className="input"
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
              style={{ maxWidth: '200px' }}
            >
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="agent-form-actions">
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Registering...' : 'Register'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Search/Filter bar */}
      <div className="filter-bar">
        <input
          className="input"
          placeholder="Filter by capability..."
          value={capabilityFilter}
          onChange={(e) => setCapabilityFilter(e.target.value)}
        />
        <input
          className="input"
          placeholder="Filter by DID prefix..."
          value={didFilter}
          onChange={(e) => setDidFilter(e.target.value)}
        />
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="key-list">
        {filteredAgents.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              {agents.length === 0
                ? 'No agents registered. Register your first agent to enable discovery and trust circles.'
                : 'No agents match your filters.'}
            </p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div key={agent.did} className="card key-item">
              {editingDid === agent.did ? (
                <form onSubmit={handleSaveEdit} style={{ width: '100%' }}>
                  <div className="agent-form-row">
                    <input className="input" placeholder="Display name" value={editForm.displayName}
                      onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} />
                    <input className="input" placeholder="Capabilities (comma-separated)" value={editForm.capabilities}
                      onChange={(e) => setEditForm({ ...editForm, capabilities: e.target.value })} />
                  </div>
                  <div className="agent-form-row">
                    <input className="input" placeholder="Endpoint URL" value={editForm.endpoint}
                      onChange={(e) => setEditForm({ ...editForm, endpoint: e.target.value })} />
                    <select
                      className="input"
                      value={editForm.visibility}
                      onChange={(e) => setEditForm({ ...editForm, visibility: e.target.value })}
                      style={{ maxWidth: '200px' }}
                    >
                      {VISIBILITY_OPTIONS.map((v) => (
                        <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="agent-form-actions">
                    <button type="submit" className="btn-primary" disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="key-info">
                    <span className="key-name">
                      {agent.display_name || truncateDid(agent.did)}
                      <span className={`agent-status ${agent.status === 'active' ? 'active' : ''}`}></span>
                      {' '}
                      <VisibilityBadge visibility={agent.visibility} />
                    </span>
                    <span className="key-prefix">{truncateDid(agent.did)}</span>
                    {agent.capabilities?.length > 0 && (
                      <span className="key-created">{agent.capabilities.join(', ')}</span>
                    )}
                    {agent.created_at && (
                      <span className="key-created">Registered {formatDate(agent.created_at)}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      className="btn-ghost"
                      onClick={() => startEdit(agent)}
                      style={{ padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDelete(agent.did)}
                      disabled={deletingDid === agent.did}
                    >
                      {deletingDid === agent.did ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useCallback } from 'react';
import {
  createRevocation,
  getRevocations,
  checkRevocation,
  createWebhook,
  getWebhooks,
  deleteWebhook,
  getAuditEntries,
} from '../api.js';
import { formatDate, truncate } from '../utils.js';
import './Security.css';

const WEBHOOK_EVENTS = [
  'agent.revoked',
  'auth.failed',
  'quota.exceeded',
  'channel.created',
  'member.added',
];

export default function Security() {
  const [tab, setTab] = useState('revocations');

  return (
    <main className="page" id="main-content">
      <h1 className="page-title">Security</h1>
      <p className="page-subtitle">Revoke credentials, manage webhooks, and inspect audit logs.</p>

      <div className="security-tabs">
        <button
          className={`security-tab ${tab === 'revocations' ? 'active' : ''}`}
          onClick={() => setTab('revocations')}
        >
          Revocations
        </button>
        <button
          className={`security-tab ${tab === 'webhooks' ? 'active' : ''}`}
          onClick={() => setTab('webhooks')}
        >
          Webhooks
        </button>
        <button
          className={`security-tab ${tab === 'audit' ? 'active' : ''}`}
          onClick={() => setTab('audit')}
        >
          Audit Log
        </button>
      </div>

      {tab === 'revocations' && <RevocationsTab />}
      {tab === 'webhooks' && <WebhooksTab />}
      {tab === 'audit' && <AuditTab />}
    </main>
  );
}

/* ========== Revocations Tab ========== */

function RevocationsTab() {
  const [revocations, setRevocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    revoked_did: '',
    reason: 'credential_compromise',
    signature: '',
    scope: 'full',
  });
  const [checkDid, setCheckDid] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const fetchRevocations = useCallback(async () => {
    try {
      const data = await getRevocations();
      setRevocations(data?.revocations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevocations();
  }, [fetchRevocations]);

  async function handleRevoke(e) {
    e.preventDefault();
    if (!form.revoked_did.trim() || !form.signature.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await createRevocation({
        revoked_did: form.revoked_did.trim(),
        reason: form.reason,
        signature: form.signature.trim(),
        scope: form.scope,
      });
      setForm({ revoked_did: '', reason: 'credential_compromise', signature: '', scope: 'full' });
      await fetchRevocations();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheck(e) {
    e.preventDefault();
    if (!checkDid.trim()) return;
    setChecking(true);
    setCheckResult(null);
    setError(null);
    try {
      const data = await checkRevocation(checkDid.trim());
      const revoked = Array.isArray(data) ? data.length > 0 : !!data?.revoked;
      setCheckResult(revoked ? 'revoked' : 'not_revoked');
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="security-tab-content">
      <div className="card revoke-card">
        <h3>Revoke Agent</h3>
        <form className="revoke-form" onSubmit={handleRevoke}>
          <div className="revoke-form-row">
            <label htmlFor="revoke-agent-did" className="visually-hidden">
              Agent DID
            </label>
            <input
              id="revoke-agent-did"
              className="input"
              placeholder="Agent DID (did:key:z6Mk...)"
              value={form.revoked_did}
              onChange={(e) => setForm({ ...form, revoked_did: e.target.value })}
              required
            />
            <select
              className="input"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            >
              <option value="credential_compromise">Credential Compromise</option>
              <option value="key_rotation">Key Rotation</option>
              <option value="policy_violation">Policy Violation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="revoke-form-row">
            <label htmlFor="revoke-signature" className="visually-hidden">
              Signature
            </label>
            <input
              id="revoke-signature"
              className="input"
              placeholder="Signature"
              value={form.signature}
              onChange={(e) => setForm({ ...form, signature: e.target.value })}
              required
            />
            <select
              className="input"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value })}
            >
              <option value="full">Full</option>
              <option value="partial">Partial</option>
            </select>
          </div>
          <button type="submit" className="btn-danger" disabled={submitting}>
            {submitting ? 'Revoking...' : 'Revoke'}
          </button>
        </form>
      </div>

      <div className="check-bar">
        <form className="check-bar-form" onSubmit={handleCheck}>
          <label htmlFor="check-did" className="visually-hidden">
            Check DID revocation status
          </label>
          <input
            id="check-did"
            className="input"
            placeholder="Check DID revocation status..."
            value={checkDid}
            onChange={(e) => setCheckDid(e.target.value)}
          />
          <button type="submit" className="btn-ghost" disabled={checking}>
            {checking ? 'Checking...' : 'Check'}
          </button>
        </form>
        {checkResult && (
          <div className="check-result">
            {checkResult === 'revoked' ? (
              <span className="check-badge check-revoked">REVOKED</span>
            ) : (
              <span className="check-badge check-clear">NOT REVOKED</span>
            )}
          </div>
        )}
      </div>

      {error && <p className="error-msg">{error}</p>}

      {loading ? (
        <p className="loading">Loading revocations...</p>
      ) : (
        <div className="revocation-list">
          {revocations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No active revocations.</p>
            </div>
          ) : (
            revocations.map((rev, i) => (
              <div key={rev.id || i} className="card revocation-item">
                <div className="revocation-info">
                  <span className="mono">{truncate(rev.revoked_did, 20)}</span>
                  <span className="reason-badge">{rev.reason}</span>
                  <span className="scope-badge">{rev.scope}</span>
                </div>
                <div className="revocation-meta">
                  {rev.revoker_did && (
                    <span className="revocation-revoker">by {truncate(rev.revoker_did, 20)}</span>
                  )}
                  {rev.created_at && (
                    <span className="revocation-date">{formatDate(rev.created_at)}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ========== Webhooks Tab ========== */

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({ url: '', events: [] });

  const fetchWebhooks = useCallback(async () => {
    try {
      const data = await getWebhooks();
      setWebhooks(data?.webhooks || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  function toggleEvent(event) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.url.trim() || form.events.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await createWebhook({ url: form.url.trim(), events: form.events });
      setForm({ url: '', events: [] });
      await fetchWebhooks();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this webhook? This cannot be undone.')) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="security-tab-content">
      <div className="card webhook-form">
        <h3>Register Webhook</h3>
        <form onSubmit={handleCreate}>
          <label htmlFor="webhook-url" className="visually-hidden">
            Webhook URL
          </label>
          <input
            id="webhook-url"
            className="input"
            placeholder="https://..."
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            required
          />
          <div className="event-checkboxes">
            {WEBHOOK_EVENTS.map((event) => (
              <label key={event} className="event-checkbox-label">
                <input
                  type="checkbox"
                  checked={form.events.includes(event)}
                  onChange={() => toggleEvent(event)}
                />
                <span>{event}</span>
              </label>
            ))}
          </div>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>

      {error && <p className="error-msg">{error}</p>}

      {loading ? (
        <p className="loading">Loading webhooks...</p>
      ) : (
        <div className="webhook-list">
          {webhooks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No webhooks registered.</p>
            </div>
          ) : (
            webhooks.map((wh) => (
              <div key={wh.id} className="card webhook-item">
                <div className="webhook-info">
                  <span className="mono">{truncate(wh.url, 40)}</span>
                  <div className="webhook-events">
                    {wh.events?.map((ev) => (
                      <span key={ev} className="event-badge">
                        {ev}
                      </span>
                    ))}
                  </div>
                  {wh.created_at && (
                    <span className="webhook-date">{formatDate(wh.created_at)}</span>
                  )}
                </div>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(wh.id)}
                  disabled={deletingId === wh.id}
                >
                  {deletingId === wh.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/* ========== Audit Log Tab ========== */

function AuditTab() {
  const [channel, setChannel] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  async function handleLoad(e) {
    e.preventDefault();
    if (!channel.trim()) return;
    setLoading(true);
    setError(null);
    setOffset(0);
    try {
      const data = await getAuditEntries(channel.trim(), { limit: 50, offset: 0 });
      const items = data?.entries || [];
      setEntries(items);
      setHasMore(items.length === 50);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadMore() {
    const nextOffset = offset + 50;
    setLoading(true);
    setError(null);
    try {
      const data = await getAuditEntries(channel.trim(), { limit: 50, offset: nextOffset });
      const items = data?.entries || [];
      setEntries((prev) => [...prev, ...items]);
      setOffset(nextOffset);
      setHasMore(items.length === 50);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="security-tab-content">
      <form className="audit-controls" onSubmit={handleLoad}>
        <label htmlFor="audit-channel" className="visually-hidden">
          Channel name
        </label>
        <input
          id="audit-channel"
          className="input"
          placeholder="Channel name (org/namespace/service)"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading && entries.length === 0 ? 'Loading...' : 'Load Entries'}
        </button>
      </form>

      <div className="audit-note">
        Audit entries are E2E encrypted. Decrypt locally with your channel's MLS group key.
      </div>

      {error && <p className="error-msg">{error}</p>}

      {entries.length > 0 && (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th scope="col">Epoch</th>
                <th scope="col">Sequence</th>
                <th scope="col">Created At</th>
                <th scope="col">Blob Size</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr key={entry.id || i}>
                  <td className="mono">{entry.epoch}</td>
                  <td className="mono">{entry.sequence}</td>
                  <td>{entry.created_at ? formatDate(entry.created_at) : '-'}</td>
                  <td className="mono">{entry.blob_size != null ? `${entry.blob_size} B` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {entries.length === 0 && !loading && channel && (
        <div className="card" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>No audit entries found for this channel.</p>
        </div>
      )}

      {hasMore && (
        <div className="pagination-controls">
          <button className="btn-ghost" onClick={handleLoadMore} disabled={loading}>
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}

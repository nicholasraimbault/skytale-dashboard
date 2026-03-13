// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useCallback } from 'react';
import '../styles/playground.css';

const ENDPOINTS = [
  { group: 'Channels', method: 'GET', path: '/v1/channels', body: null },
  {
    group: 'Channels',
    method: 'POST',
    path: '/v1/channels',
    body: '{\n  "name": "org/namespace/service"\n}',
  },
  { group: 'Channels', method: 'GET', path: '/v1/channels/{id}', body: null },
  { group: 'Agents', method: 'GET', path: '/v1/agents', body: null },
  {
    group: 'Agents',
    method: 'POST',
    path: '/v1/agents',
    body: '{\n  "did": "did:key:z6Mk...",\n  "name": "my-agent",\n  "capabilities": ["read", "write"],\n  "visibility": "public"\n}',
  },
  {
    group: 'Agents',
    method: 'PUT',
    path: '/v1/agents/{did}',
    body: '{\n  "name": "updated-name"\n}',
  },
  { group: 'Agents', method: 'DELETE', path: '/v1/agents/{did}', body: null },
  { group: 'Keys', method: 'GET', path: '/v1/keys', body: null },
  { group: 'Keys', method: 'POST', path: '/v1/keys', body: '{\n  "name": "production"\n}' },
  { group: 'Revocations', method: 'GET', path: '/v1/revocations', body: null },
  {
    group: 'Revocations',
    method: 'POST',
    path: '/v1/revocations',
    body: '{\n  "revoked_did": "did:key:z6Mk...",\n  "reason": "credential_compromise",\n  "signature": "...",\n  "scope": "full"\n}',
  },
  { group: 'Webhooks', method: 'GET', path: '/v1/webhooks', body: null },
  {
    group: 'Webhooks',
    method: 'POST',
    path: '/v1/webhooks',
    body: '{\n  "url": "https://example.com/webhook",\n  "events": ["agent.revoked", "auth.failed"]\n}',
  },
  { group: 'Usage', method: 'GET', path: '/v1/usage', body: null },
  { group: 'Billing', method: 'GET', path: '/v1/billing', body: null },
];

const METHOD_COLORS = {
  GET: 'method-get',
  POST: 'method-post',
  PUT: 'method-put',
  DELETE: 'method-delete',
};

function groupEndpoints(endpoints) {
  const groups = {};
  for (const ep of endpoints) {
    if (!groups[ep.group]) groups[ep.group] = [];
    groups[ep.group].push(ep);
  }
  return groups;
}

export default function Playground() {
  const [selected, setSelected] = useState(ENDPOINTS[0]);
  const [body, setBody] = useState(ENDPOINTS[0].body || '');
  const [response, setResponse] = useState(null);
  const [status, setStatus] = useState(null);
  const [timing, setTiming] = useState(null);
  const [sending, setSending] = useState(false);

  const groups = groupEndpoints(ENDPOINTS);

  const handleSelect = useCallback((endpoint) => {
    setSelected(endpoint);
    setBody(endpoint.body || '');
    setResponse(null);
    setStatus(null);
    setTiming(null);
  }, []);

  const handleSend = useCallback(async () => {
    setSending(true);
    setResponse(null);
    setStatus(null);
    setTiming(null);

    const start = performance.now();
    try {
      const options = {
        method: selected.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body.trim() && selected.method !== 'GET') {
        options.body = body;
      }
      const res = await fetch(`/api${selected.path}`, options);
      const elapsed = Math.round(performance.now() - start);
      setTiming(elapsed);
      setStatus(res.status);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        setResponse(JSON.stringify(json, null, 2));
      } catch {
        setResponse(text);
      }
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      setTiming(elapsed);
      setStatus(0);
      setResponse(err.message);
    } finally {
      setSending(false);
    }
  }, [selected, body]);

  const handleCopyCurl = useCallback(() => {
    let curl = `curl -X ${selected.method} https://api.skytale.sh${selected.path}`;
    curl += ' -H "Authorization: Bearer YOUR_API_KEY"';
    curl += ' -H "Content-Type: application/json"';
    if (body.trim() && selected.method !== 'GET') {
      curl += ` -d '${body.replace(/\n/g, '').replace(/\s+/g, ' ')}'`;
    }
    navigator.clipboard.writeText(curl);
  }, [selected, body]);

  function statusClass(code) {
    if (!code) return '';
    if (code >= 200 && code < 300) return 'status-success';
    if (code >= 400 && code < 500) return 'status-client-error';
    return 'status-server-error';
  }

  return (
    <main className="page playground-page" id="main-content">
      <h1 className="page-title">API Playground</h1>
      <p className="page-subtitle">Explore and test the Skytale API interactively.</p>

      <div className="playground-layout">
        <aside className="playground-sidebar">
          {Object.entries(groups).map(([group, endpoints]) => (
            <div key={group} className="playground-group">
              <div className="playground-group-label">{group}</div>
              {endpoints.map((ep, i) => (
                <button
                  key={`${ep.method}-${ep.path}-${i}`}
                  className={`playground-endpoint ${selected === ep ? 'active' : ''}`}
                  onClick={() => handleSelect(ep)}
                >
                  <span className={`playground-method ${METHOD_COLORS[ep.method]}`}>
                    {ep.method}
                  </span>
                  <span className="playground-path">{ep.path}</span>
                </button>
              ))}
            </div>
          ))}
        </aside>

        <div className="playground-main">
          <div className="playground-request card">
            <div className="playground-request-header">
              <span className={`playground-method-badge ${METHOD_COLORS[selected.method]}`}>
                {selected.method}
              </span>
              <span className="playground-url mono">/api{selected.path}</span>
            </div>

            <div className="playground-headers">
              <div className="playground-header-label">Headers</div>
              <div className="playground-header-row mono">
                <span className="playground-header-key">Authorization</span>
                <span className="playground-header-value">Bearer ••••••</span>
              </div>
              <div className="playground-header-row mono">
                <span className="playground-header-key">Content-Type</span>
                <span className="playground-header-value">application/json</span>
              </div>
            </div>

            {selected.method !== 'GET' && (
              <div className="playground-body-section">
                <div className="playground-header-label">Body</div>
                <textarea
                  className="playground-body-editor mono"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  spellCheck={false}
                />
              </div>
            )}

            <div className="playground-actions">
              <button className="btn-primary" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button className="btn-ghost" onClick={handleCopyCurl}>
                Copy as cURL
              </button>
            </div>
          </div>

          {(response !== null || status !== null) && (
            <div className="playground-response card">
              <div className="playground-response-header">
                <span className="playground-header-label">Response</span>
                <div className="playground-response-meta">
                  {status !== null && (
                    <span className={`playground-status-badge ${statusClass(status)}`}>
                      {status === 0 ? 'Network Error' : status}
                    </span>
                  )}
                  {timing !== null && <span className="playground-timing">{timing}ms</span>}
                </div>
              </div>
              <pre className="playground-response-body mono">
                <code>{response}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { getFederationDirectory, createFederationInvite, getChannels } from '../api.js';
import { truncateDid, truncate } from '../utils.js';
import './Federation.css';

export default function Federation() {
  // Directory state
  const [agents, setAgents] = useState([]);
  const [dirLoading, setDirLoading] = useState(false);
  const [dirError, setDirError] = useState(null);
  const [capability, setCapability] = useState('');
  const [org, setOrg] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 50;

  // Invite state
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [targetOrg, setTargetOrg] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState(null);
  const [inviteResult, setInviteResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchDirectory(0);
    getChannels()
      .then((data) => setChannels(data?.channels || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchDirectory(newOffset) {
    setDirLoading(true);
    setDirError(null);
    try {
      const data = await getFederationDirectory({
        capability: capability.trim() || undefined,
        org: org.trim() || undefined,
        limit: LIMIT,
        offset: newOffset,
      });
      const results = data?.agents || [];
      if (newOffset === 0) {
        setAgents(results);
      } else {
        setAgents((prev) => [...prev, ...results]);
      }
      setOffset(newOffset);
      setHasMore(results.length === LIMIT);
    } catch (err) {
      setDirError(err.message);
    } finally {
      setDirLoading(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    setOffset(0);
    fetchDirectory(0);
  }

  async function handleCreateInvite(e) {
    e.preventDefault();
    if (!selectedChannel || !targetOrg.trim()) return;
    setInviteLoading(true);
    setInviteError(null);
    setInviteResult(null);
    try {
      const result = await createFederationInvite({
        channel: selectedChannel,
        target_org_domain: targetOrg.trim(),
      });
      setInviteResult(result);
    } catch (err) {
      setInviteError(err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  return (
    <main className="page" id="main-content">
      <div className="keys-header">
        <div className="keys-header-left">
          <h1>Federation</h1>
          <p>Discover agents across organizations and create federation invites.</p>
        </div>
      </div>

      <div className="federation-directory card">
        <h2 className="section-heading">Agent Directory</h2>
        <form className="directory-filters" onSubmit={handleSearch}>
          <label htmlFor="fed-capability-filter" className="visually-hidden">
            Filter by capability
          </label>
          <input
            id="fed-capability-filter"
            className="input"
            placeholder="Filter by capability"
            value={capability}
            onChange={(e) => setCapability(e.target.value)}
          />
          <label htmlFor="fed-org-filter" className="visually-hidden">
            Filter by org domain
          </label>
          <input
            id="fed-org-filter"
            className="input"
            placeholder="Filter by org domain"
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
          <button type="submit" className="btn-primary" disabled={dirLoading}>
            {dirLoading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {dirError && <p className="error-msg">{dirError}</p>}

        <div className="directory-results">
          {agents.length === 0 && !dirLoading ? (
            <p className="empty-state">No agents found. Try adjusting your filters.</p>
          ) : (
            agents.map((agent, i) => (
              <div key={agent.did || i} className="directory-agent">
                <div className="directory-agent-main">
                  <span className="directory-agent-name">
                    {agent.display_name || 'Unnamed Agent'}
                  </span>
                  <span className="directory-agent-did mono" title={agent.did}>
                    {truncateDid(agent.did)}
                  </span>
                </div>
                {agent.org_domain && (
                  <span className="directory-agent-org">{agent.org_domain}</span>
                )}
                {agent.endpoint && (
                  <span className="directory-agent-endpoint mono" title={agent.endpoint}>
                    {truncate(agent.endpoint, 40)}
                  </span>
                )}
                {agent.capabilities?.length > 0 && (
                  <div className="directory-agent-caps">
                    {agent.capabilities.map((cap) => (
                      <span key={cap} className="badge badge-pro">
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {hasMore && (
          <button
            className="btn-ghost directory-load-more"
            onClick={() => fetchDirectory(offset + LIMIT)}
            disabled={dirLoading}
          >
            {dirLoading ? 'Loading...' : 'Load more'}
          </button>
        )}
      </div>

      <div className="federation-invite-section card">
        <h2 className="section-heading">Create Federation Invite</h2>

        {inviteResult && (
          <div className="federation-invite-success">
            <p>Invite created. Share this token with the target organization.</p>
            <div className="new-key-row">
              <code>{inviteResult.token}</code>
              <button
                className="btn-copy"
                aria-label="Copy to clipboard"
                onClick={() => {
                  navigator.clipboard.writeText(inviteResult.token);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {inviteResult.expires_at && (
              <p className="federation-invite-expiry">
                Expires {new Date(inviteResult.expires_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {inviteError && <p className="error-msg">{inviteError}</p>}

        <form className="federation-invite-form" onSubmit={handleCreateInvite}>
          <div className="federation-invite-fields">
            <div className="federation-invite-field">
              <label htmlFor="fed-channel" className="federation-invite-label">
                Channel
              </label>
              <select
                id="fed-channel"
                className="input"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                required
              >
                <option value="">Select a channel</option>
                {channels.map((ch) => (
                  <option key={ch.id} value={ch.name}>
                    {ch.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="federation-invite-field">
              <label htmlFor="fed-target-org" className="federation-invite-label">
                Target org domain
              </label>
              <input
                id="fed-target-org"
                className="input"
                placeholder="example.com"
                value={targetOrg}
                onChange={(e) => setTargetOrg(e.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={inviteLoading}>
            {inviteLoading ? 'Creating...' : 'Create Invite'}
          </button>
        </form>
      </div>
    </main>
  );
}

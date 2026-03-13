// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { getChannel, getPendingJoins, createInvite } from '../api.js';
import { formatDate, timeAgo, healthDotClass } from '../utils.js';
import './ChannelDetail.css';

export default function ChannelDetail() {
  const { id } = useParams();
  const [channel, setChannel] = useState(null);
  const [pendingJoins, setPendingJoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [maxUses, setMaxUses] = useState('1');
  const [ttl, setTtl] = useState('3600');
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [copied, setCopied] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const ch = await getChannel(id);
      setChannel(ch);
      if (ch?.name) {
        const joins = await getPendingJoins(ch.name);
        setPendingJoins(joins?.requests || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleCreateInvite(e) {
    e.preventDefault();
    if (!channel?.name) return;
    setCreatingInvite(true);
    setError(null);
    try {
      const result = await createInvite(
        channel.name,
        parseInt(maxUses, 10) || 1,
        parseInt(ttl, 10) || 3600,
      );
      setInviteToken(result.token);
      setShowInviteForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreatingInvite(false);
    }
  }

  if (loading)
    return (
      <div className="page">
        <p className="loading">Loading channel...</p>
      </div>
    );
  if (error && !channel)
    return (
      <div className="page">
        <p className="error-msg">
          {error}{' '}
          <button className="btn-ghost" onClick={fetchData}>
            Retry
          </button>
        </p>
      </div>
    );

  const healthColor = channel ? healthDotClass(channel.last_message_at) : 'red';

  return (
    <main className="page" id="main-content">
      <Link to="/channels" className="channel-detail-back">
        &larr; Channels
      </Link>

      <div className="channel-detail-header">
        <div className="channel-detail-title">
          <h1>{channel?.name || 'Channel'}</h1>
          <span
            className={`channel-health-dot ${healthColor}`}
            title={`Health: ${healthColor}`}
            role="status"
            aria-label={
              healthColor === 'green' ? 'Active' : healthColor === 'amber' ? 'Idle' : 'Inactive'
            }
          ></span>
        </div>
        {channel?.created_at && (
          <span className="channel-detail-date">Created {formatDate(channel.created_at)}</span>
        )}
      </div>

      {error && (
        <p className="error-msg">
          {error}{' '}
          <button className="btn-ghost" onClick={fetchData}>
            Retry
          </button>
        </p>
      )}

      {inviteToken && (
        <div className="new-key-banner">
          <p>Copy this invite token. It will expire based on your TTL setting.</p>
          <div className="new-key-row">
            <code>{inviteToken}</code>
            <button
              className="btn-copy"
              aria-label="Copy to clipboard"
              onClick={() => {
                navigator.clipboard.writeText(inviteToken);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      <div className="channel-detail-sections">
        <div className="channel-detail-section card">
          <h2 className="section-heading">Members</h2>
          <div className="channel-detail-members">
            <span className="channel-member-count">{channel?.member_count ?? 0}</span>
            <span className="channel-member-label">members in this channel</span>
          </div>
        </div>

        <div className="channel-detail-section card">
          <h2 className="section-heading">Activity</h2>
          <div className="channel-detail-activity">
            {channel?.last_message_at ? (
              <p>
                Last message <strong>{timeAgo(channel.last_message_at)}</strong>
              </p>
            ) : (
              <p className="channel-no-activity">No messages yet</p>
            )}
          </div>
        </div>

        <div className="channel-detail-section card">
          <h2 className="section-heading">Pending Joins</h2>
          {pendingJoins.length === 0 ? (
            <p className="empty-state">No pending join requests</p>
          ) : (
            <div className="channel-detail-pending">
              {pendingJoins.map((req, i) => (
                <div key={i} className="pending-item">
                  <span className="pending-identity mono">
                    {req.identity || req.did || 'Unknown'}
                  </span>
                  {req.created_at && (
                    <span className="pending-date">{formatDate(req.created_at)}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="channel-detail-section card">
          <div className="channel-invite-header">
            <h2 className="section-heading">Invite Management</h2>
            {!showInviteForm && (
              <button className="btn-primary" onClick={() => setShowInviteForm(true)}>
                Create Invite
              </button>
            )}
          </div>

          {showInviteForm && (
            <form className="channel-invite-form" onSubmit={handleCreateInvite}>
              <div className="channel-invite-fields">
                <div className="channel-invite-field">
                  <label htmlFor="channel-max-uses" className="channel-invite-label">
                    Max uses
                  </label>
                  <input
                    id="channel-max-uses"
                    className="input"
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                  />
                </div>
                <div className="channel-invite-field">
                  <label htmlFor="channel-ttl" className="channel-invite-label">
                    TTL (seconds)
                  </label>
                  <input
                    id="channel-ttl"
                    className="input"
                    type="number"
                    min="60"
                    value={ttl}
                    onChange={(e) => setTtl(e.target.value)}
                  />
                </div>
              </div>
              <div className="channel-invite-actions">
                <button type="submit" className="btn-primary" disabled={creatingInvite}>
                  {creatingInvite ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

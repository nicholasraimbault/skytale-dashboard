// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { getChannels, createInvite } from '../api.js';
import '../styles/pages.css';

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export default function Channels() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteToken, setInviteToken] = useState(null);
  const [invitingChannel, setInvitingChannel] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getChannels()
      .then((data) => setChannels(data?.channels || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite(channelName) {
    setInvitingChannel(channelName);
    setInviteToken(null);
    setError(null);
    try {
      const result = await createInvite(channelName);
      setInviteToken(result.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setInvitingChannel(null);
    }
  }

  if (loading) return <div className="page"><p className="loading">Loading channels...</p></div>;

  return (
    <div className="page">
      <div className="keys-header">
        <div className="keys-header-left">
          <h1>Channels</h1>
          <p>Your encrypted channels and shared context.</p>
        </div>
      </div>

      {inviteToken && (
        <div className="new-key-banner">
          <p>Copy this invite token. It expires in 1 hour.</p>
          <div className="new-key-row">
            <code>{inviteToken}</code>
            <button className="btn-copy" onClick={() => {
              navigator.clipboard.writeText(inviteToken);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="key-list">
        {channels.length === 0 ? (
          <div className="card" style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>
              No channels yet. Create one from the SDK — see the quickstart guide.
            </p>
          </div>
        ) : (
          channels.map((ch) => (
            <div key={ch.id} className="card key-item">
              <div className="key-info">
                <span className="key-name">{ch.name}</span>
                {ch.created_at && (
                  <span className="key-created">Created {formatDate(ch.created_at)}</span>
                )}
              </div>
              <button
                className="btn-ghost"
                onClick={() => handleInvite(ch.name)}
                disabled={invitingChannel === ch.name}
              >
                {invitingChannel === ch.name ? 'Creating...' : 'Invite'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

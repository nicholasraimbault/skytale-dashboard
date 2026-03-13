// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import {
  getTeamMembers,
  inviteTeamMember,
  updateMemberRole,
  removeMember,
  getTeamInvites,
  getAccount,
} from '../api.js';
import '../styles/team.css';

function formatDate(epoch) {
  if (!epoch) return '--';
  return new Date(epoch * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Team() {
  const [members, setMembers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviteSuccess, setInviteSuccess] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [rolesExpanded, setRolesExpanded] = useState(false);

  useEffect(() => {
    getAccount()
      .then((acct) => {
        setAccount(acct);
        if (acct.org_id) {
          return Promise.all([
            getTeamMembers(acct.org_id),
            getTeamInvites(acct.org_id).catch(() => []),
          ]);
        }
        return [[], []];
      })
      .then(([m, i]) => {
        setMembers(m || []);
        setInvites(i || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = members.some((m) => m.account_id === account?.id && m.role === 'admin');

  async function handleInvite(e) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteSuccess(null);
    setError(null);
    try {
      await inviteTeamMember(account.org_id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteSuccess(`Invite sent to ${inviteEmail.trim()}`);
      setInviteEmail('');
      setInviteRole('viewer');
      const updatedInvites = await getTeamInvites(account.org_id).catch(() => []);
      setInvites(updatedInvites || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleRoleChange(memberId, newRole) {
    setError(null);
    try {
      await updateMemberRole(account.org_id, memberId, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.account_id === memberId ? { ...m, role: newRole } : m)),
      );
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(memberId, memberEmail) {
    if (!window.confirm(`Remove ${memberEmail} from the team? This cannot be undone.`)) return;
    setError(null);
    try {
      await removeMember(account.org_id, memberId);
      setMembers((prev) => prev.filter((m) => m.account_id !== memberId));
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading)
    return (
      <main className="page" id="main-content">
        <p className="loading">Loading team...</p>
      </main>
    );
  if (error && !account)
    return (
      <main className="page" id="main-content">
        <p className="error-msg">{error}</p>
      </main>
    );

  if (!account?.org_id) {
    return (
      <main className="page" id="main-content">
        <h1 className="page-title">Team</h1>
        <p className="page-subtitle">Manage your team members and roles.</p>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>
            Your account is not part of a team. Teams are available on the Pro and Enterprise plans.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page" id="main-content">
      <h1 className="page-title">Team</h1>
      <p className="page-subtitle">Manage your team members and roles.</p>

      {error && <p className="error-msg">{error}</p>}

      {/* Invite Form (admin only) */}
      {isAdmin && (
        <div className="card team-invite-card">
          <h2 className="section-heading">Invite Member</h2>
          <form className="team-invite-form" onSubmit={handleInvite}>
            <label htmlFor="team-email" className="visually-hidden">
              Email address
            </label>
            <input
              id="team-email"
              className="input"
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <select
              className="input team-role-select"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="operator">Operator</option>
              <option value="viewer">Viewer</option>
            </select>
            <button type="submit" className="btn-primary" disabled={inviteLoading}>
              {inviteLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
          {inviteSuccess && <div className="team-invite-success">{inviteSuccess}</div>}
        </div>
      )}

      {/* Members List */}
      <div className="card">
        <h2 className="section-heading">Members</h2>
        {members.length === 0 ? (
          <div className="empty-state">No team members found.</div>
        ) : (
          <div className="team-members">
            {members.map((member) => {
              const isCurrentUser = member.account_id === account?.id;
              return (
                <div key={member.account_id} className="team-member-row">
                  <div className="team-member-info">
                    <span className="team-member-email">
                      {member.email}
                      {isCurrentUser && <span className="team-you-label"> (you)</span>}
                    </span>
                    <span className="team-member-date">{formatDate(member.joined_at)}</span>
                  </div>
                  <div className="team-member-right">
                    <span className={`badge team-role-badge team-role-${member.role}`}>
                      {member.role}
                    </span>
                    {isAdmin && !isCurrentUser && (
                      <div className="team-member-actions">
                        <select
                          className="input team-role-change-select"
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.account_id, e.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          className="btn-danger"
                          onClick={() => handleRemove(member.account_id, member.email)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pending Invites (admin only) */}
      {isAdmin && invites.length > 0 && (
        <div className="card team-pending">
          <h2 className="section-heading">Pending Invites</h2>
          <div className="team-members">
            {invites.map((invite) => (
              <div key={invite.id} className="team-member-row">
                <div className="team-member-info">
                  <span className="team-member-email">{invite.email}</span>
                  <span className="team-member-date">
                    Sent {formatDate(invite.created_at)} &middot; Expires{' '}
                    {formatDate(invite.expires_at)}
                  </span>
                </div>
                <div className="team-member-right">
                  <span className={`badge team-role-badge team-role-${invite.role}`}>
                    {invite.role}
                  </span>
                  <div className="team-member-actions">
                    <button
                      className="btn-ghost"
                      disabled
                      title="Coming soon"
                      style={{ fontSize: '0.8125rem', padding: '0.4rem 1rem' }}
                    >
                      Resend
                    </button>
                    <button className="btn-danger" disabled title="Coming soon">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role Descriptions */}
      <div className="card team-roles-card">
        <button className="team-roles-toggle" onClick={() => setRolesExpanded(!rolesExpanded)}>
          <span>What can each role do?</span>
          <span className="team-roles-chevron">{rolesExpanded ? '\u25B2' : '\u25BC'}</span>
        </button>
        {rolesExpanded && (
          <div className="team-roles-grid">
            <div className="card team-role-desc-card">
              <h3 className="team-role-desc-title">
                <span className={`badge team-role-badge team-role-admin`}>Admin</span>
              </h3>
              <p className="team-role-desc-text">
                Full access including billing, team management, and all operations.
              </p>
            </div>
            <div className="card team-role-desc-card">
              <h3 className="team-role-desc-title">
                <span className={`badge team-role-badge team-role-operator`}>Operator</span>
              </h3>
              <p className="team-role-desc-text">
                Manage channels, agents, revocations, webhooks. No billing or team management.
              </p>
            </div>
            <div className="card team-role-desc-card">
              <h3 className="team-role-desc-title">
                <span className={`badge team-role-badge team-role-viewer`}>Viewer</span>
              </h3>
              <p className="team-role-desc-text">
                Read-only access to all dashboards and data. Cannot modify anything.
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

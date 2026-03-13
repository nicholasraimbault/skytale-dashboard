// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getAccount, createBillingPortal, createCheckout, getBilling } from '../api.js';
import { formatDate } from '../utils.js';
import '../styles/pages.css';

const PLAN_BADGES = {
  free: 'badge-free',
  pro: 'badge-pro',
  enterprise: 'badge-enterprise',
};

export default function Account() {
  const [account, setAccount] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  useEffect(() => {
    Promise.all([getAccount(), getBilling().catch(() => null)])
      .then(([acct, billingData]) => {
        setAccount(acct);
        setBilling(billingData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleBillingPortal() {
    setPortalLoading(true);
    try {
      const result = await createBillingPortal();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleUpgrade() {
    setUpgradeLoading(true);
    setError(null);
    try {
      const result = await createCheckout('pro');
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpgradeLoading(false);
    }
  }

  if (loading)
    return (
      <main className="page" id="main-content">
        <p className="loading">Loading account...</p>
      </main>
    );
  if (error && !account)
    return (
      <main className="page" id="main-content">
        <p className="error-msg">{error}</p>
      </main>
    );

  const plan = account?.plan || 'free';

  return (
    <main className="page" id="main-content">
      <h1 className="page-title">Account</h1>
      <p className="page-subtitle">Your account details and billing.</p>

      <div className="account-grid">
        <div className="card">
          {account?.github_login && (
            <div className="account-field account-github-row">
              {account?.avatar_url && (
                <img src={account.avatar_url} alt="" className="account-avatar" />
              )}
              <div>
                <div className="account-field-label">GitHub</div>
                <div className="account-field-value">@{account.github_login}</div>
              </div>
            </div>
          )}

          <div className="account-field">
            <div className="account-field-label">Email</div>
            <div className="account-field-value">{account?.email || '--'}</div>
          </div>

          <div className="account-field">
            <div className="account-field-label">Account ID</div>
            <div className="account-field-value mono">{account?.id || '--'}</div>
          </div>

          <div className="account-field">
            <div className="account-field-label">Plan</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className={`badge ${PLAN_BADGES[plan] || 'badge-free'}`}>{plan}</span>
              {plan === 'free' && (
                <button
                  className="btn-primary"
                  onClick={handleUpgrade}
                  disabled={upgradeLoading}
                  style={{ fontSize: '0.8125rem', padding: '0.4rem 1.2rem' }}
                >
                  {upgradeLoading ? 'Redirecting...' : 'Upgrade to Pro'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card billing-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Billing</h2>

          {billing && (
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {billing.status && (
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Status: </span>
                  <span
                    className={`badge ${billing.status === 'active' ? 'badge-active' : billing.status === 'past_due' ? 'badge-warning' : 'badge-free'}`}
                    style={{ fontSize: '0.6875rem', padding: '0.125rem 0.5rem' }}
                  >
                    {billing.status}
                  </span>
                </div>
              )}
              {billing.current_period_end && (
                <div style={{ marginTop: '0.375rem' }}>
                  <span style={{ color: 'var(--text-dim)' }}>Period ends: </span>
                  {formatDate(billing.current_period_end)}
                </div>
              )}
              {billing.cancel_at_period_end && (
                <div style={{ marginTop: '0.375rem', color: 'var(--error)' }}>
                  Cancels at end of period
                </div>
              )}
            </div>
          )}

          <p>
            Manage your subscription, payment methods, and invoices through the Stripe billing
            portal.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="btn-primary" onClick={handleBillingPortal} disabled={portalLoading}>
              {portalLoading ? 'Opening...' : 'Manage billing'}
            </button>
            <Link
              to="/pricing"
              className="btn-ghost"
              style={{ fontSize: '0.8125rem', padding: '0.4rem 1.2rem' }}
            >
              Compare plans
            </Link>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <Link to="/team" className="btn-ghost">
          Manage team
        </Link>
      </div>
    </main>
  );
}

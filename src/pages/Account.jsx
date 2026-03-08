// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { getAccount, createBillingPortal } from '../api.js';
import '../styles/pages.css';

const PLAN_BADGES = {
  free: 'badge-free',
  pro: 'badge-pro',
  enterprise: 'badge-enterprise',
};

export default function Account() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    getAccount()
      .then(setAccount)
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

  if (loading) return <div className="page"><p className="loading">Loading account...</p></div>;
  if (error && !account) return <div className="page"><p className="error-msg">{error}</p></div>;

  const plan = account?.plan || 'free';

  return (
    <div className="page">
      <h1 className="page-title">Account</h1>
      <p className="page-subtitle">Your account details and billing.</p>

      <div className="account-grid">
        <div className="card">
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
            <div>
              <span className={`badge ${PLAN_BADGES[plan] || 'badge-free'}`}>
                {plan}
              </span>
            </div>
          </div>
        </div>

        <div className="card billing-card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Billing</h2>
          <p>
            Manage your subscription, payment methods, and invoices through the Stripe billing portal.
          </p>
          <div>
            <button
              className="btn-primary"
              onClick={handleBillingPortal}
              disabled={portalLoading}
            >
              {portalLoading ? 'Opening...' : 'Manage billing'}
            </button>
          </div>
          {error && <p className="error-msg">{error}</p>}
        </div>
      </div>
    </div>
  );
}

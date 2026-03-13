// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { getUsage, createCheckout } from '../api.js';
import './Pricing.css';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: '$0',
    period: '/mo',
    features: [
      { label: 'Messages', value: '100K/mo' },
      { label: 'Channels', value: 'Unlimited' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'API keys', value: 'Unlimited' },
      { label: 'Webhooks', value: 'Unlimited' },
      { label: 'Audit retention', value: '30 days' },
      { label: 'Compliance reports', value: 'View only' },
      { label: 'Federation', value: false },
      { label: 'Team seats', value: '1' },
      { label: 'SLA', value: false },
      { label: 'Support', value: 'Community' },
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: '$29',
    period: '/mo',
    featured: true,
    features: [
      { label: 'Messages', value: '1M included, then $0.10/1K' },
      { label: 'Channels', value: 'Unlimited' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'API keys', value: 'Unlimited' },
      { label: 'Webhooks', value: 'Unlimited' },
      { label: 'Audit retention', value: '1 year' },
      { label: 'Compliance reports', value: 'Export (PDF)' },
      { label: 'Federation', value: true },
      { label: 'Team seats', value: '5' },
      { label: 'SLA', value: '99.9%' },
      { label: 'Support', value: 'Email' },
    ],
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      { label: 'Messages', value: 'Unlimited' },
      { label: 'Channels', value: 'Unlimited' },
      { label: 'Agents', value: 'Unlimited' },
      { label: 'API keys', value: 'Unlimited' },
      { label: 'Webhooks', value: 'Unlimited' },
      { label: 'Audit retention', value: 'Custom' },
      { label: 'Compliance reports', value: 'Custom branding' },
      { label: 'Federation', value: true },
      { label: 'Team seats', value: 'Unlimited' },
      { label: 'SLA', value: '99.99%' },
      { label: 'Support', value: 'Dedicated' },
    ],
  },
];

const FAQ = [
  {
    question: 'Can I change plans at any time?',
    answer:
      'Yes. Upgrades take effect immediately and you are billed pro-rata for the remainder of the billing cycle. Downgrades take effect at the start of the next cycle.',
  },
  {
    question: 'What happens if I exceed my message quota?',
    answer:
      'Pro plans include 1M messages. Beyond that, additional messages are billed at $0.10 per 1K — no hard caps, your agents never stop. You will receive a warning at 80% of your included quota.',
  },
  {
    question: 'Is there a free trial for Pro?',
    answer:
      'The Free tier is effectively your trial. You can explore all core features with generous limits before upgrading to Pro for higher volumes and federation.',
  },
  {
    question: 'How does Enterprise pricing work?',
    answer:
      "Enterprise pricing is based on your organization's volume and requirements. Contact us at hello@skytale.sh and we will put together a custom proposal.",
  },
];

export default function Pricing() {
  const [currentTier, setCurrentTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUsage()
      .then((data) => setCurrentTier(data?.plan_tier || 'free'))
      .catch(() => setCurrentTier('free'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade() {
    setUpgrading(true);
    setError(null);
    try {
      const result = await createCheckout('pro');
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setUpgrading(false);
    }
  }

  if (loading)
    return (
      <main className="page" id="main-content">
        <p className="loading">Loading plans...</p>
      </main>
    );

  return (
    <main className="page" id="main-content">
      <div className="keys-header">
        <div className="keys-header-left">
          <h1>Pricing</h1>
          <p>Choose the plan that fits your trust infrastructure needs.</p>
        </div>
      </div>

      {error && <p className="error-msg">{error}</p>}

      <div className="pricing-grid">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          return (
            <div
              key={plan.tier}
              className={`pricing-column card ${plan.featured ? 'featured' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {isCurrent && (
                <span className="pricing-current-badge badge badge-pro">Your Plan</span>
              )}
              <div className="pricing-header">
                <h2 className="pricing-tier-name">{plan.name}</h2>
                <div className="pricing-price">
                  <span className="pricing-amount">{plan.price}</span>
                  {plan.period && <span className="pricing-period">{plan.period}</span>}
                </div>
              </div>

              <ul className="pricing-features">
                {plan.features.map((feat) => (
                  <li key={feat.label} className="pricing-feature">
                    <span className="pricing-feature-check">
                      {feat.value === false ? (
                        <span className="pricing-no">&mdash;</span>
                      ) : feat.value === true ? (
                        <span className="pricing-yes">&#10003;</span>
                      ) : (
                        <span className="pricing-yes">&#10003;</span>
                      )}
                    </span>
                    <span className="pricing-feature-label">{feat.label}</span>
                    <span className="pricing-feature-value">
                      {feat.value === true ? 'Yes' : feat.value === false ? '' : feat.value}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="pricing-cta">
                {plan.tier === 'free' &&
                  (isCurrent ? (
                    <button className="btn-ghost" disabled>
                      Current Plan
                    </button>
                  ) : (
                    <button className="btn-ghost" disabled>
                      Free Tier
                    </button>
                  ))}
                {plan.tier === 'pro' &&
                  (isCurrent ? (
                    <button className="btn-primary" disabled>
                      Current Plan
                    </button>
                  ) : (
                    <button className="btn-primary" onClick={handleUpgrade} disabled={upgrading}>
                      {upgrading ? 'Redirecting...' : 'Upgrade to Pro'}
                    </button>
                  ))}
                {plan.tier === 'enterprise' && (
                  <a href="mailto:hello@skytale.sh" className="btn-ghost">
                    Contact Us
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pricing-faq">
        <h2 className="pricing-faq-title">Frequently Asked Questions</h2>
        {FAQ.map((item, i) => (
          <details key={i} className="pricing-faq-item">
            <summary>{item.question}</summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </main>
  );
}

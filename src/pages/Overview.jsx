// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getUsage } from '../api.js';
import '../styles/pages.css';

const PLAN_BADGES = {
  free: 'badge-free',
  pro: 'badge-pro',
  enterprise: 'badge-enterprise',
};

function formatNumber(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card" style={{ padding: '0.75rem 1rem', fontSize: '0.8125rem' }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{formatNumber(payload[0].value)} messages</div>
    </div>
  );
}

export default function Overview() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUsage()
      .then(setUsage)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p className="loading">Loading usage data...</p></div>;
  if (error) return <div className="page"><p className="error-msg">{error}</p></div>;

  const plan = usage?.plan || 'free';
  const messagesUsed = usage?.messages_used || 0;
  const messagesLimit = usage?.messages_limit || 10000;
  const channelsUsed = usage?.channels_used || 0;
  const channelsLimit = usage?.channels_limit || 5;
  const chart = usage?.daily || [];

  const messagesPercent = Math.min((messagesUsed / messagesLimit) * 100, 100);
  const channelsPercent = Math.min((channelsUsed / channelsLimit) * 100, 100);

  function barClass(pct) {
    if (pct >= 90) return 'quota-bar-fill critical';
    if (pct >= 75) return 'quota-bar-fill warn';
    return 'quota-bar-fill';
  }

  return (
    <div className="page">
      <h1 className="page-title">Overview</h1>
      <p className="page-subtitle">Your Skytale usage at a glance.</p>

      <div className="grid-3 overview-stats">
        <div className="card">
          <span className="stat-label">Plan</span>
          <span className={`badge ${PLAN_BADGES[plan] || 'badge-free'}`}>
            {plan}
          </span>
        </div>
        <div className="card">
          <span className="stat-label">Messages this period</span>
          <span className="stat-value">{formatNumber(messagesUsed)}</span>
          <span className="stat-detail">of {formatNumber(messagesLimit)} limit</span>
        </div>
        <div className="card">
          <span className="stat-label">Active channels</span>
          <span className="stat-value">{channelsUsed}</span>
          <span className="stat-detail">of {channelsLimit} limit</span>
        </div>
      </div>

      {chart.length > 0 && (
        <div className="card usage-chart-card">
          <h2 className="usage-chart-title">Daily messages (last 30 days)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B6B73', fontSize: 11 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B6B73', fontSize: 11 }}
                tickFormatter={formatNumber}
                dx={-4}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="messages"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#msgGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card quota-section">
        <div className="quota-label">
          <span className="quota-label-text">Messages</span>
          <span className="quota-label-value">
            {formatNumber(messagesUsed)} / {formatNumber(messagesLimit)}
          </span>
        </div>
        <div className="quota-bar-bg">
          <div className={barClass(messagesPercent)} style={{ width: `${messagesPercent}%` }} />
        </div>

        <div className="quota-label" style={{ marginTop: '1.25rem' }}>
          <span className="quota-label-text">Channels</span>
          <span className="quota-label-value">
            {channelsUsed} / {channelsLimit}
          </span>
        </div>
        <div className="quota-bar-bg">
          <div className={barClass(channelsPercent)} style={{ width: `${channelsPercent}%` }} />
        </div>
      </div>
    </div>
  );
}

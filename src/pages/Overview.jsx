// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  getUsage,
  getKeys,
  getAgents,
  getChannels,
  getRevocations,
  getWebhooks,
  getActivityLog,
} from '../api.js';
import { timeAgo, healthDotClass, formatNumber, truncateDid } from '../utils.js';
import '../styles/pages.css';

const PLAN_BADGES = {
  free: 'badge-free',
  pro: 'badge-pro',
  enterprise: 'badge-enterprise',
};

function scoreColor(score) {
  if (score >= 80) return 'score-green';
  if (score >= 50) return 'score-amber';
  return 'score-red';
}

function daysBetween(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
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

const frameworkSnippets = (apiKey) => ({
  generic: `pip install skytale-sdk

from skytale_sdk import SkytaleChannelManager

mgr = SkytaleChannelManager(identity=b"my-agent", api_key="${apiKey}")
mgr.create("myorg/research/results")`,
  langgraph: `pip install skytale-sdk langgraph

from skytale_sdk import SkytaleChannelManager
from langgraph.graph import StateGraph

mgr = SkytaleChannelManager(identity=b"langgraph-agent", api_key="${apiKey}")
mgr.create("myorg/langgraph/workflow")

# Share state across LangGraph nodes via Skytale
from skytale_sdk.context import SharedContext
ctx = SharedContext(mgr, "myorg/langgraph/workflow")`,
  crewai: `pip install skytale-sdk crewai

from skytale_sdk import SkytaleChannelManager
from crewai import Agent, Task, Crew

mgr = SkytaleChannelManager(identity=b"crew-agent", api_key="${apiKey}")
mgr.create("myorg/crewai/project")

# Encrypted coordination between CrewAI agents
from skytale_sdk.context import SharedContext
ctx = SharedContext(mgr, "myorg/crewai/project")`,
  autogen: `pip install skytale-sdk pyautogen

from skytale_sdk import SkytaleChannelManager
import autogen

mgr = SkytaleChannelManager(identity=b"autogen-agent", api_key="${apiKey}")
mgr.create("myorg/autogen/chat")

# Secure multi-agent conversations
from skytale_sdk.context import SharedContext
ctx = SharedContext(mgr, "myorg/autogen/chat")`,
  a2a: `pip install skytale-sdk

from skytale_sdk import SkytaleChannelManager
from skytale_sdk.envelope import MultiProtocolEnvelope

mgr = SkytaleChannelManager(identity=b"a2a-agent", api_key="${apiKey}")
mgr.create("myorg/a2a/tasks")

# A2A-compatible encrypted messaging
envelope = MultiProtocolEnvelope(protocol="a2a")
envelope.set_payload({"task": "research", "query": "AI safety"})`,
});

const TAB_LABELS = {
  generic: 'Generic',
  langgraph: 'LangGraph',
  crewai: 'CrewAI',
  autogen: 'AutoGen',
  a2a: 'A2A',
};

export default function Overview() {
  const [usage, setUsage] = useState(null);
  const [keys, setKeys] = useState([]);
  const [agents, setAgents] = useState([]);
  const [channels, setChannels] = useState([]);
  const [_revocations, setRevocations] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checklistDismissed, setChecklistDismissed] = useState(
    () => localStorage.getItem('skytale_checklist_dismissed') === 'true',
  );
  const [dismissedActions, setDismissedActions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('skytale_dismissed_actions') || '[]');
    } catch {
      return [];
    }
  });
  const [securityEvents, setSecurityEvents] = useState([]);
  const [whatsNextDismissed, setWhatsNextDismissed] = useState(
    () => localStorage.getItem('skytale_whats_next_dismissed') === 'true',
  );
  const [activeTab, setActiveTab] = useState('generic');
  const [codeCopied, setCodeCopied] = useState(false);
  const [liveMode, setLiveMode] = useState(false);

  function loadDashboardData() {
    return Promise.all([
      getUsage().catch(() => null),
      getKeys().catch(() => ({ keys: [] })),
      getAgents().catch(() => ({ agents: [] })),
      getChannels().catch(() => ({ channels: [] })),
      getRevocations().catch(() => []),
      getWebhooks().catch(() => []),
      getActivityLog({ limit: 5, filter: 'security' }).catch(() => ({ entries: [] })),
    ]).then(
      ([
        usageData,
        keysData,
        agentsData,
        channelsData,
        revocationsData,
        webhooksData,
        activityData,
      ]) => {
        setUsage(usageData);
        setKeys(keysData?.keys || []);
        setAgents(agentsData?.agents || []);
        setChannels(channelsData?.channels || []);
        setRevocations(Array.isArray(revocationsData) ? revocationsData : []);
        setWebhooks(Array.isArray(webhooksData) ? webhooksData : []);
        setSecurityEvents(activityData?.entries || []);
      },
    );
  }

  function fetchDashboard() {
    setLoading(true);
    setError(null);
    loadDashboardData()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadDashboardData()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!liveMode) return;
    const interval = setInterval(() => {
      loadDashboardData().catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [liveMode]);

  if (loading)
    return (
      <main className="page" id="main-content">
        <h1 className="page-title">Overview</h1>
        <p className="page-subtitle">Trust command center for your Skytale deployment.</p>
        <div className="skeleton skeleton-card" style={{ height: '12rem' }} />
        <div className="grid-3 overview-stats" style={{ marginBottom: '1.5rem' }}>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
        <div className="skeleton skeleton-chart" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            marginTop: '2rem',
          }}
        >
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </main>
    );
  if (error && !usage)
    return (
      <div className="page">
        <p className="error-msg">{error}</p>
        <button className="btn-primary" onClick={fetchDashboard} style={{ marginTop: '1rem' }}>
          Retry
        </button>
      </div>
    );

  // --- Trust Health Score calculation ---
  const activeAgents = agents.filter((a) => a.status === 'active').length;
  const identityScore = agents.length > 0 ? Math.round((activeAgents / agents.length) * 100) : 0;
  const encryptionScore = channels.length > 0 ? 100 : 0;

  const hasRevocationWebhook = webhooks.some(
    (w) => w.events?.includes('agent.revoked') || w.event === 'agent.revoked',
  );
  const hasAuditWebhook = webhooks.some(
    (w) => w.events?.includes('audit.entry') || w.event === 'audit.entry',
  );
  const allKeysRecent = keys.length > 0 && keys.every((k) => daysBetween(k.created_at) < 90);
  const governanceParts = [
    hasRevocationWebhook ? 100 : 0,
    allKeysRecent ? 100 : 0,
    hasAuditWebhook ? 100 : 0,
  ];
  const governanceScore =
    governanceParts.length > 0
      ? Math.round(governanceParts.reduce((a, b) => a + b, 0) / governanceParts.length)
      : 0;

  const complianceScore = Math.round((identityScore + encryptionScore + governanceScore) / 3);
  const overallScore = Math.round(
    (identityScore + encryptionScore + governanceScore + complianceScore) / 4,
  );

  // --- Checklist ---
  const plan = usage?.plan_tier || 'free';
  const messagesUsed = usage?.messages_relayed || 0;
  const messagesLimit = usage?.limits?.messages_per_month || 100000;
  const chart = usage?.daily || [];
  const messagesPercent = Math.min((messagesUsed / messagesLimit) * 100, 100);

  const checklistItems = [
    { label: 'API key created', done: keys.length > 0, link: '/keys' },
    { label: 'Agent registered', done: agents.length > 0, link: '/agents' },
    { label: 'Channel created', done: channels.length > 0, link: '/channels' },
    { label: 'First message sent', done: messagesUsed > 0, link: null },
  ];
  const allChecklistDone = checklistItems.every((item) => item.done);
  const showChecklist = !checklistDismissed && !allChecklistDone;

  function dismissChecklist() {
    setChecklistDismissed(true);
    localStorage.setItem('skytale_checklist_dismissed', 'true');
  }

  // --- SDK Quickstart ---
  const firstApiKey =
    keys.length > 0 ? (keys[0].prefix ? keys[0].prefix + '...' : 'sk_live_...') : 'sk_live_...';
  const snippets = frameworkSnippets(firstApiKey);

  function handleCopyCode() {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  // --- Trust Action cards ---
  const trustActions = [];
  const oldKeys = keys.filter((k) => daysBetween(k.created_at) > 90);
  if (oldKeys.length > 0) {
    trustActions.push({
      id: 'old-keys',
      level: 'warn',
      message: `${oldKeys.length} API key${oldKeys.length > 1 ? 's' : ''} older than 90 days — rotate for trust hygiene`,
      link: '/keys',
    });
  }
  if (webhooks.length === 0) {
    trustActions.push({
      id: 'no-webhooks',
      level: 'critical',
      message: 'No security webhooks configured — set up alerts for revocations and audit events',
      link: '/webhooks',
    });
  }
  const agentsWithoutCaps = agents.filter((a) => !a.capabilities || a.capabilities.length === 0);
  if (agentsWithoutCaps.length > 0) {
    trustActions.push({
      id: 'no-caps',
      level: 'warn',
      message: `${agentsWithoutCaps.length} agent${agentsWithoutCaps.length > 1 ? 's have' : ' has'} no declared capabilities — update agent profiles`,
      link: '/agents',
    });
  }

  // Sort: critical first, then warn
  trustActions.sort(
    (a, b) => (a.level === 'critical' ? -1 : 1) - (b.level === 'critical' ? -1 : 1),
  );
  const visibleActions = trustActions.filter((a) => !dismissedActions.includes(a.id)).slice(0, 3);

  function dismissAction(id) {
    const updated = [...dismissedActions, id];
    setDismissedActions(updated);
    localStorage.setItem('skytale_dismissed_actions', JSON.stringify(updated));
  }

  // --- Burn rate ---
  const avgDailyUsage =
    chart.length > 0 ? chart.reduce((sum, d) => sum + (d.messages || 0), 0) / chart.length : 0;
  const daysUntilLimit =
    avgDailyUsage > 0 ? Math.floor((messagesLimit - messagesUsed) / avgDailyUsage) : null;

  // --- Channel health ---
  const topChannels = channels.slice(0, 6);

  function barClass(pct) {
    if (pct >= 90) return 'quota-bar-fill critical';
    if (pct >= 75) return 'quota-bar-fill warn';
    return 'quota-bar-fill';
  }

  return (
    <main className="page" id="main-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Overview</h1>
        <button
          className={`btn-ghost live-toggle ${liveMode ? 'live-toggle-active' : ''}`}
          onClick={() => setLiveMode(v => !v)}
          aria-pressed={liveMode}
        >
          {liveMode ? '● Live' : '○ Live'}
        </button>
      </div>
      <p className="page-subtitle">Trust command center for your Skytale deployment.</p>

      {/* Trust Health — full width */}
      <div className="card trust-health-hero">
        <div className={`trust-score ${scoreColor(overallScore)}`}>
          {overallScore}
          <span className="trust-score-unit">%</span>
        </div>
        <div className="trust-score-label">Trust Health</div>
        <div className="trust-breakdown">
          <div className="card trust-card">
            <div className={`trust-card-score ${scoreColor(identityScore)}`}>
              {identityScore}
              <span className="trust-card-score-unit">%</span>
            </div>
            <div className="trust-card-label">Identity</div>
            <Link to="/agents" className="trust-card-link">
              View details
            </Link>
            <div className="trust-card-detail">
              {agents.length > 0
                ? `${activeAgents} of ${agents.length} agent${agents.length !== 1 ? 's' : ''} active`
                : 'No agents registered'}
            </div>
          </div>
          <div className="card trust-card">
            <div className={`trust-card-score ${scoreColor(encryptionScore)}`}>
              {encryptionScore}
              <span className="trust-card-score-unit">%</span>
            </div>
            <div className="trust-card-label">Encryption</div>
            <Link to="/channels" className="trust-card-link">
              View details
            </Link>
            <div className="trust-card-detail">
              {channels.length > 0
                ? `${channels.length} encrypted channel${channels.length !== 1 ? 's' : ''}`
                : 'No channels \u2014 create one'}
            </div>
          </div>
          <div className="card trust-card">
            <div className={`trust-card-score ${scoreColor(governanceScore)}`}>
              {governanceScore}
              <span className="trust-card-score-unit">%</span>
            </div>
            <div className="trust-card-label">Governance</div>
            <Link to="/keys" className="trust-card-link">
              View details
            </Link>
            <div className="trust-card-detail">
              {[
                allKeysRecent ? 'Keys fresh' : 'Keys stale',
                hasRevocationWebhook ? 'Revocation alerts on' : null,
                hasAuditWebhook ? 'Audit alerts on' : null,
              ]
                .filter(Boolean)
                .join(' \u00B7 ') || 'No webhooks configured'}
            </div>
          </div>
          <div className="card trust-card">
            <div className={`trust-card-score ${scoreColor(complianceScore)}`}>
              {complianceScore}
              <span className="trust-card-score-unit">%</span>
            </div>
            <div className="trust-card-label">Compliance</div>
            <Link to="/account" className="trust-card-link">
              View details
            </Link>
            <div className="trust-card-detail">Composite of identity, encryption, governance</div>
          </div>
        </div>
      </div>

      {/* Two-column dashboard layout */}
      <div
        className="overview-columns"
        style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem', alignItems: 'flex-start' }}
      >
        {/* Left column — main content */}
        <div
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* SDK Quickstart */}
          {showChecklist && !allChecklistDone && (
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
                SDK Quickstart
              </h2>
              <div className="quickstart-tabs">
                {Object.keys(TAB_LABELS).map((key) => (
                  <button
                    key={key}
                    className={`quickstart-tab ${activeTab === key ? 'active' : ''}`}
                    onClick={() => setActiveTab(key)}
                  >
                    {TAB_LABELS[key]}
                  </button>
                ))}
              </div>
              <pre className="quickstart-code">
                <code>{snippets[activeTab]}</code>
              </pre>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  alignItems: 'center',
                }}
              >
                <button className="btn-ghost" onClick={handleCopyCode}>
                  {codeCopied ? 'Copied!' : 'Copy'}
                </button>
                <a
                  href="https://skytale.sh/docs"
                  className="btn-ghost"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open docs
                </a>
              </div>
            </div>
          )}

          {/* Chart */}
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

          {/* Channel Health */}
          {topChannels.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h2 className="section-heading" style={{ marginBottom: 0 }}>
                  Channel Health
                </h2>
                {channels.length > 6 && (
                  <Link to="/channels" style={{ fontSize: '0.8125rem' }}>
                    View all
                  </Link>
                )}
              </div>
              <div className="channel-health-grid">
                {topChannels.map((ch) => (
                  <div key={ch.id} className="card channel-health-card">
                    <div className="channel-health-name">
                      <span
                        className={`health-dot ${healthDotClass(ch.last_message_at)}`}
                        role="status"
                        aria-label={
                          healthDotClass(ch.last_message_at) === 'green'
                            ? 'Active'
                            : healthDotClass(ch.last_message_at) === 'amber'
                              ? 'Idle'
                              : 'Inactive'
                        }
                      />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ch.name}
                      </span>
                    </div>
                    <div className="channel-health-activity">
                      {ch.last_message_at
                        ? `Last active ${timeAgo(ch.last_message_at)}`
                        : 'No activity'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column — status & actions */}
        <div
          className="overview-aside"
          style={{
            width: 340,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          {/* Getting Started */}
          {showChecklist && (
            <div className="card getting-started">
              <div className="getting-started-header">
                <h2>Getting Started</h2>
                <button
                  className="trust-action-dismiss"
                  onClick={dismissChecklist}
                  aria-label="Dismiss checklist"
                >
                  &#x2715;
                </button>
              </div>
              {checklistItems.map((item) => (
                <div key={item.label} className="checklist-item">
                  <span className={`checklist-check ${item.done ? 'done' : ''}`}>
                    {item.done ? '\u2713' : ''}
                  </span>
                  {item.done ? (
                    <span>{item.label}</span>
                  ) : item.link ? (
                    <Link to={item.link}>{item.label}</Link>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Quota & Plan */}
          <div className="card quota-section">
            <div className="quota-label">
              <span className="quota-label-text">
                Messages
                <span
                  className={`badge ${PLAN_BADGES[plan] || 'badge-free'}`}
                  style={{ marginLeft: '0.5rem', verticalAlign: 'middle' }}
                >
                  {plan}
                </span>
              </span>
              <span className="quota-label-value">
                {formatNumber(messagesUsed)} / {formatNumber(messagesLimit)}
              </span>
            </div>
            <div className="quota-bar-bg">
              <div className={barClass(messagesPercent)} style={{ width: `${messagesPercent}%` }} />
            </div>
            {messagesUsed > 0 &&
              avgDailyUsage > 0 &&
              daysUntilLimit !== null &&
              daysUntilLimit > 0 && (
                <p className="burn-rate">
                  At current rate, you'll hit your limit in <strong>{daysUntilLimit} days</strong>
                </p>
              )}
            {messagesPercent >= 100 && (
              <div className="upgrade-banner critical">
                Rate-limited. <Link to="/account">Upgrade now</Link> to continue sending messages.
              </div>
            )}
            {messagesPercent >= 90 && messagesPercent < 100 && (
              <div className="upgrade-banner critical">
                You've used {Math.round(messagesPercent)}% of your message limit.{' '}
                <Link to="/account">Upgrade now</Link>
              </div>
            )}
            {messagesPercent >= 75 && messagesPercent < 90 && (
              <div className="upgrade-banner warn">
                You've used {Math.round(messagesPercent)}% of your message limit.{' '}
                <Link to="/account">Consider upgrading</Link>
              </div>
            )}
          </div>

          {/* Trust Actions */}
          {visibleActions.length > 0 &&
            visibleActions.map((action) => (
              <div key={action.id} className={`card trust-action-card ${action.level}`}>
                <span className="trust-action-text">{action.message}</span>
                <Link
                  to={action.link}
                  className="btn-ghost"
                  style={{ padding: '0.4rem 1rem', fontSize: '0.8125rem' }}
                >
                  Fix
                </Link>
                <button
                  className="trust-action-dismiss"
                  onClick={() => dismissAction(action.id)}
                  aria-label="Dismiss"
                >
                  &#x2715;
                </button>
              </div>
            ))}

          {/* Security Events */}
          <div className="card">
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem',
              }}
            >
              <h2 className="section-heading" style={{ marginBottom: 0 }}>
                Security Events
              </h2>
              <Link to="/activity" style={{ fontSize: '0.8125rem' }}>
                View all &rarr;
              </Link>
            </div>
            {securityEvents.length === 0 ? (
              <p className="empty-state" style={{ padding: '1rem 0' }}>
                No security events recorded
              </p>
            ) : (
              <div className="security-events-list">
                {securityEvents.map((ev, i) => (
                  <div key={ev.id || i} className="security-event-row">
                    <span className="security-event-action">{ev.action || 'Event'}</span>
                    {ev.actor && (
                      <span className="security-event-actor">{truncateDid(ev.actor)}</span>
                    )}
                    <span className="security-event-time">
                      {ev.created_at ? timeAgo(ev.created_at) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* What's Next — full width below the columns */}
      {(checklistDismissed || allChecklistDone) && !whatsNextDismissed && (
        <div className="card whats-next-section" style={{ marginTop: '1.5rem' }}>
          <div className="whats-next-header">
            <h2>What&apos;s Next?</h2>
            <button
              className="trust-action-dismiss"
              onClick={() => {
                setWhatsNextDismissed(true);
                localStorage.setItem('skytale_whats_next_dismissed', 'true');
              }}
              aria-label="Dismiss suggestions"
            >
              &#x2715;
            </button>
          </div>
          <div className="whats-next-grid">
            <Link to="/security" className="card whats-next-item">
              Set up webhooks
            </Link>
            <Link to="/settings" className="card whats-next-item">
              Configure org domain
            </Link>
            <Link to="/team" className="card whats-next-item">
              Invite team member
            </Link>
            <Link to="/compliance" className="card whats-next-item">
              Review compliance
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

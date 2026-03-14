// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  getKeys,
  getChannels,
  getAgents,
  getRevocations,
  getUsage,
  getSettings,
  getAccount,
  getActivityLog,
  getWebhooks,
  getAuditEntries,
} from '../api.js';
import { formatDate, truncateDid } from '../utils.js';
import '../styles/compliance.css';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysSince(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function avgAge(items, field) {
  if (items.length === 0) return 0;
  const total = items.reduce((sum, item) => sum + daysSince(item[field]), 0);
  return Math.round(total / items.length);
}

function sectionStatus(items) {
  if (items.every((i) => i.ok && !i.warn)) return 'pass';
  if (items.some((i) => !i.ok)) return 'fail';
  return 'partial';
}

// ---------------------------------------------------------------------------
// Control Matrix data — maps Skytale controls to 4 compliance frameworks
// ---------------------------------------------------------------------------

const CONTROLS = [
  {
    id: 'e2e',
    name: 'E2E Encryption',
    desc: 'MLS RFC 9420 for all channels',
    euAiAct: 'Art. 9, 15',
    soc2: 'CC6.1, CC6.7',
    gdpr: 'Art. 32',
    iso42001: 'A.8.2',
    check: (d) => (d.channels.length > 0 ? 'operational' : 'no-data'),
  },
  {
    id: 'zk',
    name: 'Zero-Knowledge Relay',
    desc: 'Relay cannot decrypt data',
    euAiAct: 'Art. 10',
    soc2: 'CC6.1',
    gdpr: 'Art. 25',
    iso42001: 'A.8.4',
    check: () => 'operational',
  },
  {
    id: 'audit',
    name: 'Hash-Chained Audit',
    desc: 'Tamper-evident audit log',
    euAiAct: 'Art. 12',
    soc2: 'CC7.2',
    gdpr: 'Art. 30',
    iso42001: 'A.6.2.6',
    check: (d, r) => {
      if (!r) return 'pending';
      const hasAudit = Object.values(r.auditSummary || {}).some((a) => a.hasEntries);
      return hasAudit ? 'operational' : 'no-data';
    },
  },
  {
    id: 'did',
    name: 'DID Identity',
    desc: 'W3C DID-based authentication',
    euAiAct: 'Art. 13',
    soc2: 'CC6.1, CC6.2',
    gdpr: 'Art. 5(1)(f)',
    iso42001: 'A.8.5',
    check: (d) => (d.settings?.did_web ? 'operational' : 'partial'),
  },
  {
    id: 'rotation',
    name: 'Key Rotation',
    desc: 'API key lifecycle management',
    euAiAct: 'Art. 9, 15',
    soc2: 'CC6.1',
    gdpr: 'Art. 32',
    iso42001: 'A.8.2',
    check: (d) => {
      if (d.keys.length === 0) return 'no-data';
      const stale = d.keys.filter((k) => k.created_at && daysSince(k.created_at) > 90);
      if (stale.length === 0) return 'operational';
      return stale.length === d.keys.length ? 'attention' : 'partial';
    },
  },
  {
    id: 'revocation',
    name: 'Revocation',
    desc: 'Agent/key revocation system',
    euAiAct: 'Art. 15',
    soc2: 'CC6.3',
    gdpr: 'Art. 17',
    iso42001: 'A.8.6',
    check: () => 'operational',
  },
  {
    id: 'fs',
    name: 'Forward Secrecy',
    desc: 'MLS tree ratcheting',
    euAiAct: 'Art. 9',
    soc2: 'CC6.7',
    gdpr: 'Art. 32',
    iso42001: 'A.8.2',
    check: () => 'operational',
  },
  {
    id: 'acl',
    name: 'Access Control',
    desc: 'API key + DID auth',
    euAiAct: 'Art. 15',
    soc2: 'CC6.1, CC6.3',
    gdpr: 'Art. 32',
    iso42001: 'A.8.5',
    check: (d) => (d.keys.length > 0 ? 'operational' : 'no-data'),
  },
  {
    id: 'webhooks',
    name: 'Webhook Monitoring',
    desc: 'Real-time security alerts',
    euAiAct: 'Art. 15',
    soc2: 'CC7.2, CC7.3',
    gdpr: 'Art. 33',
    iso42001: 'A.6.2.5',
    check: (d, r) => {
      if (!r) return 'pending';
      return r.webhooks.length > 0 ? 'operational' : 'attention';
    },
  },
  {
    id: 'minimization',
    name: 'Data Minimization',
    desc: 'No plaintext at relay',
    euAiAct: 'Art. 10',
    soc2: 'CC6.5',
    gdpr: 'Art. 5(1)(c), 25',
    iso42001: 'A.8.4',
    check: () => 'operational',
  },
];

// ---------------------------------------------------------------------------
// Risk Register data
// ---------------------------------------------------------------------------

const RISKS = [
  {
    id: 'R1',
    risk: 'Message interception',
    severity: 'Critical',
    mitigation: 'MLS E2E encryption',
    controlId: 'e2e',
    evidence: (d) => `${d.channels.length} encrypted channel(s)`,
  },
  {
    id: 'R2',
    risk: 'Identity spoofing',
    severity: 'High',
    mitigation: 'DID-based auth + revocation',
    controlId: 'did',
    evidence: (d) => `${d.agents.length} registered agent(s)`,
  },
  {
    id: 'R3',
    risk: 'Key compromise',
    severity: 'High',
    mitigation: 'Key rotation + revocation',
    controlId: 'rotation',
    evidence: (d) => {
      if (d.keys.length === 0) return 'No keys';
      const stale = d.keys.filter((k) => k.created_at && daysSince(k.created_at) > 90);
      return `Avg age ${avgAge(d.keys, 'created_at')}d, ${stale.length} stale`;
    },
  },
  {
    id: 'R4',
    risk: 'Audit tampering',
    severity: 'High',
    mitigation: 'Hash-chained entries',
    controlId: 'audit',
    evidence: (d) => `${d.channels.length} channel(s) with audit support`,
  },
  {
    id: 'R5',
    risk: 'Unauthorized access',
    severity: 'High',
    mitigation: 'API key auth + RBAC',
    controlId: 'acl',
    evidence: (d) => `${d.keys.length} active key(s)`,
  },
  {
    id: 'R6',
    risk: 'Data exfiltration',
    severity: 'High',
    mitigation: 'Zero-knowledge relay',
    controlId: 'zk',
    evidence: () => 'Architectural guarantee',
  },
  {
    id: 'R7',
    risk: 'Replay attacks',
    severity: 'Medium',
    mitigation: 'MLS epoch advancement',
    controlId: 'fs',
    evidence: () => 'Architectural guarantee',
  },
  {
    id: 'R8',
    risk: 'Undetected breach',
    severity: 'Medium',
    mitigation: 'Webhook alerts',
    controlId: 'webhooks',
    evidence: (d, r) => (r ? `${r.webhooks.length} webhook(s) configured` : 'Pending report'),
  },
  {
    id: 'R9',
    risk: 'Compliance gap',
    severity: 'Medium',
    mitigation: 'Automated assessment',
    controlId: null,
    evidence: () => 'This compliance center',
  },
  {
    id: 'R10',
    risk: 'Supply chain risk',
    severity: 'Low',
    mitigation: 'Auditable builds (cargo-auditable)',
    controlId: null,
    evidence: () => 'Build process',
  },
];

const TABS = ['Assessment', 'Control Matrix', 'System Card', 'Risk Register'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Compliance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [preparingReport, setPreparingReport] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [data, setData] = useState({
    channels: [],
    agents: [],
    keys: [],
    revocations: [],
    usage: null,
    settings: null,
    account: null,
  });

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [channelsRes, agentsRes, keysRes, revocationsRes, usageRes, settingsRes, accountRes] =
        await Promise.all([
          getChannels().catch(() => ({ channels: [] })),
          getAgents().catch(() => ({ agents: [] })),
          getKeys().catch(() => ({ keys: [] })),
          getRevocations().catch(() => ({ revocations: [] })),
          getUsage().catch(() => null),
          getSettings().catch(() => null),
          getAccount().catch(() => null),
        ]);
      setData({
        channels: channelsRes?.channels || [],
        agents: agentsRes?.agents || [],
        keys: keysRes?.keys || [],
        revocations: revocationsRes?.revocations || [],
        usage: usageRes,
        settings: settingsRes,
        account: accountRes,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  async function handleGenerateReport() {
    setPreparingReport(true);
    try {
      const promises = [
        getActivityLog({ limit: 50, filter: 'security' }).catch(() => ({ entries: [] })),
        getWebhooks().catch(() => ({ webhooks: [] })),
        ...data.channels
          .slice(0, 10)
          .map((ch) => getAuditEntries(ch.name, { limit: 1 }).catch(() => ({ entries: [] }))),
      ];
      const [activityRes, webhooksRes, ...auditResults] = await Promise.all(promises);
      const auditSummary = {};
      data.channels.slice(0, 10).forEach((ch, i) => {
        const entries = auditResults[i]?.entries || [];
        auditSummary[ch.name] = {
          hasEntries: entries.length > 0,
          latestDate: entries[0]?.created_at || null,
        };
      });
      setReportData({
        securityEvents: activityRes?.entries || [],
        webhooks: webhooksRes?.webhooks || [],
        auditSummary,
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.print();
          setPreparingReport(false);
        });
      });
    } catch (err) {
      setError('Failed to generate report: ' + err.message);
      setPreparingReport(false);
    }
  }

  // --- Loading / Error states ---

  if (loading) {
    return (
      <main className="page" id="main-content">
        <div className="loading">Loading compliance center...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page" id="main-content">
        <h1 className="page-title">Compliance</h1>
        <p className="error-msg">
          {error}{' '}
          <button className="btn-ghost" onClick={fetchAll}>
            Retry
          </button>
        </p>
      </main>
    );
  }

  // --- Computed values ---

  const visibilityCounts = { public: 0, organization: 0, private: 0 };
  for (const agent of data.agents) {
    const vis = agent.visibility || 'public';
    if (visibilityCounts[vis] !== undefined) visibilityCounts[vis]++;
  }

  const staleKeys = data.keys.filter((k) => k.created_at && daysSince(k.created_at) > 90);
  const keyAvgAge = avgAge(data.keys, 'created_at');
  const keysWithinRotation = data.keys.length - staleKeys.length;
  const keyRotationPct =
    data.keys.length > 0 ? Math.round((keysWithinRotation / data.keys.length) * 100) : 100;
  const agentsWithCaps = data.agents.filter(
    (a) => a.capabilities && a.capabilities.length > 0,
  ).length;

  // --- Assessment sections ---

  const assessmentSections = [
    {
      id: 'risk',
      title: 'Risk Management',
      article: 'Art. 9',
      type: 'built-in',
      items: [
        { label: 'MLS RFC 9420 key management', ok: true },
        { label: 'Forward secrecy via continuous key updates', ok: true },
        { label: 'Post-compromise security via MLS tree ratcheting', ok: true },
        {
          label:
            data.keys.length > 0
              ? `${keysWithinRotation}/${data.keys.length} keys within 90-day rotation window`
              : 'No API keys created yet',
          ok: staleKeys.length === 0,
          warn: staleKeys.length > 0,
        },
      ],
      evidence: [
        { label: 'Total API keys', value: String(data.keys.length) },
        { label: 'Average key age', value: data.keys.length > 0 ? `${keyAvgAge} days` : '--' },
        { label: 'Rotation compliance', value: `${keyRotationPct}%` },
      ],
      tables: [
        {
          title: 'Key Inventory',
          headers: ['Name', 'Prefix', 'Created', 'Age (days)', 'Status'],
          rows: data.keys.map((k) => [
            k.name || '--',
            k.prefix ? k.prefix + '...' : '--',
            formatDate(k.created_at),
            String(daysSince(k.created_at)),
            daysSince(k.created_at) > 90 ? 'ROTATE' : 'OK',
          ]),
        },
      ],
    },
    {
      id: 'governance',
      title: 'Data Governance',
      article: 'Art. 10',
      type: 'built-in',
      items: [
        { label: 'Zero-knowledge relay — no plaintext access', ok: true },
        { label: 'No plaintext logging at any layer', ok: true },
        { label: 'End-to-end encryption for all channel data', ok: true },
      ],
      evidence: [
        { label: 'Encrypted channels', value: String(data.channels.length) },
        {
          label: 'Total members',
          value: String(data.channels.reduce((s, c) => s + (c.member_count || 0), 0)),
        },
      ],
      tables: [],
    },
    {
      id: 'documentation',
      title: 'Technical Documentation',
      article: 'Art. 11',
      type: 'built-in',
      items: [
        { label: 'MLS RFC 9420 encryption protocol', ok: true },
        { label: 'CBOR RFC 8949 serialization for wire protocol', ok: true },
        { label: 'W3C DID-based identity and authentication', ok: true },
      ],
      evidence: [
        { label: 'DID:web URI', value: data.settings?.did_web || 'Not configured' },
        { label: 'Organization domain', value: data.settings?.org_domain || 'Not configured' },
      ],
      tables: [],
    },
    {
      id: 'records',
      title: 'Record-Keeping',
      article: 'Art. 12',
      type: 'configurable',
      link: '/channels',
      items: [
        {
          label: `${data.channels.length} channel(s) with audit trail support`,
          ok: data.channels.length > 0,
        },
        { label: 'Hash-chained audit log entries with epoch tracking', ok: true },
        { label: 'E2E encrypted audit blobs with local decryption', ok: true },
      ],
      evidence: [
        { label: 'Active channels', value: String(data.channels.length) },
        ...(reportData
          ? [
              {
                label: 'Channels with audit data',
                value: String(
                  Object.values(reportData.auditSummary).filter((a) => a.hasEntries).length,
                ),
              },
            ]
          : []),
      ],
      tables: [
        {
          title: 'Channel Inventory',
          headers: ['Channel', 'Members', 'Created', 'Audit'],
          rows: data.channels.map((ch) => [
            ch.name || '--',
            String(ch.member_count || 0),
            formatDate(ch.created_at),
            reportData?.auditSummary?.[ch.name]?.hasEntries ? 'Yes' : '--',
          ]),
        },
      ],
    },
    {
      id: 'transparency',
      title: 'Transparency',
      article: 'Art. 13',
      type: 'configurable',
      link: '/agents',
      items: [
        { label: `${data.agents.length} registered agent(s)`, ok: data.agents.length > 0 },
        {
          label: `Visibility: ${visibilityCounts.public} public, ${visibilityCounts.organization} org, ${visibilityCounts.private} private`,
          ok: true,
        },
        { label: 'DID-based identity with public verifiability', ok: true },
      ],
      evidence: [
        { label: 'Active agents', value: String(data.agents.length) },
        { label: 'With capabilities', value: String(agentsWithCaps) },
        {
          label: 'Visibility',
          value: `${visibilityCounts.public}p / ${visibilityCounts.organization}o / ${visibilityCounts.private}pr`,
        },
      ],
      tables: [
        {
          title: 'Agent Registry',
          headers: ['DID', 'Name', 'Visibility', 'Capabilities', 'Status'],
          rows: data.agents.map((a) => [
            truncateDid(a.did),
            a.display_name || '--',
            a.visibility || 'public',
            (a.capabilities || []).join(', ') || '--',
            a.status || 'active',
          ]),
        },
      ],
    },
    {
      id: 'cybersecurity',
      title: 'Cybersecurity',
      article: 'Art. 15',
      type: 'configurable',
      link: '/keys',
      items: [
        {
          label: `${data.channels.length} encrypted channel(s) active`,
          ok: data.channels.length > 0,
        },
        {
          label:
            staleKeys.length > 0
              ? `${staleKeys.length} key(s) older than 90 days — rotation recommended`
              : 'All keys within rotation window (< 90 days)',
          ok: staleKeys.length === 0,
          warn: staleKeys.length > 0,
        },
        { label: `${data.revocations.length} active revocation(s)`, ok: true },
      ],
      evidence: [
        { label: 'Active revocations', value: String(data.revocations.length) },
        ...(reportData
          ? [
              { label: 'Security events', value: String(reportData.securityEvents.length) },
              {
                label: 'Webhook monitoring',
                value:
                  reportData.webhooks.length > 0
                    ? `${reportData.webhooks.length} configured`
                    : 'Not configured',
              },
            ]
          : []),
      ],
      tables: [
        ...(data.revocations.length > 0
          ? [
              {
                title: 'Active Revocations',
                headers: ['Revoked DID', 'Reason', 'Revoker', 'Date'],
                rows: data.revocations.map((r) => [
                  truncateDid(r.revoked_did),
                  r.reason || '--',
                  truncateDid(r.revoker_did),
                  formatDate(r.created_at),
                ]),
              },
            ]
          : []),
        ...(reportData && reportData.securityEvents.length > 0
          ? [
              {
                title: 'Recent Security Events',
                headers: ['Action', 'Actor', 'Date'],
                rows: reportData.securityEvents
                  .slice(0, 20)
                  .map((e) => [e.action || '--', truncateDid(e.actor), formatDate(e.created_at)]),
              },
            ]
          : []),
      ],
    },
  ];

  const passingSections = assessmentSections.filter((s) =>
    s.items.every((item) => item.ok && !item.warn),
  ).length;
  const readiness = Math.round((passingSections / assessmentSections.length) * 100);

  // --- Control matrix statuses ---

  const controlStatuses = CONTROLS.map((c) => ({
    ...c,
    status: c.check(data, reportData),
  }));

  const frameworkCounts = (field) => {
    const relevant = controlStatuses.filter((c) => c[field]);
    const operational = relevant.filter((c) => c.status === 'operational').length;
    return { operational, total: relevant.length };
  };

  const frameworks = {
    'EU AI Act': frameworkCounts('euAiAct'),
    'SOC 2': frameworkCounts('soc2'),
    GDPR: frameworkCounts('gdpr'),
    'ISO 42001': frameworkCounts('iso42001'),
  };

  // --- Risk register statuses ---

  const riskRows = RISKS.map((r) => {
    const control = r.controlId ? controlStatuses.find((c) => c.id === r.controlId) : null;
    return {
      ...r,
      status: control ? control.status : 'operational',
      evidenceText: r.evidence(data, reportData),
    };
  });

  // --- Recommendations ---

  const recommendations = [];
  if (staleKeys.length > 0) {
    recommendations.push({
      text: `Rotate ${staleKeys.length} API key(s) older than 90 days`,
      link: '/keys',
      article: 'Art. 15',
    });
  }
  if (reportData && reportData.webhooks.length === 0) {
    recommendations.push({
      text: 'Configure security webhooks for real-time alerts',
      link: '/security',
      article: 'Art. 15',
    });
  } else if (!reportData) {
    recommendations.push({
      text: 'Generate a report to check webhook monitoring status',
      link: null,
      article: 'Art. 15',
    });
  }
  if (agentsWithCaps < data.agents.length && data.agents.length > 0) {
    recommendations.push({
      text: `Declare capabilities for ${data.agents.length - agentsWithCaps} agent(s)`,
      link: '/agents',
      article: 'Art. 13',
    });
  }
  if (!data.settings?.did_web) {
    recommendations.push({
      text: 'Configure DID:web identity',
      link: '/settings',
      article: 'Art. 11',
    });
  }
  if (data.channels.length === 0) {
    recommendations.push({
      text: 'Create your first encrypted channel',
      link: '/channels',
      article: 'Art. 12',
    });
  }

  // --- Status label helper ---

  function statusLabel(status) {
    switch (status) {
      case 'operational':
        return 'Operational';
      case 'partial':
        return 'Partial';
      case 'attention':
        return 'Attention';
      case 'no-data':
        return 'No data';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  }

  function statusClass(status) {
    switch (status) {
      case 'operational':
        return 'status-green';
      case 'partial':
      case 'no-data':
      case 'pending':
        return 'status-amber';
      case 'attention':
        return 'status-red';
      default:
        return 'status-amber';
    }
  }

  // --- Render helpers ---

  function renderEvidenceTable(table) {
    if (!table.rows || table.rows.length === 0) return null;
    return (
      <div key={table.title} className="compliance-evidence-table-wrap">
        <h4 className="compliance-evidence-table-title">{table.title}</h4>
        <table className="compliance-evidence-table">
          <thead>
            <tr>
              {table.headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSectionCard(section) {
    const isBuiltIn = section.type === 'built-in';
    const status = sectionStatus(section.items);
    const card = (
      <div className="card compliance-section">
        <div className="compliance-section-header">
          <div className="compliance-section-title-row">
            <h3 className="compliance-section-title">{section.title}</h3>
            <span
              className={`compliance-badge ${isBuiltIn ? 'compliance-badge--built-in' : 'compliance-badge--configurable'}`}
            >
              {isBuiltIn ? 'Built-in' : 'Configurable'}
            </span>
            <span className={`compliance-status-badge compliance-status-badge--${status}`}>
              {status === 'pass' ? 'Pass' : status === 'partial' ? 'Partial' : 'Action needed'}
            </span>
          </div>
          <span className="compliance-article-badge">{section.article}</span>
        </div>
        {isBuiltIn && (
          <p className="compliance-built-in-subtext">Handled by Skytale infrastructure</p>
        )}
        <ul className="compliance-checklist">
          {section.items.map((item, i) => (
            <li key={i} className="compliance-check-item">
              <span
                className={`compliance-check-icon ${item.ok ? (item.warn ? 'warn' : 'pass') : 'fail'}`}
              >
                {item.ok ? (item.warn ? '!' : '\u2713') : '\u2717'}
              </span>
              <span className={`compliance-check-label ${item.warn ? 'compliance-warn-text' : ''}`}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
        {section.evidence && section.evidence.length > 0 && (
          <div className="compliance-evidence">
            <div className="compliance-evidence-heading">Evidence</div>
            {section.evidence.map((ev, i) => (
              <div key={i} className="compliance-evidence-row">
                <span className="compliance-evidence-label">{ev.label}</span>
                <span className="compliance-evidence-value">{ev.value}</span>
              </div>
            ))}
          </div>
        )}
        {section.tables && section.tables.length > 0 && (
          <div className="print-only">{section.tables.map(renderEvidenceTable)}</div>
        )}
      </div>
    );

    if (!isBuiltIn && section.link) {
      return (
        <Link key={section.id} to={section.link} className="compliance-section-link">
          {card}
        </Link>
      );
    }
    return <div key={section.id}>{card}</div>;
  }

  // --- Tab content ---

  function renderAssessment() {
    return (
      <>
        <div className="compliance-sections">{assessmentSections.map(renderSectionCard)}</div>
        {recommendations.length > 0 && (
          <div className="card compliance-recommendations">
            <h3 className="compliance-section-title">Recommendations</h3>
            <ul className="compliance-recommendation-list">
              {recommendations.map((rec, i) => (
                <li key={i} className="compliance-recommendation-item">
                  <span className="compliance-recommendation-article">{rec.article}</span>
                  {rec.link ? (
                    <Link to={rec.link} className="compliance-recommendation-link">
                      {rec.text}
                    </Link>
                  ) : (
                    <span>{rec.text}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </>
    );
  }

  function renderControlMatrix() {
    return (
      <div className="compliance-matrix-wrap">
        <p className="compliance-matrix-desc">
          Cross-framework mapping of Skytale trust controls to EU AI Act, SOC 2, GDPR, and ISO
          42001.
        </p>
        <div className="compliance-matrix-table-wrap">
          <table className="compliance-evidence-table compliance-matrix-table">
            <thead>
              <tr>
                <th>Control</th>
                <th>Status</th>
                <th>EU AI Act</th>
                <th>SOC 2</th>
                <th>GDPR</th>
                <th>ISO 42001</th>
              </tr>
            </thead>
            <tbody>
              {controlStatuses.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="compliance-matrix-control-name">{c.name}</div>
                    <div className="compliance-matrix-control-desc">{c.desc}</div>
                  </td>
                  <td>
                    <span className={`compliance-matrix-status ${statusClass(c.status)}`}>
                      {statusLabel(c.status)}
                    </span>
                  </td>
                  <td className="compliance-matrix-ref">{c.euAiAct}</td>
                  <td className="compliance-matrix-ref">{c.soc2}</td>
                  <td className="compliance-matrix-ref">{c.gdpr}</td>
                  <td className="compliance-matrix-ref">{c.iso42001}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="compliance-framework-scores">
          {Object.entries(frameworks).map(([name, counts]) => (
            <div key={name} className="compliance-framework-score-card">
              <span className="compliance-framework-score-name">{name}</span>
              <span
                className={`compliance-framework-score-value ${counts.operational === counts.total ? 'score-green' : 'score-amber'}`}
              >
                {counts.operational}/{counts.total}
              </span>
              <span className="compliance-framework-score-label">controls operational</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderSystemCard() {
    const orgName = data.account?.name || data.account?.email || 'Not set';
    return (
      <div className="compliance-system-card">
        <div className="card compliance-system-card-section">
          <h3 className="compliance-section-title">System Purpose</h3>
          <p>
            Encrypted communication infrastructure for AI agents. Provides MLS RFC 9420 end-to-end
            encrypted channels, DID-based identity, and hash-chained audit trails.
          </p>
        </div>
        <div className="card compliance-system-card-section">
          <h3 className="compliance-section-title">Organization</h3>
          <div className="compliance-evidence">
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">Organization</span>
              <span className="compliance-evidence-value">{orgName}</span>
            </div>
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">Domain</span>
              <span className="compliance-evidence-value">
                {data.settings?.org_domain || 'Not configured'}
              </span>
            </div>
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">DID:web</span>
              <span className="compliance-evidence-value mono">
                {data.settings?.did_web || 'Not configured'}
              </span>
            </div>
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">Plan</span>
              <span className="compliance-evidence-value">
                {data.account?.plan_tier || data.usage?.plan_tier || '--'}
              </span>
            </div>
          </div>
        </div>
        <div className="card compliance-system-card-section">
          <h3 className="compliance-section-title">Protocols &amp; Standards</h3>
          <ul className="compliance-standards-list">
            <li>
              <strong>Encryption:</strong> MLS RFC 9420 (Messaging Layer Security)
            </li>
            <li>
              <strong>Serialization:</strong> CBOR RFC 8949
            </li>
            <li>
              <strong>Identity:</strong> W3C Decentralized Identifiers (DIDs)
            </li>
            <li>
              <strong>Transport:</strong> QUIC (RFC 9000) + gRPC
            </li>
          </ul>
        </div>
        <div className="card compliance-system-card-section">
          <h3 className="compliance-section-title">Data Handling</h3>
          <ul className="compliance-standards-list">
            <li>Zero-knowledge relay (no plaintext access)</li>
            <li>No plaintext logging at any layer</li>
            <li>E2E encryption for all channel data</li>
            <li>Hash-chained audit entries with epoch tracking</li>
            <li>Encrypted audit blobs (AES-256-GCM)</li>
          </ul>
        </div>
        <div className="card compliance-system-card-section">
          <h3 className="compliance-section-title">Deployment Stats</h3>
          <div className="compliance-evidence">
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">Registered agents</span>
              <span className="compliance-evidence-value">
                {data.agents.length} ({visibilityCounts.public} public,{' '}
                {visibilityCounts.organization} org, {visibilityCounts.private} private)
              </span>
            </div>
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">Encrypted channels</span>
              <span className="compliance-evidence-value">{data.channels.length}</span>
            </div>
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">API keys</span>
              <span className="compliance-evidence-value">
                {data.keys.length} (avg age: {data.keys.length > 0 ? `${keyAvgAge}d` : '--'})
              </span>
            </div>
            <div className="compliance-evidence-row">
              <span className="compliance-evidence-label">Active revocations</span>
              <span className="compliance-evidence-value">{data.revocations.length}</span>
            </div>
          </div>
        </div>
        <div className="card compliance-system-card-section">
          <h3 className="compliance-section-title">Human Oversight</h3>
          <ul className="compliance-standards-list">
            <li>Dashboard access at app.skytale.sh</li>
            <li>Webhook notifications for security events</li>
            <li>Manual key rotation and revocation controls</li>
            <li>Audit log inspection and export</li>
          </ul>
        </div>
        <div className="card compliance-system-card-section">
          <h3 className="compliance-section-title">Limitations</h3>
          <ul className="compliance-standards-list">
            <li>Does not provide AI model inference or agent logic</li>
            <li>Relay cannot decrypt or inspect message content</li>
            <li>Audit entries are E2E encrypted (opaque to server)</li>
          </ul>
        </div>
      </div>
    );
  }

  function renderRiskRegister() {
    return (
      <div className="compliance-risk-wrap">
        <p className="compliance-matrix-desc">
          Risk assessment mapping identified threats to Skytale mitigations and operational
          evidence.
        </p>
        <div className="compliance-matrix-table-wrap">
          <table className="compliance-evidence-table compliance-risk-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Risk</th>
                <th>Severity</th>
                <th>Mitigation</th>
                <th>Status</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {riskRows.map((r) => (
                <tr key={r.id}>
                  <td className="compliance-risk-id">{r.id}</td>
                  <td>{r.risk}</td>
                  <td>
                    <span
                      className={`compliance-severity compliance-severity--${r.severity.toLowerCase()}`}
                    >
                      {r.severity}
                    </span>
                  </td>
                  <td>{r.mitigation}</td>
                  <td>
                    <span className={`compliance-matrix-status ${statusClass(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="compliance-risk-evidence">{r.evidenceText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const tabContent = [renderAssessment, renderControlMatrix, renderSystemCard, renderRiskRegister];
  const reportDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const orgName = data.account?.name || data.account?.email || '--';

  return (
    <main className="page compliance-page" id="main-content">
      {/* ─── PRINT-ONLY: Cover ─── */}
      <div className="compliance-print-header print-only" aria-hidden="true">
        <h1 className="compliance-print-title">Skytale Trust Layer</h1>
        <h2 className="compliance-print-subtitle">Compliance Assessment Report</h2>
        <hr className="compliance-print-rule" />
        <div className="compliance-print-meta">
          <div>
            <strong>Organization:</strong> {orgName}
          </div>
          <div>
            <strong>Domain:</strong> {data.settings?.org_domain || 'Not configured'}
          </div>
          <div>
            <strong>DID:web:</strong> {data.settings?.did_web || 'Not configured'}
          </div>
          <div>
            <strong>Report Date:</strong> {reportDate}
          </div>
          <div>
            <strong>System:</strong> Skytale Trust Layer
          </div>
        </div>
        <p className="compliance-print-generated">
          Generated by Skytale Dashboard &middot; app.skytale.sh
        </p>
      </div>

      {/* ─── SCREEN: Header ─── */}
      <h1 className="page-title screen-only">Compliance</h1>
      <p className="page-subtitle screen-only">Compliance center for your Skytale deployment.</p>

      {/* ─── Summary card ─── */}
      <div className="card compliance-summary">
        <div className="compliance-score">
          <span
            className={`compliance-score-value ${readiness === 100 ? 'score-green' : readiness >= 80 ? 'score-amber' : 'score-red'}`}
          >
            {readiness}
            <span className="compliance-score-unit">%</span>
          </span>
          <span className="compliance-score-label">EU AI Act Readiness</span>
        </div>
        <p className="compliance-score-detail">
          {passingSections} of {assessmentSections.length} sections fully compliant
        </p>
        <div className="compliance-stats-row">
          <div className="compliance-stat-card">
            <span className="compliance-stat-value">{data.agents.length}</span>
            <span className="compliance-stat-label">Agents</span>
          </div>
          <div className="compliance-stat-card">
            <span className="compliance-stat-value">{data.channels.length}</span>
            <span className="compliance-stat-label">Channels</span>
          </div>
          <div className="compliance-stat-card">
            <span className="compliance-stat-value">{data.keys.length}</span>
            <span className="compliance-stat-label">Keys</span>
          </div>
          <div className="compliance-stat-card">
            <span className="compliance-stat-value">{data.revocations.length}</span>
            <span className="compliance-stat-label">Revocations</span>
          </div>
        </div>
        <div className="compliance-summary-actions screen-only">
          <button className="btn-primary" onClick={handleGenerateReport} disabled={preparingReport}>
            {preparingReport ? 'Preparing report...' : 'Generate Report'}
          </button>
          <button className="btn-ghost" onClick={fetchAll}>
            Refresh
          </button>
        </div>
      </div>

      {/* ─── PRINT-ONLY: Executive Summary ─── */}
      <div className="compliance-print-summary print-only" aria-hidden="true">
        <h2 className="compliance-print-section-title">Executive Summary</h2>
        <div className="compliance-evidence">
          <div className="compliance-evidence-row">
            <span className="compliance-evidence-label">EU AI Act readiness</span>
            <span className="compliance-evidence-value">{readiness}%</span>
          </div>
          <div className="compliance-evidence-row">
            <span className="compliance-evidence-label">Sections compliant</span>
            <span className="compliance-evidence-value">
              {passingSections} of {assessmentSections.length}
            </span>
          </div>
          {Object.entries(frameworks).map(([name, counts]) => (
            <div key={name} className="compliance-evidence-row">
              <span className="compliance-evidence-label">{name} controls</span>
              <span className="compliance-evidence-value">
                {counts.operational}/{counts.total} operational
              </span>
            </div>
          ))}
        </div>
        {recommendations.length > 0 && (
          <>
            <h3 className="compliance-print-sub-title">Recommendations</h3>
            <ol className="compliance-print-recommendations">
              {recommendations.map((rec, i) => (
                <li key={i}>
                  {rec.text} ({rec.article})
                </li>
              ))}
            </ol>
          </>
        )}
      </div>

      {/* ─── SCREEN: Tabs ─── */}
      <nav className="compliance-tabs screen-only" aria-label="Compliance sections">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            className={`compliance-tab ${activeTab === i ? 'compliance-tab--active' : ''}`}
            onClick={() => setActiveTab(i)}
            aria-current={activeTab === i ? 'page' : undefined}
          >
            {tab}
          </button>
        ))}
      </nav>

      {/* ─── SCREEN: Active tab content ─── */}
      <div className="screen-only">{tabContent[activeTab]()}</div>

      {/* ─── PRINT-ONLY: All tabs content ─── */}
      <div className="print-only" aria-hidden="true">
        <h2 className="compliance-print-section-title">EU AI Act Assessment</h2>
        {renderAssessment()}
        <h2 className="compliance-print-section-title compliance-print-page-break">
          Control Matrix
        </h2>
        {renderControlMatrix()}
        <h2 className="compliance-print-section-title compliance-print-page-break">System Card</h2>
        {renderSystemCard()}
        <h2 className="compliance-print-section-title compliance-print-page-break">
          Risk Register
        </h2>
        {renderRiskRegister()}
      </div>

      {/* ─── PRINT-ONLY: Footer ─── */}
      <div className="compliance-print-footer print-only" aria-hidden="true">
        <hr className="compliance-print-rule" />
        <p>Report generated: {new Date().toISOString()}</p>
        <p>Data source: Skytale API v1 (app.skytale.sh)</p>
        <p>Encryption: All audit entries E2E encrypted (opaque blobs)</p>
        <p>
          This report reflects infrastructure configuration at time of generation. It does not
          constitute legal compliance advice.
        </p>
      </div>
    </main>
  );
}

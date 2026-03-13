// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { getKeys, getChannels, getAgents, getRevocations, getUsage } from '../api.js';
import '../styles/compliance.css';

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

const STATIC_SECTIONS = [
  {
    id: 'risk',
    title: 'Risk Management',
    article: 'Art. 9',
    type: 'built-in',
    items: [
      { label: 'MLS RFC 9420 key management', ok: true },
      { label: 'Forward secrecy via continuous key updates', ok: true },
      { label: 'Post-compromise security via MLS tree ratcheting', ok: true },
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
  },
  {
    id: 'documentation',
    title: 'Technical Documentation',
    article: 'Art. 11',
    type: 'built-in',
    items: [
      { label: 'MLS RFC 9420 encryption protocol', ok: true },
      { label: 'CBOR serialization for wire protocol', ok: true },
      { label: 'DID-based identity and authentication', ok: true },
    ],
  },
];

export default function Compliance() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    channels: [],
    agents: [],
    keys: [],
    revocations: [],
    usage: null,
  });

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [channelsRes, agentsRes, keysRes, revocationsRes, usageRes] = await Promise.all([
        getChannels().catch(() => ({ channels: [] })),
        getAgents().catch(() => ({ agents: [] })),
        getKeys().catch(() => ({ keys: [] })),
        getRevocations().catch(() => ({ revocations: [] })),
        getUsage().catch(() => null),
      ]);
      setData({
        channels: channelsRes?.channels || [],
        agents: agentsRes?.agents || [],
        keys: keysRes?.keys || [],
        revocations: revocationsRes?.revocations || [],
        usage: usageRes,
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

  if (loading) {
    return (
      <main className="page" id="main-content">
        <div className="loading">Generating compliance report...</div>
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

  // Dynamic sections
  const visibilityCounts = { public: 0, organization: 0, private: 0 };
  for (const agent of data.agents) {
    const vis = agent.visibility || 'public';
    if (visibilityCounts[vis] !== undefined) visibilityCounts[vis]++;
  }

  const staleKeys = data.keys.filter((k) => k.created_at && daysSince(k.created_at) > 90);

  const dynamicSections = [
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
          label: `Visibility distribution: ${visibilityCounts.public} public, ${visibilityCounts.organization} org, ${visibilityCounts.private} private`,
          ok: true,
        },
        { label: 'DID-based identity with public verifiability', ok: true },
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
    },
  ];

  const allSections = [...STATIC_SECTIONS, ...dynamicSections];
  const passingSections = allSections.filter((s) => s.items.every((item) => item.ok)).length;
  const readiness = Math.round((passingSections / allSections.length) * 100);

  return (
    <main className="page compliance-page" id="main-content">
      <h1 className="page-title">Compliance</h1>
      <p className="page-subtitle">EU AI Act compliance report for your Skytale deployment.</p>

      <div className="card compliance-summary">
        <div className="compliance-score">
          <span
            className={`compliance-score-value ${readiness === 100 ? 'score-green' : readiness >= 80 ? 'score-amber' : 'score-red'}`}
          >
            {readiness}%
          </span>
          <span className="compliance-score-label">Compliance Readiness</span>
        </div>
        <p className="compliance-score-detail">
          {passingSections} of {allSections.length} sections fully compliant
        </p>
        <button className="btn-ghost" onClick={() => window.print()}>
          Download PDF
        </button>
      </div>

      <div className="compliance-sections">
        {allSections.map((section) => {
          const isBuiltIn = section.type === 'built-in';
          const sectionContent = (
            <div key={section.id} className="card compliance-section">
              <div className="compliance-section-header">
                <div className="compliance-section-title-row">
                  <h3 className="compliance-section-title">{section.title}</h3>
                  <span
                    className={`compliance-badge ${isBuiltIn ? 'compliance-badge--built-in' : 'compliance-badge--configurable'}`}
                  >
                    {isBuiltIn ? 'Built-in' : 'Configurable'}
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
                    <span
                      className={`compliance-check-label ${item.warn ? 'compliance-warn-text' : ''}`}
                    >
                      {item.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );

          if (!isBuiltIn && section.link) {
            return (
              <Link key={section.id} to={section.link} className="compliance-section-link">
                {sectionContent}
              </Link>
            );
          }
          return sectionContent;
        })}
      </div>
    </main>
  );
}

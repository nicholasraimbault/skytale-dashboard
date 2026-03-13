// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { getAccount, getKeys, createKey } from '../api.js';
import './Welcome.css';

function snippets(apiKey) {
  const key = apiKey || 'sk_live_...';
  return {
    python: `pip install skytale-sdk

from skytale_sdk import SkytaleChannelManager
from skytale_sdk.context import SharedContext

mgr = SkytaleChannelManager(identity=b"my-agent", api_key="${key}")
mgr.create("myorg/research/results")
ctx = SharedContext(mgr, "myorg/research/results")
ctx.set("status", {"phase": "ready"})`,
    typescript: `npm install @skytalesh/sdk

import { SkytaleChannelManager } from "@skytalesh/sdk";
import { SharedContext } from "@skytalesh/sdk/context";

const mgr = new SkytaleChannelManager({ identity: "my-agent", apiKey: "${key}" });
await mgr.create("myorg/research/results");
const ctx = new SharedContext(mgr, "myorg/research/results");
ctx.set("status", { phase: "ready" });`,
  };
}

export default function Welcome() {
  const [account, setAccount] = useState(null);
  const [apiKey, setApiKey] = useState(null);
  const [hasExistingKeys, setHasExistingKeys] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('python');
  const navigate = useNavigate();
  const keyCreationAttempted = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const acct = await getAccount();
        if (!cancelled) setAccount(acct);
      } catch {
        // Account fetch failed — non-critical, continue
      }

      if (keyCreationAttempted.current) return;
      keyCreationAttempted.current = true;

      try {
        const keys = await getKeys();
        if (cancelled) return;

        if (keys && keys.length > 0) {
          setHasExistingKeys(true);
          return;
        }

        const result = await createKey('quickstart');
        if (!cancelled && result?.api_key) {
          setApiKey(result.api_key);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = account?.github_login || account?.email || 'there';
  const code = snippets(apiKey);

  async function handleCopy() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may not be available
    }
  }

  async function handleRetry() {
    setError(null);
    try {
      const result = await createKey('quickstart');
      if (result?.api_key) setApiKey(result.api_key);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="welcome-page" id="main-content">
      <div className="welcome-content">
        <div className="welcome-header">
          {account?.avatar_url && (
            <img src={account.avatar_url} alt="" className="welcome-avatar" />
          )}
          <h1>Welcome, {displayName}</h1>
          <p className="welcome-subtitle">
            You're all set. Here's everything you need to start building the trust layer for your AI
            agents.
          </p>
        </div>

        {hasExistingKeys ? (
          <div className="welcome-key-card card">
            <h2>You already have API keys</h2>
            <p className="welcome-key-warning">Manage your keys from the dashboard.</p>
            <button className="btn-primary" onClick={() => navigate('/keys')}>
              View API Keys
            </button>
          </div>
        ) : apiKey ? (
          <div className="welcome-key-card card">
            <h2>Your API Key</h2>
            <div className="welcome-key-row">
              <code className="welcome-key-value">{apiKey}</code>
              <button className="btn-copy" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="welcome-key-warning">Save this key now — you won't see it again.</p>
          </div>
        ) : error ? (
          <div className="welcome-key-card card">
            <h2>Key creation failed</h2>
            <p className="welcome-key-warning">{error}</p>
            <button className="btn-primary" onClick={handleRetry}>
              Retry
            </button>
          </div>
        ) : (
          <div className="welcome-key-card card">
            <h2>Creating your API key...</h2>
          </div>
        )}

        <div className="welcome-quickstart card">
          <h2>Quickstart</h2>
          <div className="welcome-tabs">
            <button
              className={`welcome-tab ${tab === 'python' ? 'active' : ''}`}
              onClick={() => setTab('python')}
            >
              Python
            </button>
            <button
              className={`welcome-tab ${tab === 'typescript' ? 'active' : ''}`}
              onClick={() => setTab('typescript')}
            >
              TypeScript
            </button>
          </div>
          <pre className="welcome-code">
            <code>{tab === 'python' ? code.python : code.typescript}</code>
          </pre>
        </div>

        <div className="welcome-actions">
          <button className="btn-primary" onClick={() => navigate('/')}>
            Go to Dashboard
          </button>
          <a
            href="https://skytale.sh/docs"
            className="btn-ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read the docs
          </a>
        </div>
      </div>
    </main>
  );
}

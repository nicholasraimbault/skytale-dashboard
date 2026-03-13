// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useCallback } from 'react';
import {
  getSettings,
  updateSettings,
  getUsage,
  getAgents,
  getChannels,
  getAuditEntries,
} from '../api.js';
import '../styles/settings.css';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState({
    webhook_url: '',
    notify_quota: true,
    notify_security: true,
    rate_limit_tier: 'standard',
    default_visibility: 'public',
    org_domain: '',
    did_web: '',
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await getSettings();
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({
        webhook_url: settings.webhook_url,
        notify_quota: settings.notify_quota,
        notify_security: settings.notify_security,
        default_visibility: settings.default_visibility,
        org_domain: settings.org_domain,
      });
      showToast('Settings saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [settings, showToast]);

  function handleChange(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportUsage() {
    try {
      const data = await getUsage();
      const usage = data?.usage || data;
      const rows = [['Metric', 'Value']];
      if (usage && typeof usage === 'object') {
        for (const [key, value] of Object.entries(usage)) {
          rows.push([key, String(value)]);
        }
      }
      const csv = rows.map((r) => r.join(',')).join('\n');
      downloadBlob(csv, 'skytale-usage.csv', 'text/csv');
      showToast('Usage exported');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleExportAgents() {
    try {
      const data = await getAgents();
      const agents = data?.agents || [];
      downloadBlob(JSON.stringify(agents, null, 2), 'skytale-agents.json', 'application/json');
      showToast('Agents exported');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  async function handleExportAudit() {
    try {
      const channelsData = await getChannels();
      const channels = channelsData?.channels || [];
      const rows = [['Channel', 'Epoch', 'Sequence', 'Created At', 'Blob Size']];
      for (const ch of channels.slice(0, 10)) {
        const auditData = await getAuditEntries(ch.name, { limit: 100 });
        const entries = auditData?.entries || [];
        for (const entry of entries) {
          rows.push([
            ch.name,
            String(entry.epoch || ''),
            String(entry.sequence || ''),
            entry.created_at || '',
            String(entry.blob_size || ''),
          ]);
        }
      }
      const csv = rows.map((r) => r.join(',')).join('\n');
      downloadBlob(csv, 'skytale-audit.csv', 'text/csv');
      showToast('Audit log exported');
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  function handleDeleteAccount() {
    if (
      !window.confirm('Are you sure you want to delete your account? This action cannot be undone.')
    )
      return;
    showToast('Coming soon — account deletion is not yet available', 'info');
  }

  function handleRevokeAllKeys() {
    if (!window.confirm('Revoke all API keys? All existing integrations will stop working.'))
      return;
    showToast('Coming soon — bulk key revocation is not yet available', 'info');
  }

  if (loading) {
    return (
      <main className="page" id="main-content">
        <div className="loading">Loading settings...</div>
      </main>
    );
  }

  return (
    <main className="page settings-page" id="main-content">
      <h1 className="page-title">Settings</h1>
      <p className="page-subtitle">Manage account preferences, exports, and integrations.</p>

      {toast && (
        <div className={`settings-toast settings-toast-${toast.type}`}>{toast.message}</div>
      )}

      {error && <p className="error-msg">{error}</p>}

      {/* Notifications */}
      <div className="card settings-section">
        <h2 className="settings-section-title">Notifications</h2>
        <div className="settings-field">
          <label htmlFor="settings-webhook-url" className="settings-label">
            Default Webhook URL
          </label>
          <input
            id="settings-webhook-url"
            className="input"
            type="url"
            placeholder="https://example.com/webhook"
            value={settings.webhook_url}
            onChange={(e) => handleChange('webhook_url', e.target.value)}
          />
        </div>
        <div className="settings-field">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={settings.notify_quota}
              onChange={(e) => handleChange('notify_quota', e.target.checked)}
            />
            <span>Quota alerts</span>
          </label>
        </div>
        <div className="settings-field">
          <label className="settings-checkbox-label">
            <input
              type="checkbox"
              checked={settings.notify_security}
              onChange={(e) => handleChange('notify_security', e.target.checked)}
            />
            <span>Security events</span>
          </label>
        </div>
      </div>

      {/* API Defaults */}
      <div className="card settings-section">
        <h2 className="settings-section-title">API Defaults</h2>
        <div className="settings-field">
          <span className="settings-label">Rate Limit Tier</span>
          <div className="settings-readonly mono">{settings.rate_limit_tier}</div>
        </div>
        <div className="settings-field">
          <label htmlFor="settings-visibility" className="settings-label">
            Default Channel Visibility
          </label>
          <select
            id="settings-visibility"
            className="input"
            value={settings.default_visibility}
            onChange={(e) => handleChange('default_visibility', e.target.value)}
          >
            <option value="public">Public</option>
            <option value="organization">Organization</option>
            <option value="private">Private</option>
          </select>
        </div>
      </div>

      {/* Organization */}
      <div className="card settings-section">
        <h2 className="settings-section-title">Organization</h2>
        <div className="settings-field">
          <label htmlFor="settings-org-domain" className="settings-label">
            Org Domain
          </label>
          <input
            id="settings-org-domain"
            className="input"
            type="text"
            placeholder="example.com"
            value={settings.org_domain}
            onChange={(e) => handleChange('org_domain', e.target.value)}
          />
        </div>
        <div className="settings-field">
          <span className="settings-label">DID:web URI</span>
          <div className="settings-readonly mono">{settings.did_web || 'Not configured'}</div>
        </div>
      </div>

      {/* Save button */}
      <div className="settings-save-row">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Data Export */}
      <div className="card settings-section">
        <h2 className="settings-section-title">Data Export</h2>
        <p className="settings-section-desc">Download your data in standard formats.</p>
        <div className="settings-export-buttons">
          <button className="btn-ghost" onClick={handleExportUsage}>
            Export Usage (CSV)
          </button>
          <button className="btn-ghost" onClick={handleExportAgents}>
            Export Agents (JSON)
          </button>
          <button className="btn-ghost" onClick={handleExportAudit}>
            Export Audit (CSV)
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card settings-section settings-danger-zone">
        <h2 className="settings-section-title settings-danger-title">Danger Zone</h2>
        <p className="settings-section-desc">Irreversible actions. Proceed with extreme caution.</p>
        <div className="settings-danger-actions">
          <div className="settings-danger-item">
            <div>
              <strong>Delete Account</strong>
              <p className="settings-danger-desc">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <button className="btn-danger" onClick={handleDeleteAccount}>
              Delete Account
            </button>
          </div>
          <div className="settings-danger-item">
            <div>
              <strong>Revoke All Keys</strong>
              <p className="settings-danger-desc">
                Revoke every API key. All integrations will immediately lose access.
              </p>
            </div>
            <button className="btn-danger" onClick={handleRevokeAllKeys}>
              Revoke All Keys
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

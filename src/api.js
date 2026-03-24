// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

const BASE_URL = '/api/v1';

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401 && !options.skipAuthRedirect) {
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const body = await res.text();
    let message;
    try {
      const json = JSON.parse(body);
      message = json.error || json.message || `Request failed (${res.status})`;
    } catch {
      // Avoid displaying raw HTML error pages
      message = body && !body.startsWith('<')
        ? body
        : `Request failed (${res.status})`;
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function getUsage() {
  return request('/usage');
}

export async function getKeys() {
  return request('/keys');
}

export async function createKey(name) {
  return request('/keys', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export async function revokeKey(id) {
  return request(`/keys/${id}`, {
    method: 'DELETE',
  });
}

export async function getAccount({ skipAuthRedirect = false } = {}) {
  return request('/accounts/me', { skipAuthRedirect });
}

export async function createBillingPortal() {
  return request('/billing/portal', {
    method: 'POST',
  });
}

export async function getChannels() {
  return request('/channels');
}

export async function createInvite(channel, maxUses = 1, ttlSeconds = 3600) {
  return request('/channels/invites', {
    method: 'POST',
    body: JSON.stringify({ channel, max_uses: maxUses, ttl_seconds: ttlSeconds }),
  });
}

export async function createChannel(name) {
  return request('/channels', { method: 'POST', body: JSON.stringify({ name }) });
}

export async function getAgents() {
  return request('/agents');
}

export async function registerAgent(data) {
  return request('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteAgent(did) {
  return request(`/agents/${encodeURIComponent(did)}`, {
    method: 'DELETE',
  });
}

// --- Revocations ---

export async function createRevocation(data) {
  return request('/revocations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getRevocations() {
  return request('/revocations');
}

export async function checkRevocation(did) {
  return request(`/revocations/${encodeURIComponent(did)}`);
}

// --- Webhooks ---

export async function createWebhook(data) {
  return request('/webhooks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getWebhooks() {
  return request('/webhooks');
}

export async function deleteWebhook(id) {
  return request(`/webhooks/${id}`, {
    method: 'DELETE',
  });
}

// --- Audit ---

export async function getAuditEntries(channel, { limit = 50, offset = 0, epoch } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (epoch != null) params.set('epoch', epoch);
  return request(`/audit/${encodeURIComponent(channel)}/entries?${params}`);
}

// --- Federation ---

export async function createFederationInvite(data) {
  return request('/federation/invite', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getFederationDirectory({ capability, org, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (capability) params.set('capability', capability);
  if (org) params.set('org', org);
  return request(`/federation/directory?${params}`);
}

// --- Agents (additional) ---

export async function updateAgent(did, data) {
  return request(`/agents/${encodeURIComponent(did)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// --- Channels (additional) ---

export async function getPendingJoins(channel) {
  return request(`/channels/pending?channel=${encodeURIComponent(channel)}`);
}

export async function getChannel(id) {
  return request(`/channels/${id}`);
}

// --- Billing (additional) ---

export async function createCheckout(tier = 'pro') {
  return request('/billing/checkout', {
    method: 'POST',
    body: JSON.stringify({ tier }),
  });
}

export async function getBilling() {
  return request('/billing');
}

// --- Settings ---

export async function getSettings() {
  return request('/accounts/settings');
}

export async function updateSettings(settings) {
  return request('/accounts/settings', {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
}

// --- Activity ---

export async function getActivityLog({ limit = 50, offset = 0, filter } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (filter) params.set('filter', filter);
  return request(`/activity?${params}`);
}

// --- Teams ---

export async function getTeamMembers(orgId) {
  return request(`/teams/${orgId}/members`);
}

export async function inviteTeamMember(orgId, data) {
  return request(`/teams/${orgId}/invites`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateMemberRole(orgId, accountId, data) {
  return request(`/teams/${orgId}/members/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function removeMember(orgId, accountId) {
  return request(`/teams/${orgId}/members/${accountId}`, {
    method: 'DELETE',
  });
}

export async function getTeamInvites(orgId) {
  return request(`/teams/${orgId}/invites`);
}

export async function revokeTeamInvite(orgId, inviteId) {
  return request(`/teams/${orgId}/invites/${inviteId}`, {
    method: 'DELETE',
  });
}

export async function resendTeamInvite(orgId, inviteId) {
  return request(`/teams/${orgId}/invites/${inviteId}/resend`, {
    method: 'POST',
  });
}

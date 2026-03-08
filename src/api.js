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

  if (!res.ok) {
    const body = await res.text();
    let message;
    try {
      const json = JSON.parse(body);
      message = json.error || json.message || body;
    } catch {
      message = body || `Request failed (${res.status})`;
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

export async function getAccount() {
  return request('/accounts/me');
}

export async function createBillingPortal() {
  return request('/billing/portal', {
    method: 'POST',
  });
}

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './test/mocks/server.js';
import { getUsage, createKey, revokeKey } from './api.js';

const BASE = 'http://localhost:3000';

describe('API client', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // happy-dom needs a proper location so fetch can resolve relative URLs
    delete window.location;
    window.location = { ...originalLocation, href: `${BASE}/`, origin: BASE };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  it('getUsage() returns usage data', async () => {
    const data = await getUsage();
    expect(data).toEqual({
      plan_tier: 'free',
      messages_used: 450,
      message_limit: 1000,
      token_exchanges: 120,
      daily: [],
    });
  });

  it('createKey() sends POST and returns key data', async () => {
    const data = await createKey('test');
    expect(data.id).toBe('key_123');
    expect(data.name).toBe('test');
    expect(data.prefix).toBe('sk_live_abc');
    expect(data.key).toBe('sk_live_abc123full');
    expect(data.created_at).toBeTruthy();
  });

  it('revokeKey() sends DELETE and returns null for 204', async () => {
    const data = await revokeKey('123');
    expect(data).toBeNull();
  });

  it('401 response redirects to /login', async () => {
    server.use(http.get(`${BASE}/api/v1/usage`, () => new HttpResponse(null, { status: 401 })));

    await expect(getUsage()).rejects.toThrow('Session expired');
    expect(window.location.href).toBe('/login');
  });

  it('500 response throws with error message', async () => {
    server.use(
      http.get(`${BASE}/api/v1/usage`, () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    );

    await expect(getUsage()).rejects.toThrow('Internal server error');
  });

  it('error response with JSON body extracts error field', async () => {
    server.use(
      http.get(`${BASE}/api/v1/usage`, () =>
        HttpResponse.json({ error: 'Rate limit exceeded' }, { status: 429 }),
      ),
    );

    await expect(getUsage()).rejects.toThrow('Rate limit exceeded');
  });

  it('error response with message field extracts it', async () => {
    server.use(
      http.get(`${BASE}/api/v1/usage`, () =>
        HttpResponse.json({ message: 'Not found' }, { status: 404 }),
      ),
    );

    await expect(getUsage()).rejects.toThrow('Not found');
  });

  it('error response with plain text body uses it as message', async () => {
    server.use(
      http.get(
        `${BASE}/api/v1/usage`,
        () => new HttpResponse('Something went wrong', { status: 500 }),
      ),
    );

    await expect(getUsage()).rejects.toThrow('Something went wrong');
  });
});

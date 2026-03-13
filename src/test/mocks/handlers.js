import { http, HttpResponse } from 'msw';

const BASE = 'http://localhost:3000';

export const handlers = [
  http.get(`${BASE}/api/v1/usage`, () =>
    HttpResponse.json({
      plan_tier: 'free',
      messages_used: 450,
      message_limit: 1000,
      token_exchanges: 120,
      daily: [],
    }),
  ),
  http.get(`${BASE}/api/v1/keys`, () => HttpResponse.json({ keys: [] })),
  http.get(`${BASE}/api/v1/channels`, () => HttpResponse.json({ channels: [] })),
  http.get(`${BASE}/api/v1/agents`, () => HttpResponse.json({ agents: [] })),
  http.get(`${BASE}/api/v1/accounts/me`, () =>
    HttpResponse.json({ email: 'test@skytale.sh', plan_tier: 'free' }),
  ),
  http.post(`${BASE}/api/v1/keys`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      id: 'key_123',
      name: body.name,
      prefix: 'sk_live_abc',
      key: 'sk_live_abc123full',
      created_at: new Date().toISOString(),
    });
  }),
  http.delete(`${BASE}/api/v1/keys/:id`, () => new HttpResponse(null, { status: 204 })),
];

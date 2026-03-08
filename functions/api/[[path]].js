// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

const API_ORIGIN = 'https://api.skytale.sh';

export async function onRequest(context) {
  const { request, params } = context;
  const path = params.path.join('/');
  const url = new URL(request.url);

  const target = `${API_ORIGIN}/${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Host', 'api.skytale.sh');
  // Remove CF-specific headers that shouldn't be forwarded
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');

  const res = await fetch(target, {
    method: request.method,
    headers,
    body: request.method !== 'GET' && request.method !== 'HEAD'
      ? request.body
      : undefined,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(res.headers);
  // Remove CORS headers — same-origin requests don't need them
  responseHeaders.delete('access-control-allow-origin');
  responseHeaders.delete('access-control-allow-credentials');
  responseHeaders.delete('access-control-allow-methods');
  responseHeaders.delete('access-control-allow-headers');

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: responseHeaders,
  });
}

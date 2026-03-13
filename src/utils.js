// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

export function formatDate(iso) {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function timeAgo(iso) {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function truncateDid(did) {
  if (!did || did.length < 24) return did || '';
  return did.slice(0, 16) + '...' + did.slice(-4);
}

export function truncate(str, len = 24) {
  if (!str || str.length <= len) return str || '';
  return str.slice(0, len) + '...';
}

export function healthDotClass(lastMessageAt) {
  if (!lastMessageAt) return 'red';
  const mins = (Date.now() - new Date(lastMessageAt).getTime()) / 60000;
  if (mins < 5) return 'green';
  if (mins <= 60) return 'amber';
  return 'red';
}

export function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

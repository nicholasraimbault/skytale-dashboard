import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDate,
  timeAgo,
  truncateDid,
  truncate,
  healthDotClass,
  formatNumber,
} from './utils.js';

// --- formatDate ---

describe('formatDate', () => {
  it('returns "--" for null', () => {
    expect(formatDate(null)).toBe('--');
  });

  it('returns "--" for undefined', () => {
    expect(formatDate(undefined)).toBe('--');
  });

  it('returns "--" for empty string', () => {
    expect(formatDate('')).toBe('--');
  });

  it('formats a valid ISO date string', () => {
    const result = formatDate('2026-01-15T12:00:00Z');
    expect(result).toBe('Jan 15, 2026');
  });

  it('formats another valid date', () => {
    const result = formatDate('2025-12-25T12:00:00Z');
    expect(result).toBe('Dec 25, 2025');
  });
});

// --- timeAgo ---

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-13T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null for null input', () => {
    expect(timeAgo(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(timeAgo(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(timeAgo('')).toBeNull();
  });

  it('returns "just now" for less than 1 minute ago', () => {
    expect(timeAgo('2026-03-13T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago for 1-59 minutes', () => {
    expect(timeAgo('2026-03-13T11:55:00Z')).toBe('5m ago');
  });

  it('returns "1m ago" at exactly 1 minute', () => {
    expect(timeAgo('2026-03-13T11:59:00Z')).toBe('1m ago');
  });

  it('returns "59m ago" at 59 minutes', () => {
    expect(timeAgo('2026-03-13T11:01:00Z')).toBe('59m ago');
  });

  it('returns hours ago for 1-23 hours', () => {
    expect(timeAgo('2026-03-13T09:00:00Z')).toBe('3h ago');
  });

  it('returns "1h ago" at exactly 60 minutes', () => {
    expect(timeAgo('2026-03-13T11:00:00Z')).toBe('1h ago');
  });

  it('returns days ago for 1-6 days', () => {
    expect(timeAgo('2026-03-11T12:00:00Z')).toBe('2d ago');
  });

  it('returns "1d ago" at 24 hours', () => {
    expect(timeAgo('2026-03-12T12:00:00Z')).toBe('1d ago');
  });

  it('returns "6d ago" at 6 days', () => {
    expect(timeAgo('2026-03-07T12:00:00Z')).toBe('6d ago');
  });

  it('returns localized date for 7+ days', () => {
    const result = timeAgo('2026-03-01T12:00:00Z');
    // Should be a date string, not "Xd ago"
    expect(result).not.toContain('d ago');
    expect(result).toBeTruthy();
  });
});

// --- truncateDid ---

describe('truncateDid', () => {
  it('returns empty string for null', () => {
    expect(truncateDid(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncateDid(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(truncateDid('')).toBe('');
  });

  it('returns short DID unchanged (under 24 chars)', () => {
    expect(truncateDid('did:key:short')).toBe('did:key:short');
  });

  it('returns DID at exactly 23 chars unchanged', () => {
    const did = 'a'.repeat(23);
    expect(truncateDid(did)).toBe(did);
  });

  it('truncates DID at exactly 24 chars', () => {
    const did = 'a'.repeat(24);
    expect(truncateDid(did)).toBe('a'.repeat(16) + '...' + 'a'.repeat(4));
  });

  it('truncates a long DID with first 16 and last 4', () => {
    const did = 'did:key:z6MkqNJSEiVgztATfHBfE5n5GKBabN9iFQCGFPAYbrohpMhV';
    const result = truncateDid(did);
    expect(result).toBe(did.slice(0, 16) + '...' + did.slice(-4));
    expect(result.length).toBeLessThan(did.length);
  });

  it('truncates with correct prefix/suffix lengths', () => {
    const did = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const result = truncateDid(did);
    expect(result.startsWith('abcdefghijklmnop')).toBe(true); // first 16
    expect(result.endsWith('6789')).toBe(true); // last 4
    expect(result).toContain('...');
  });
});

// --- truncate ---

describe('truncate', () => {
  it('returns empty string for null', () => {
    expect(truncate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(truncate('')).toBe('');
  });

  it('returns short string unchanged', () => {
    expect(truncate('hello')).toBe('hello');
  });

  it('returns string at exactly default length (24) unchanged', () => {
    const str = 'a'.repeat(24);
    expect(truncate(str)).toBe(str);
  });

  it('truncates string longer than default length', () => {
    const str = 'a'.repeat(25);
    expect(truncate(str)).toBe('a'.repeat(24) + '...');
  });

  it('respects custom length parameter', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });

  it('returns string unchanged if equal to custom length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates at custom length', () => {
    expect(truncate('hello world', 3)).toBe('hel...');
  });
});

// --- healthDotClass ---

describe('healthDotClass', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-13T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "red" for null', () => {
    expect(healthDotClass(null)).toBe('red');
  });

  it('returns "red" for undefined', () => {
    expect(healthDotClass(undefined)).toBe('red');
  });

  it('returns "green" for less than 5 minutes ago', () => {
    expect(healthDotClass('2026-03-13T11:56:00Z')).toBe('green');
  });

  it('returns "green" for just now', () => {
    expect(healthDotClass('2026-03-13T12:00:00Z')).toBe('green');
  });

  it('returns "amber" at exactly 5 minutes', () => {
    expect(healthDotClass('2026-03-13T11:55:00Z')).toBe('amber');
  });

  it('returns "amber" for 30 minutes ago', () => {
    expect(healthDotClass('2026-03-13T11:30:00Z')).toBe('amber');
  });

  it('returns "amber" at exactly 60 minutes', () => {
    expect(healthDotClass('2026-03-13T11:00:00Z')).toBe('amber');
  });

  it('returns "red" for over 60 minutes ago', () => {
    expect(healthDotClass('2026-03-13T10:59:00Z')).toBe('red');
  });

  it('returns "red" for a date long ago', () => {
    expect(healthDotClass('2025-01-01T00:00:00Z')).toBe('red');
  });
});

// --- formatNumber ---

describe('formatNumber', () => {
  it('formats numbers under 1000 as plain strings', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('formats 1000 as "1.0K"', () => {
    expect(formatNumber(1000)).toBe('1.0K');
  });

  it('formats thousands with one decimal', () => {
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(10000)).toBe('10.0K');
    expect(formatNumber(999999)).toBe('1000.0K');
  });

  it('formats 1000000 as "1.0M"', () => {
    expect(formatNumber(1000000)).toBe('1.0M');
  });

  it('formats millions with one decimal', () => {
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(10000000)).toBe('10.0M');
  });
});

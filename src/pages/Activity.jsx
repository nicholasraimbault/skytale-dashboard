// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useCallback } from 'react';
import { getActivityLog } from '../api.js';
import { timeAgo } from '../utils.js';
import '../styles/activity.css';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'security', label: 'Security' },
  { key: 'channels', label: 'Channels' },
  { key: 'agents', label: 'Agents' },
  { key: 'billing', label: 'Billing' },
];

const CATEGORY_CONFIG = {
  security: { className: 'activity-icon-security', icon: '\u26A0' },
  channels: { className: 'activity-icon-channels', icon: '#' },
  agents: { className: 'activity-icon-agents', icon: '\u2713' },
  billing: { className: 'activity-icon-billing', icon: '$' },
};

function getCategory(event) {
  if (!event?.category) return 'agents';
  const cat = event.category.toLowerCase();
  if (cat in CATEGORY_CONFIG) return cat;
  return 'agents';
}

export default function Activity() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const LIMIT = 50;

  const fetchEvents = useCallback(async (filterValue, newOffset) => {
    const isInitial = newOffset === 0;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);
    try {
      const params = { limit: LIMIT, offset: newOffset };
      if (filterValue !== 'all') params.filter = filterValue;
      const data = await getActivityLog(params);
      const items = data?.events || [];
      if (isInitial) {
        setEvents(items);
      } else {
        setEvents((prev) => [...prev, ...items]);
      }
      setOffset(newOffset);
      setHasMore(items.length === LIMIT);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(filter, 0);
  }, [filter, fetchEvents]);

  function handleFilterChange(key) {
    setFilter(key);
    setOffset(0);
  }

  function handleLoadMore() {
    fetchEvents(filter, offset + LIMIT);
  }

  return (
    <main className="page activity-page" id="main-content">
      <h1 className="page-title">Activity</h1>
      <p className="page-subtitle">Chronological event stream across your account.</p>

      <div className="activity-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`activity-filter-chip ${filter === f.key ? 'active' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => handleFilterChange(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="error-msg">{error}</p>}

      {loading ? (
        <div className="loading">Loading activity...</div>
      ) : events.length === 0 ? (
        <div className="card activity-empty">
          <p>No activity yet. Events will appear here as you use Skytale.</p>
        </div>
      ) : (
        <div className="activity-timeline">
          {events.map((event, i) => {
            const category = getCategory(event);
            const config = CATEGORY_CONFIG[category];
            return (
              <div key={event.id || i} className="activity-event">
                <div className={`activity-event-icon ${config.className}`}>{config.icon}</div>
                <div className="activity-event-content">
                  <span className="activity-event-action">
                    {event.action || event.description || 'Event'}
                  </span>
                  {event.actor && <span className="activity-event-actor mono">{event.actor}</span>}
                  {event.resource && (
                    <span className="activity-event-resource mono">{event.resource}</span>
                  )}
                </div>
                <div className="activity-event-time">
                  {event.created_at ? timeAgo(event.created_at) : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div className="activity-load-more">
          <button className="btn-ghost" onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </main>
  );
}

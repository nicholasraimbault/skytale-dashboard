// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useRef, useCallback } from 'react';
import { getActivityLog } from '../api.js';
import { timeAgo } from '../utils.js';
import './NotificationCenter.css';

const STORAGE_KEY = 'skytale_notifications_read';
const POLL_INTERVAL = 60000;
const MAX_NOTIFICATIONS = 10;

function classifyEvent(entry) {
  const action = (entry.action || '').toLowerCase();
  const metadata = entry.metadata || {};

  if (action.includes('revocation')) {
    return { type: 'security', label: 'Security Alert' };
  }
  if (action.includes('quota')) {
    return { type: 'usage', label: 'Usage Alert' };
  }
  if (action.includes('key') && metadata.age_days > 90) {
    return { type: 'rotation', label: 'Key Rotation Reminder' };
  }
  if (action.includes('webhook.failed')) {
    return { type: 'failure', label: 'Delivery Failure' };
  }
  return null;
}

function getReadIds() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIdsState] = useState(getReadIds);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    let stale = false;

    async function fetchNotifications() {
      try {
        const log = await getActivityLog();
        if (stale) return;
        const entries = Array.isArray(log) ? log : log?.entries || [];
        const alerts = [];

        for (const entry of entries) {
          const classification = classifyEvent(entry);
          if (classification) {
            alerts.push({
              id: entry.id || entry.timestamp || crypto.randomUUID(),
              type: classification.type,
              label: classification.label,
              action: entry.action,
              timestamp: entry.timestamp || entry.created_at,
            });
          }
          if (alerts.length >= MAX_NOTIFICATIONS) break;
        }

        setNotifications(alerts);
      } catch {
        // Activity log may not be available yet; silently ignore
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => {
      stale = true;
      clearInterval(interval);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (open && containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const unreadCount = notifications.filter((n) => !readIds.includes(n.id)).length;

  const markRead = useCallback(
    (id) => {
      const next = [...new Set([...readIds, id])];
      setReadIdsState(next);
      setReadIds(next);
    },
    [readIds],
  );

  const markAllRead = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    const next = [...new Set([...readIds, ...allIds])];
    setReadIdsState(next);
    setReadIds(next);
  }, [notifications, readIds]);

  const typeColor = {
    security: 'var(--error)',
    usage: '#facc15',
    rotation: 'var(--accent)',
    failure: 'var(--error)',
  };

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        className="notification-bell"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <span className="notification-title">Notifications</span>
            {unreadCount > 0 && (
              <button className="notification-mark-all" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notification-empty">No notifications</div>
          ) : (
            <div className="notification-list">
              {notifications.map((n) => {
                const isRead = readIds.includes(n.id);
                return (
                  <button
                    key={n.id}
                    className={`notification-item${isRead ? ' read' : ''}`}
                    onClick={() => markRead(n.id)}
                  >
                    <span
                      className="notification-icon"
                      style={{ background: typeColor[n.type] || 'var(--text-dim)' }}
                    />
                    <div className="notification-content">
                      <span className="notification-label">{n.label}</span>
                      <span className="notification-action">{n.action}</span>
                    </div>
                    <span className="notification-time">{timeAgo(n.timestamp)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

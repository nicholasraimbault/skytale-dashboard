// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useRef } from 'react';
import changelogData from '../data/changelog.json';
import './Changelog.css';

const STORAGE_KEY = 'skytale_changelog_seen';

function getLastSeen() {
  try {
    return localStorage.getItem(STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function Changelog() {
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState(getLastSeen);
  const modalRef = useRef(null);

  const hasUnseen = changelogData.length > 0 && (!lastSeen || changelogData[0].date > lastSeen);

  function handleOpen() {
    setOpen(true);
    if (changelogData.length > 0) {
      const latestDate = changelogData[0].date;
      localStorage.setItem(STORAGE_KEY, latestDate);
      setLastSeen(latestDate);
    }
  }

  // Focus trap + keyboard handling for modal
  useEffect(() => {
    if (!open) return;
    const modal = modalRef.current;
    if (!modal) return;
    const previouslyFocused = document.activeElement;
    const focusable = modal.querySelectorAll(
      'button, a[href], input, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (first) first.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
    };
  }, [open]);

  return (
    <>
      <button className="changelog-trigger" onClick={handleOpen} aria-label="What's new">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4 5.6 21.2 8 14 2 9.2h7.6z" />
        </svg>
        {hasUnseen && <span className="changelog-dot" aria-hidden="true" />}
      </button>

      {open && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="changelog-overlay"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            className="changelog-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="What's new"
          >
            <div className="changelog-modal-header">
              <h2 className="changelog-modal-title">What's New</h2>
              <button className="changelog-close" onClick={() => setOpen(false)} aria-label="Close">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="changelog-entries">
              {changelogData.map((entry) => (
                <div key={entry.date} className="changelog-entry">
                  <span className="changelog-date">{formatDate(entry.date)}</span>
                  <h3 className="changelog-entry-title">{entry.title}</h3>
                  <p className="changelog-entry-desc">{entry.description}</p>
                  {entry.link && (
                    <a
                      href={entry.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="changelog-entry-link"
                    >
                      Learn more &rarr;
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import './CommandPalette.css';

const ACTIONS = [
  { name: 'Overview', path: '/', section: 'Navigate' },
  { name: 'Security', path: '/security', section: 'Navigate' },
  { name: 'Channels', path: '/channels', section: 'Navigate' },
  { name: 'Agents', path: '/agents', section: 'Navigate' },
  { name: 'API Keys', path: '/keys', section: 'Navigate' },
  { name: 'Account', path: '/account', section: 'Navigate' },
  { name: 'Federation', path: '/federation', section: 'Navigate' },
  { name: 'Pricing', path: '/pricing', section: 'Navigate' },
  { name: 'Revoke agent', path: '/security', section: 'Actions' },
  { name: 'Create webhook', path: '/security', section: 'Actions' },
  { name: 'Register agent', path: '/agents', section: 'Actions' },
  { name: 'Create API key', path: '/keys', section: 'Actions' },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const filtered = ACTIONS.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  // Group filtered results by section, preserving order
  const sections = [];
  const seen = new Set();
  for (const item of filtered) {
    if (!seen.has(item.section)) {
      seen.add(item.section);
      sections.push({ label: item.section, items: [] });
    }
    sections.find((s) => s.label === item.section).items.push(item);
  }

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keyboard shortcut to open palette
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when palette opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Small delay to ensure the portal is mounted before focusing
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const selectItem = useCallback(
    (item) => {
      close();
      navigate(item.path);
    },
    [close, navigate],
  );

  // Keyboard navigation within the palette
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        close();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1 < filtered.length ? i + 1 : 0));
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 >= 0 ? i - 1 : filtered.length - 1));
        return;
      }

      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        selectItem(filtered[selectedIndex]);
      }
    },
    [close, filtered, selectedIndex, selectItem],
  );

  if (!open) return null;

  // Track a flat index across sections for highlighting
  let flatIndex = 0;

  return createPortal(
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="cmd-palette-backdrop" onClick={close}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="cmd-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        <label htmlFor="command-palette-search" className="visually-hidden">
          Search actions
        </label>
        <input
          id="command-palette-search"
          ref={inputRef}
          className="cmd-palette-input"
          type="text"
          placeholder="Search actions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="cmd-palette-results">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="cmd-palette-section">{section.label}</div>
              {section.items.map((item) => {
                const idx = flatIndex++;
                return (
                  <div
                    key={`${item.section}-${item.name}`}
                    className={`cmd-palette-item${idx === selectedIndex ? ' selected' : ''}`}
                    role="option"
                    aria-selected={idx === selectedIndex}
                    tabIndex={-1}
                    onClick={() => selectItem(item)}
                    onKeyDown={(e) => e.key === 'Enter' && selectItem(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    {item.name}
                  </div>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="cmd-palette-item" style={{ color: 'var(--text-dim)' }}>
              No results
            </div>
          )}
        </div>
        <div className="cmd-palette-hint">
          <span>
            <kbd className="cmd-palette-kbd">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="cmd-palette-kbd">↵</kbd> select
          </span>
          <span>
            <kbd className="cmd-palette-kbd">esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

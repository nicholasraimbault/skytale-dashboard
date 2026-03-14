// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { NavLink, useNavigate } from 'react-router';
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import StatusBar from './StatusBar.jsx';
import NotificationCenter from './NotificationCenter.jsx';
import Changelog from './Changelog.jsx';
import '../styles/nav.css';

function solveBezier(x1, y1, x2, y2, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let t = x;
  for (let i = 0; i < 8; i++) {
    const cx = 3 * (1 - t) * (1 - t) * t * x1 + 3 * (1 - t) * t * t * x2 + t * t * t;
    const dx = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    t -= (cx - x) / dx;
    t = Math.max(0, Math.min(1, t));
  }
  return 3 * (1 - t) * (1 - t) * t * y1 + 3 * (1 - t) * t * t * y2 + t * t * t;
}

function easeOut(x) {
  return solveBezier(0.25, 0.1, 0.25, 1, x);
}

function snapFlat(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return 1 - Math.pow(2, -10 * x);
}

const OPEN_DURATION = 290;
const CLOSE_DURATION = 290;
const STEPS = 35;
const MIN_SCALE = 0.01;

export default function Nav({ onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('skytale_sidebar_collapsed') === 'true',
  );
  const navigate = useNavigate();

  // --- Mobile menu refs ---
  const navRef = useRef(null);
  const glassRef = useRef(null);
  const dropdownRef = useRef(null);
  const contentRef = useRef(null);

  const animsRef = useRef([]);
  const scaleRef = useRef(MIN_SCALE);
  const startRef = useRef(MIN_SCALE);
  const targetRef = useRef(MIN_SCALE);
  const easeFnRef = useRef(easeOut);
  const dropHRef = useRef(0);

  // --- Sidebar panel refs ---
  const sidebarPanelRef = useRef(null);
  const sidebarContentRef = useRef(null);

  const sbAnimsRef = useRef([]);
  const sbScaleRef = useRef(collapsed ? MIN_SCALE : 1);
  const sbStartRef = useRef(collapsed ? MIN_SCALE : 1);
  const sbTargetRef = useRef(collapsed ? MIN_SCALE : 1);
  const sbEaseFnRef = useRef(easeOut);

  // --- Mobile menu toggle (scaleY — unchanged) ---
  const toggle = useCallback(() => {
    const glass = glassRef.current;
    const dropdown = dropdownRef.current;
    const content = contentRef.current;
    if (!glass || !dropdown || !content) return;

    if (!dropHRef.current) dropHRef.current = dropdown.offsetHeight;

    const opening = !isOpen;

    if (animsRef.current.length && animsRef.current[0].playState === 'running') {
      const dur = targetRef.current > startRef.current ? OPEN_DURATION : CLOSE_DURATION;
      const t = Math.min(1, Math.max(0, animsRef.current[0].currentTime / dur));
      let s = startRef.current + (targetRef.current - startRef.current) * easeFnRef.current(t);
      scaleRef.current = Math.max(MIN_SCALE, Math.min(1, s));
    }

    const cs = getComputedStyle(glass);
    const glassFrom = {
      height: cs.height,
      background: cs.backgroundColor,
      borderRadius: cs.borderRadius,
    };

    animsRef.current.forEach((a) => a.cancel());

    startRef.current = scaleRef.current;
    targetRef.current = opening ? 1 : MIN_SCALE;
    easeFnRef.current = opening ? easeOut : snapFlat;

    const dropH = dropHRef.current;
    const dKf = [];
    const cKf = [];
    const gKf = [];

    for (let i = 0; i <= STEPS; i++) {
      const p = i / STEPS;
      let s = startRef.current + (targetRef.current - startRef.current) * easeFnRef.current(p);
      s = Math.max(MIN_SCALE, Math.min(1, s));
      dKf.push({ transform: `scaleY(${s})`, offset: p });
      cKf.push({ transform: `scaleY(${1 / s})`, offset: p });

      const t2 = (s - MIN_SCALE) / (1 - MIN_SCALE);
      gKf.push({
        height: `${64 + dropH * t2}px`,
        background: `rgba(${Math.round(10 + 12 * t2)},${Math.round(10 + 12 * t2)},${Math.round(11 + 14 * t2)},${(0.72 + 0.06 * t2).toFixed(2)})`,
        borderRadius: `0px 0px ${(38 * t2).toFixed(1)}px ${(38 * t2).toFixed(1)}px`,
        offset: p,
      });
    }

    gKf[0] = { ...glassFrom, offset: 0 };

    const dur = opening ? OPEN_DURATION : CLOSE_DURATION;

    animsRef.current = [
      dropdown.animate(dKf, { duration: dur, easing: 'linear', fill: 'both' }),
      content.animate(cKf, { duration: dur, easing: 'linear', fill: 'both' }),
      glass.animate(gKf, { duration: dur, easing: 'linear', fill: 'both' }),
    ];

    animsRef.current[0].onfinish = () => {
      scaleRef.current = targetRef.current;
    };

    setIsOpen(opening);
  }, [isOpen]);

  // --- Sidebar panel toggle (scaleX — mirrors mobile menu) ---
  function toggleSidebar() {
    const panel = sidebarPanelRef.current;
    const content = sidebarContentRef.current;
    if (!panel || !content) return;

    const expanding = collapsed;

    // Compute current scale if mid-animation
    if (sbAnimsRef.current.length && sbAnimsRef.current[0].playState === 'running') {
      const dur = sbTargetRef.current > sbStartRef.current ? OPEN_DURATION : CLOSE_DURATION;
      const t = Math.min(1, Math.max(0, sbAnimsRef.current[0].currentTime / dur));
      let s =
        sbStartRef.current + (sbTargetRef.current - sbStartRef.current) * sbEaseFnRef.current(t);
      sbScaleRef.current = Math.max(MIN_SCALE, Math.min(1, s));
    }

    sbAnimsRef.current.forEach((a) => a.cancel());

    sbStartRef.current = sbScaleRef.current;
    sbTargetRef.current = expanding ? 1 : MIN_SCALE;
    sbEaseFnRef.current = expanding ? easeOut : snapFlat;

    const pKf = [];
    const cKf = [];

    for (let i = 0; i <= STEPS; i++) {
      const p = i / STEPS;
      let s =
        sbStartRef.current + (sbTargetRef.current - sbStartRef.current) * sbEaseFnRef.current(p);
      s = Math.max(MIN_SCALE, Math.min(1, s));
      pKf.push({ transform: `scaleX(${s})`, offset: p });
      cKf.push({ transform: `scaleX(${1 / s})`, offset: p });
    }

    const dur = expanding ? OPEN_DURATION : CLOSE_DURATION;

    sbAnimsRef.current = [
      panel.animate(pKf, { duration: dur, easing: 'linear', fill: 'both' }),
      content.animate(cKf, { duration: dur, easing: 'linear', fill: 'both' }),
    ];

    sbAnimsRef.current[0].onfinish = () => {
      sbScaleRef.current = sbTargetRef.current;
    };

    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('skytale_sidebar_collapsed', String(next));
  }

  // Close mobile menu on navigation
  const closeMenu = useCallback(() => {
    if (isOpen) toggle();
  }, [isOpen, toggle]);

  function handleLogout() {
    if (isOpen) toggle();
    onLogout();
    navigate('/login');
  }

  // Sync sidebar collapsed state to body class (before paint to avoid flash)
  useLayoutEffect(() => {
    document.body.classList.toggle('sidebar-collapsed', collapsed);
  }, [collapsed]);

  // Cleanup animations on unmount
  useEffect(() => {
    return () => {
      animsRef.current.forEach((a) => a.cancel());
      sbAnimsRef.current.forEach((a) => a.cancel());
    };
  }, []);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="nav-sidebar" aria-label="Main navigation">
        {/* Rail: always visible — icons + brand */}
        <div className="nav-sidebar-rail">
          <div className="nav-sidebar-rail-brand">.</div>

          {/* Trust */}
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Overview"
          >
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
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
          </NavLink>
          <NavLink
            to="/security"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Security"
          >
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
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </NavLink>
          <NavLink
            to="/compliance"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Compliance"
          >
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
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
            </svg>
          </NavLink>

          <div className="nav-rail-sep" />

          {/* Manage */}
          <NavLink
            to="/channels"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Channels"
          >
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
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </NavLink>
          <NavLink
            to="/agents"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Agents"
          >
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
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <rect x="9" y="9" width="6" height="6" />
              <line x1="9" y1="1" x2="9" y2="4" />
              <line x1="15" y1="1" x2="15" y2="4" />
              <line x1="9" y1="20" x2="9" y2="23" />
              <line x1="15" y1="20" x2="15" y2="23" />
              <line x1="20" y1="9" x2="23" y2="9" />
              <line x1="20" y1="14" x2="23" y2="14" />
              <line x1="1" y1="9" x2="4" y2="9" />
              <line x1="1" y1="14" x2="4" y2="14" />
            </svg>
          </NavLink>
          <NavLink
            to="/federation"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Federation"
          >
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
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
          </NavLink>

          <div className="nav-rail-sep" />

          {/* Develop */}
          <NavLink
            to="/keys"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="API Keys"
          >
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
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
          </NavLink>
          <NavLink
            to="/playground"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Playground"
          >
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
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </NavLink>

          <div className="nav-rail-sep" />

          {/* Account */}
          <NavLink
            to="/activity"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Activity"
          >
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
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Settings"
          >
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
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </NavLink>
          <NavLink
            to="/account"
            className={({ isActive }) => `nav-rail-icon ${isActive ? 'active' : ''}`}
            title="Account"
          >
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
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </NavLink>

          <button
            className="nav-sidebar-expand"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
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
              <path d="M13 17l5-5-5-5" />
              <path d="M6 17l5-5-5-5" />
            </svg>
          </button>
        </div>

        {/* Panel: expandable overlay with glass blur + rounded corners */}
        <div
          className="nav-sidebar-panel"
          ref={sidebarPanelRef}
          style={{ transform: collapsed ? `scaleX(${MIN_SCALE})` : 'scaleX(1)' }}
        >
          <div className="nav-sidebar-panel-glass"></div>
          <div
            className="nav-sidebar-panel-content"
            ref={sidebarContentRef}
            style={{
              transform: collapsed ? `scaleX(${1 / MIN_SCALE})` : 'scaleX(1)',
            }}
          >
            <div className="nav-sidebar-panel-nav">
              <div className="nav-sidebar-header">
                <div className="nav-sidebar-brand">
                  <strong>sky</strong>tale
                  <strong>
                    <span>.</span>
                  </strong>
                </div>
                <div className="nav-sidebar-actions">
                  <Changelog />
                  <NotificationCenter />
                  <button
                    className="nav-collapse-btn"
                    onClick={toggleSidebar}
                    aria-label="Collapse sidebar"
                  >
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
                      <path d="M11 17l-5-5 5-5" />
                      <path d="M18 17l-5-5 5-5" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="nav-section">
                <div className="nav-section-label">Trust</div>
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Overview
                </NavLink>
                <NavLink
                  to="/security"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Security
                </NavLink>
                <NavLink
                  to="/compliance"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Compliance
                </NavLink>
              </div>

              <div className="nav-section">
                <div className="nav-section-label">Manage</div>
                <NavLink
                  to="/channels"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Channels
                </NavLink>
                <NavLink
                  to="/agents"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Agents
                </NavLink>
                <NavLink
                  to="/federation"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Federation
                </NavLink>
              </div>

              <div className="nav-section">
                <div className="nav-section-label">Develop</div>
                <NavLink
                  to="/keys"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  API Keys
                </NavLink>
                <NavLink
                  to="/playground"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Playground
                </NavLink>
              </div>

              <div className="nav-section">
                <div className="nav-section-label">Account</div>
                <NavLink
                  to="/activity"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Activity
                </NavLink>
                <NavLink
                  to="/settings"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Settings
                </NavLink>
                <NavLink
                  to="/team"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Team
                </NavLink>
                <NavLink
                  to="/pricing"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Pricing
                </NavLink>
                <NavLink
                  to="/account"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  Account
                </NavLink>
                <button className="nav-sidebar-logout" onClick={handleLogout}>
                  Log out
                </button>
              </div>

              <StatusBar />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top nav (hamburger + dropdown — untouched animation system) */}
      <nav ref={navRef} className={`nav-mobile-bar ${isOpen ? 'open' : ''}`}>
        <div className="nav-glass" ref={glassRef}></div>
        <div className="nav-inner">
          <div className="nav-brand">
            <strong>sky</strong>tale
            <strong>
              <span>.</span>
            </strong>
          </div>

          <button
            className="nav-hamburger"
            onClick={toggle}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>

        <div className="nav-dropdown" ref={dropdownRef} aria-hidden={!isOpen}>
          <div className="nav-dropdown-content" ref={contentRef}>
            <div className="nav-links nav-mobile">
              <div className="nav-mobile-section-label">Trust</div>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Overview
              </NavLink>
              <NavLink
                to="/security"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Security
              </NavLink>
              <NavLink
                to="/compliance"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Compliance
              </NavLink>

              <div className="nav-mobile-section-label">Manage</div>
              <NavLink
                to="/channels"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Channels
              </NavLink>
              <NavLink
                to="/agents"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Agents
              </NavLink>
              <NavLink
                to="/federation"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Federation
              </NavLink>

              <div className="nav-mobile-section-label">Develop</div>
              <NavLink
                to="/keys"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                API Keys
              </NavLink>
              <NavLink
                to="/playground"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Playground
              </NavLink>

              <div className="nav-mobile-section-label">Account</div>
              <NavLink
                to="/activity"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Activity
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Settings
              </NavLink>
              <NavLink
                to="/team"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Team
              </NavLink>
              <NavLink
                to="/pricing"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Pricing
              </NavLink>
              <NavLink
                to="/account"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                onClick={closeMenu}
              >
                Account
              </NavLink>
              <button className="nav-logout" onClick={handleLogout}>
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

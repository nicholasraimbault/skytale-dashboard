// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { NavLink, useNavigate } from 'react-router';
import { useState, useRef, useCallback, useEffect } from 'react';
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

function easeOut(x) { return solveBezier(0.25, 0.1, 0.25, 1, x); }

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
  const navigate = useNavigate();

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

  const toggle = useCallback(() => {
    const glass = glassRef.current;
    const dropdown = dropdownRef.current;
    const content = contentRef.current;
    if (!glass || !dropdown || !content) return;

    if (!dropHRef.current) dropHRef.current = dropdown.offsetHeight;

    const opening = !isOpen;

    // Compute current scale if mid-animation
    if (animsRef.current.length && animsRef.current[0].playState === 'running') {
      const dur = targetRef.current > startRef.current ? OPEN_DURATION : CLOSE_DURATION;
      const t = Math.min(1, Math.max(0, animsRef.current[0].currentTime / dur));
      let s = startRef.current + (targetRef.current - startRef.current) * easeFnRef.current(t);
      scaleRef.current = Math.max(MIN_SCALE, Math.min(1, s));
    }

    // Capture glass state before cancelling
    const cs = getComputedStyle(glass);
    const glassFrom = {
      height: cs.height,
      background: cs.backgroundColor,
      borderRadius: cs.borderRadius,
    };

    animsRef.current.forEach(a => a.cancel());

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

    animsRef.current[0].onfinish = () => { scaleRef.current = targetRef.current; };

    setIsOpen(opening);
  }, [isOpen]);

  // Close menu on navigation
  const closeMenu = useCallback(() => {
    if (isOpen) toggle();
  }, [isOpen, toggle]);

  function handleLogout() {
    if (isOpen) toggle();
    onLogout();
    navigate('/login');
  }

  // Cleanup animations on unmount
  useEffect(() => {
    return () => animsRef.current.forEach(a => a.cancel());
  }, []);

  return (
    <nav ref={navRef} className={isOpen ? 'open' : ''}>
      <div className="nav-glass" ref={glassRef}></div>
      <div className="nav-inner">
        <div className="nav-brand">
          skytale<span>.</span>
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

        <div className="nav-links nav-desktop">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Overview
          </NavLink>
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
            to="/keys"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            API Keys
          </NavLink>
          <NavLink
            to="/account"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            Account
          </NavLink>
          <button className="nav-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </div>

      <div className="nav-dropdown" ref={dropdownRef} aria-hidden={!isOpen}>
        <div className="nav-dropdown-content" ref={contentRef}>
          <div className="nav-links nav-mobile">
            <NavLink
              to="/"
              end
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              Overview
            </NavLink>
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
              to="/keys"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={closeMenu}
            >
              API Keys
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
  );
}

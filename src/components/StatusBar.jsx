// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { useState, useEffect } from 'react';
import './StatusBar.css';

export default function StatusBar() {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    function checkHealth() {
      fetch('/api/health')
        .then((res) => setStatus(res.ok ? 'operational' : 'degraded'))
        .catch(() => setStatus('degraded'));
    }
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <a
      href="https://status.skytale.sh"
      target="_blank"
      rel="noopener noreferrer"
      className="status-bar"
    >
      <span
        className={`status-dot${status === 'operational' ? ' green' : status === 'degraded' ? ' red' : ''}`}
        role="status"
        aria-label={`System status: ${status === 'checking' ? 'Checking' : status === 'operational' ? 'Operational' : 'Degraded'}`}
      />
      <span className="status-text">
        {status === 'checking'
          ? 'Checking...'
          : status === 'operational'
            ? 'Operational'
            : 'Degraded'}
      </span>
    </a>
  );
}

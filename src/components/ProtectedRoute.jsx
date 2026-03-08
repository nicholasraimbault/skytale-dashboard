// Copyright 2026 Skytale. Licensed under the Business Source License 1.1.
// See LICENSE for details.

import { Navigate } from 'react-router';

export default function ProtectedRoute({ authed, children }) {
  if (!authed) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

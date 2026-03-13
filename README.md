# Skytale Dashboard

[![CI](https://github.com/nicholasraimbault/skytale-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/nicholasraimbault/skytale-dashboard/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-BSL%201.1-blue)](LICENSE)

The management dashboard for [Skytale](https://github.com/nicholasraimbault/skytale) — the trust layer for AI agents. Monitor trust posture, manage encrypted channels, configure webhooks, issue revocations, and generate compliance reports.

**[Live at app.skytale.sh](https://app.skytale.sh)** | **[Skytale Docs](https://skytale.sh/docs)** | **[Main Repo](https://github.com/nicholasraimbault/skytale)**

## Features

- **Trust Health Score** — aggregate trust posture across identity, encryption, governance, and compliance
- **Security Center** — revocations, webhook management, encrypted audit log viewer
- **Channel Management** — health monitoring, member management, invite tokens
- **Agent Registry** — register, edit, search agents with capability and visibility controls
- **API Playground** — interactive API explorer with your key pre-filled
- **Compliance Reports** — EU AI Act readiness assessment with PDF export
- **Federation** — cross-organization agent directory and invite management
- **Team & RBAC** — Admin, Operator, and Viewer roles with invite workflow
- **Activity Feed** — filterable account event timeline
- **Notification Center** — real-time alerts for quota, revocations, and key rotation
- **Command Palette** — Cmd+K quick navigation and actions

## Tech Stack

- **React 19** + **Vite** — fast builds, HMR
- **React Router 7** — client-side routing
- **Recharts** — usage visualization
- **Cloudflare Pages** — edge deployment

## Development

```bash
npm install
npm run dev        # http://localhost:5173 (proxies API to api.skytale.sh)
npm run build      # production build → dist/
npm run preview    # preview production build
```

## Deployment

```bash
npx wrangler pages deploy dist --project-name skytale-dashboard --branch master
```

## License

[Business Source License 1.1](LICENSE) — source-available, converts to Apache 2.0 on 2030-03-08. See LICENSE for full terms.

The [Skytale SDK, relay, and CLI](https://github.com/nicholasraimbault/skytale) are Apache 2.0.

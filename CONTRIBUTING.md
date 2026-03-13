# Contributing to Skytale Dashboard

Thanks for your interest in contributing! This project is licensed under [BSL 1.1](LICENSE) — you can read, modify, and contribute, but you cannot host it as a competing commercial service.

## Getting Started

```bash
git clone https://github.com/nicholasraimbault/skytale-dashboard.git
cd skytale-dashboard
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and proxies API requests to `api.skytale.sh`. You need a Skytale account to use the dashboard — [sign up here](https://app.skytale.sh/login).

## Development

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run lint          # ESLint
npm run format:check  # Prettier check
npm run format        # Prettier fix
```

## Pull Requests

1. Fork the repo and create a branch from `master`
2. Make your changes
3. Ensure `npm run build`, `npm run lint`, and `npm run format:check` all pass
4. Open a PR with a clear description

## Reporting Bugs

Use [GitHub Issues](https://github.com/nicholasraimbault/skytale-dashboard/issues) with the bug report template.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities. **Do not open public issues for security bugs.**

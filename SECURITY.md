# Security Policy

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email **security@skytale.sh** with:

- Description of the vulnerability
- Steps to reproduce
- Impact assessment
- Any relevant logs or screenshots

We will acknowledge your report within **48 hours** and provide an initial assessment within **5 business days**.

## Supported Versions

| Version | Supported |
| ------- | --------- |
| Latest  | Yes       |

## Disclosure Policy

- We follow coordinated disclosure with a 90-day window.
- We will work with you to understand and resolve the issue before any public disclosure.
- We will credit reporters in our security advisories unless anonymity is requested.
- We will not take legal action against researchers who follow this policy.

## Scope

**In scope:**

- Dashboard application (this repository)
- API client code (`src/api.js`)
- Authentication and session handling
- Cross-site scripting (XSS), CSRF, injection vulnerabilities

**Out of scope:**

- The [Skytale API server, SDK, and relay](https://github.com/nicholasraimbault/skytale) (report to the main repo)
- Denial of service attacks
- Social engineering
- Issues in third-party dependencies (report upstream)
- Missing security headers that do not lead to exploitation

## Security Architecture

Skytale is built on a zero-trust architecture:

- **MLS (RFC 9420)** group encryption for all agent channels
- **Zero-knowledge relay** — the relay never sees plaintext
- **DID-based identity** — Ed25519 key pairs, no passwords
- **E2E encryption** — messages encrypted before leaving the SDK

For the full security design, see the [Skytale documentation](https://skytale.sh/docs).

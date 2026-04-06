# Security Policy

## Supported Versions

| Version | Supported           |
| ------- | ------------------- |
| 0.5.x   | Yes                 |
| 0.4.x   | Security fixes only |
| < 0.4   | No                  |

## Reporting a Vulnerability

**Preferred**: Use [GitHub Security Advisories](https://github.com/pitimon/cc-lens/security/advisories/new) to report vulnerabilities privately.

**Alternative**: Email security concerns to the repository owner via GitHub profile.

### Response Timeline

| Stage               | Timeline                          |
| ------------------- | --------------------------------- |
| Acknowledge receipt | Within 48 hours                   |
| Initial assessment  | Within 7 days                     |
| Fix released        | Within 30 days (critical: 7 days) |

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Scope

cc-lens is a **localhost-only** dashboard that reads Claude Code session data from `~/.claude/`. The security model relies on:

1. **TCP binding** to `127.0.0.1` (primary boundary)
2. **Middleware** two-layer Host header check (defense-in-depth)
3. **Input validation** on all API parameters (isValidSlug, path traversal guards)

### In Scope

- Path traversal in API routes or readers (slug, session ID, file paths)
- XSS via session data rendered in the dashboard
- Cache corruption or poisoning
- Information disclosure beyond `~/.claude/` directory
- Bypass of localhost-only restriction
- Denial of service via malformed JSONL input

### Out of Scope

- Physical access to the machine (localhost tool assumes trusted local user)
- Social engineering
- Issues requiring non-default `CC_LENS_HOST` configuration (user explicitly opted in)
- Vulnerabilities in upstream dependencies with no cc-lens-specific exploit path

## Credit

Responsible reporters will be credited in the release notes unless they prefer to remain anonymous.

## Security Architecture

For a detailed threat model covering attack surfaces, trust boundaries, and mitigations, see [docs/threat-model.md](docs/threat-model.md).

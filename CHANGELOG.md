# CodeDrop v2 Changelog

1. Syntax highlighting: Added highlight.js rendering with the atom-one-dark CDN theme and language badges.
2. Snippet expiry: Added TTL options, burn-after-read behavior, expiry metadata, and countdown display.
3. Password protection: Added bcrypt-hashed passwords, protected snippet responses, and an unlock endpoint.
4. Statistics dashboard: Added Redis-backed cache metrics, aggregate stats API, charts, cards, and most-viewed table.
5. Snippet forking: Added fork metadata, fork API, fork button, and original-snippet badge.
6. Raw and download endpoints: Added plain-text raw responses and language-aware downloadable files.
7. Search snippets: Added uncached title/code search with optional language filtering and a React results page.
8. CI/CD upgrades: Added security scanning, SBOM generation, linting, staging deploys, production environment gates, and Slack notifications.
9. Health monitoring: Added detailed database, Redis, uptime, timestamp, and memory health reporting.
10. Rate limiting: Added Redis-backed limits for snippet creation, reads, and password unlock attempts.

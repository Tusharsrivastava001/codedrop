# CodeDrop

![CI](https://github.com/your-org/codedrop/actions/workflows/ci.yml/badge.svg)
![Docker Image Size](https://img.shields.io/docker/image-size/your-org/codedrop-api/latest)
![Node](https://img.shields.io/badge/node-%3E%3D18-10B981)
![License](https://img.shields.io/badge/license-MIT-6366F1)

CodeDrop is a production-ready full-stack code snippet sharing app with a React frontend, Express API, PostgreSQL storage, Redis caching, Prometheus metrics, Grafana dashboards, and an Nginx gateway.

## Demo

![CodeDrop demo placeholder](https://placehold.co/900x460/0A0E1A/F8FAFC.gif?text=CodeDrop+Demo)

## Features

- ⚡ Instant snippet sharing with Ctrl+Enter submit
- 🔐 Password-protected snippets with bcryptjs hashing
- 🔥 Burn-after-read snippets
- ⏱ Expiry controls for never, 1 hour, 24 hours, and 7 days
- 🎨 Dark glassmorphism UI with responsive layouts
- 🧠 Real-time syntax detection suggestions
- 🌈 highlight.js syntax highlighting
- 📋 Copy, raw view, download, QR code, WhatsApp, and Twitter/X sharing
- 🔎 Recent snippets search, filters, sorting, previews, and pagination
- 📊 API stats and Prometheus metrics
- 🛡 Helmet, rate limiting, request validation, Trivy, TruffleHog, and npm audit

## Architecture

```text
Browser -> Nginx -> React frontend
              |
              +-> Express API -> PostgreSQL
                           |
                           +-> Redis
                           |
                           +-> /metrics -> Prometheus -> Grafana
```

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router, highlight.js, qrcode.js |
| API | Node.js, Express 4, nanoid, bcryptjs, Helmet, Morgan |
| Database | PostgreSQL 15 |
| Cache | Redis 7 with append-only persistence |
| Gateway | Nginx with gzip, cache headers, and rate limiting |
| Monitoring | prom-client, Prometheus, Grafana |
| CI/CD | GitHub Actions, GHCR, Trivy, TruffleHog, Slack notifications |

## Quick Start

```bash
git clone <your-repository-url>
cd codedrop
cp .env.example .env
docker compose up --build
```

Open `http://localhost:8500`.

## Monitoring

Start the optional monitoring profile:

```bash
docker compose --profile monitoring up -d
```

Prometheus runs at `http://localhost:9090` and scrapes the API `/metrics` endpoint. Grafana runs at `http://localhost:3000` with a preconfigured Prometheus datasource. The default local credentials are `admin` / `codedrop_admin` unless overridden with `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD`.

## DB Tools

Start pgAdmin only when needed:

```bash
docker compose --profile tools up -d pgadmin
```

pgAdmin runs at `http://localhost:5050`.

## Security

The API uses Helmet for secure headers, Morgan for request logs, strict payload limits, validation for snippet input, bcryptjs password hashing with 10 rounds, and a 30 requests per 15 minutes per IP create-snippet rate limit. Nginx adds security headers, gzip, request throttling, larger body handling, and immutable cache headers for static assets. The security workflow runs npm audit, Trivy image scanning, and TruffleHog secret scanning.

## API Reference

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | None | API, PostgreSQL, Redis, uptime, and memory health |
| GET | `/metrics` | None | Prometheus default Node metrics plus CodeDrop counters |
| GET | `/api/stats` | None | Total snippets, total views, and most popular language |
| POST | `/api/snippets` | None | Create a snippet with title, language, code, expiry, password, and burn settings |
| GET | `/api/snippets/recent` | None | List recent non-expired, non-burned snippets |
| GET | `/api/snippets/search?q=&language=&sort=&page=` | None | Search snippets with filters, sorting, and pagination |
| GET | `/api/snippets/:id` | Password prompt if locked | Fetch snippet, handle expiry and burn, increment views |
| POST | `/api/snippets/:id/verify` | Password body | Verify password and return snippet data when valid |
| GET | `/api/snippets/:id/raw` | Header/query password if locked | Return plain text code |
| GET | `/api/snippets/:id/download` | Header/query password if locked | Download snippet as a language-specific file |
| POST | `/api/snippets/:id/fork` | None | Create a copy of a snippet |
| DELETE | `/api/snippets/:id` | None | Delete a snippet and invalidate caches |

## Run Tests

```bash
cd api
npm test
```

## Development

```bash
cd api
npm install
npm run lint
npm test

cd ../frontend
npm install
npm run build
```

## CI/CD

`.github/workflows/ci.yml` runs lint before tests, builds and pushes API/frontend images to GHCR, updates a deployment badge, deploys to the protected `production` environment, and sends a Slack message through `SLACK_WEBHOOK_URL`.

`.github/workflows/security.yml` runs on pushes to `main` and every Sunday at 03:00 UTC. It performs dependency audit, API image CVE scanning, and secret scanning.

## Folder Structure

```text
codedrop/
├── api/
│   ├── src/
│   ├── tests/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── monitoring/
│   ├── prometheus.yml
│   └── grafana/provisioning/datasources/prometheus.yml
├── nginx/nginx.conf
├── .github/workflows/
├── docker-compose.yml
└── README.md
```

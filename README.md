# CodeDrop

CodeDrop is a containerized full-stack code snippet sharing app with a React frontend, Express API, PostgreSQL storage, Redis caching, and an Nginx gateway.

## Architecture

```text
                         +----------------+
                         |    Browser     |
                         +--------+-------+
                                  |
                                  v
                         +----------------+
                         | nginx gateway  |
                         |  :80 public    |
                         +---+--------+---+
                             |        |
                    /api/*   |        | /
                             v        v
                      +------+--+  +--+----------+
                      |  api    |  |  frontend   |
                      | :4000   |  | nginx :80   |
                      +---+--+--+  +-------------+
                          |  |
                          |  +----------------+
                          v                   v
                  +---------------+    +--------------+
                  | PostgreSQL 15 |    | Redis 7      |
                  | snippets DB   |    | cache        |
                  +---------------+    +--------------+
```

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, React Router v6 |
| API | Node.js, Express 4, nanoid |
| Database | PostgreSQL 15, pg |
| Cache | Redis 7, redis v4 |
| Gateway | Nginx |
| Tests | Jest, Supertest |
| Containers | Docker, Docker Compose |
| CI/CD | GitHub Actions, GHCR, SSH deploy |

## Quick Start

```bash
git clone <your-repository-url>
cd codedrop
cp .env.example .env
docker compose up --build
```

Open `http://localhost`.

## Run Tests

```bash
cd api
npm test
```

The Jest suite mocks PostgreSQL and Redis, so tests run without external services.

## API Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/health` | Service health check |
| POST | `/api/snippets` | Create a snippet |
| GET | `/api/snippets/recent` | List the 10 most recent snippets |
| GET | `/api/snippets/:id` | Fetch a snippet and increment views |
| DELETE | `/api/snippets/:id` | Delete a snippet and invalidate cache |

Single snippet cache keys use `snippet:{id}`. The recent list uses `snippets:recent`. Both use a 10 minute TTL.

## CI/CD Pipeline

The workflow in `.github/workflows/ci.yml` runs on pushes and pull requests to `main`, nightly at 2am UTC, and manual dispatch.

1. `test` runs API tests on Node.js 18 and 20 with npm dependency caching. Node 20 uploads coverage as an artifact.
2. `build-and-push` runs only on pushes to `main`. It logs in to GHCR, sets up Buildx, and builds/pushes API and frontend images tagged with `latest` and the commit SHA.
3. `deploy` runs only after images are pushed from `main`. It SSHes into the server, pulls images, starts Compose, removes orphans, and prunes unused images.

## GitHub Secrets

| Secret | Purpose |
| --- | --- |
| `SERVER_HOST` | Hostname or IP address of the deployment server |
| `SERVER_USER` | SSH username used for deployment |
| `SERVER_SSH_KEY` | Private SSH key with access to the deployment server |

## Folder Structure

```text
codedrop/
├── api/
│   ├── src/
│   │   ├── app.js
│   │   ├── index.js
│   │   ├── routes/
│   │   │   └── snippets.js
│   │   └── db/
│   │       ├── index.js
│   │       └── redis.js
│   ├── tests/
│   │   └── snippets.test.js
│   ├── Dockerfile
│   ├── package-lock.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── main.jsx
│   │   ├── api.js
│   │   └── pages/
│   │       ├── Home.jsx
│   │       ├── ViewSnippet.jsx
│   │       └── Recent.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── nginx.conf
│   ├── Dockerfile
│   ├── package-lock.json
│   └── package.json
├── nginx/
│   └── nginx.conf
├── .github/
│   └── workflows/
│       └── ci.yml
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

## Interview Talking Points

- The API separates `app.js` from `index.js`, making Supertest easy without binding a real port.
- PostgreSQL is the source of truth and initializes the `snippets` table at API startup.
- Redis is used as a read-through cache for individual snippets and recent snippets, with invalidation on create, view count changes, and delete.
- Docker Compose keeps internal services private; only the gateway exposes port 80.
- Health checks ensure the API starts only after PostgreSQL and Redis are ready.
- The Dockerfiles use multi-stage builds to keep runtime images smaller and cleaner.
- The CI pipeline tests on two Node versions, publishes versioned images, and deploys with a repeatable Compose command.

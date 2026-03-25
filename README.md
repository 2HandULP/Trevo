# Trevo

A second-hand marketplace where buyers discover unique items and shop owners manage their storefronts — featuring virtual try-on powered by AI.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 8, Tailwind CSS |
| Backend | Spring Boot 4, Java 21, Maven |
| Database | PostgreSQL 16 |
| Containers | Docker Compose |
| Image Storage | Cloudinary |
| Payments | Stripe, PayPal, MB WAY |

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Git | >= 2.40 | `git --version` |
| Docker Desktop | >= 4.25 | Includes Docker Compose v2 |
| JDK | 21 LTS | `sdk install java 21-tem` or [Adoptium](https://adoptium.net) |
| Node.js | 20 LTS | `nvm install 20` |
| Maven | >= 3.9 | Or use `./mvnw` (included) |

**OS notes:**
- **macOS:** Install Xcode CLI tools (`xcode-select --install`). Docker Desktop >= 4 GB RAM.
- **Windows:** WSL 2 backend recommended for Docker performance. If using WSL, clone inside the WSL filesystem for faster builds.
- **Linux:** Install Docker Engine + Compose plugin. Add user to `docker` group.

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/2HandULP/Trevo.git
cd Trevo

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your credentials (defaults work for local dev)

# 3. Start all services
docker compose up

# 4. Verify everything is running
#    Frontend:  http://localhost:5173
#    Backend:   http://localhost:8080/api/health
#    Database:  localhost:5432
```

## Development (without Docker yet)

### Backend

```bash
cd trevo-api
./mvnw spring-boot:run
```

The API starts on `http://localhost:8080`.

### Frontend

```bash
cd trevo-web
npm install
npm run dev
```

The dev server starts on `http://localhost:5173` with hot reload.

## Running Tests

```bash
# Backend tests
cd trevo-api
./mvnw test

# Frontend tests
cd trevo-web
npm test
```

## Project Structure

```
Trevo/
├── trevo-api/          # Spring Boot backend
│   ├── src/main/       # Application code
│   ├── src/test/       # Tests
│   └── pom.xml         # Maven config
├── trevo-web/          # React frontend
│   ├── src/            # Components, pages, hooks
│   ├── public/         # Static assets
│   └── package.json    # npm config
├── docs/               # Project documentation
│   ├── developmentplan.md
│   ├── requirements.md
│   └── system-architecture.md
├── docker-compose.yml  # Dev environment (3 services)
├── .env.example        # Environment variable template
└── .gitignore
```

## Team

| Name | Role |
|------|------|
| Miguel | Project Manager |
| Sergio | Fullstack Developer |
| Rafael | Frontend Developer |
| Mo | Backend Developer |
| Hugo | Backend Developer |
| Martim | Database Engineer |

## Branch Strategy

- `main` — stable, protected
- `feature/<task-id>` — individual work (e.g., `feature/AUTH-B01`)
- PRs require 1 approval before merge

# Nutri Monorepo

A full-stack nutrition tracking application with AI-powered meal analysis.

## Architecture

```
nutri/
├── apps/
│   ├── backend/          # NestJS API server
│   └── frontend/         # Next.js 15 web app (TODO: migrate)
│
├── packages/
│   └── shared/           # Shared types, DTOs, utilities
│
├── docker/
│   └── docker-compose.yml  # PostgreSQL + MinIO
│
└── prisma/               # Database schema (legacy location)
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose

### 1. Install Dependencies

```bash
npm install -g pnpm
pnpm install
```

### 2. Start Infrastructure

```bash
pnpm docker:up
```

This starts:
- **PostgreSQL** on port 5432
- **MinIO** (S3-compatible storage) on ports 9000 (API) and 9001 (Console)

### 3. Setup Database

```bash
cd apps/backend
cp .env.example .env.local
pnpm db:generate
pnpm db:push
```

### 4. Run Development Servers

```bash
# Run both frontend and backend
pnpm dev

# Or run individually
pnpm dev:backend   # NestJS on http://localhost:4000
pnpm dev:frontend  # Next.js on http://localhost:3000
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/demo` - Create demo session
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/refresh` - Refresh access token

### Bootstrap
- `GET /api/bootstrap` - Get all core app data in one request

### Account
- `DELETE /api/account/delete` - Delete user account

## Environment Variables

See `apps/backend/.env.example` for all required environment variables.

## Tech Stack

- **Backend**: NestJS, Prisma, PostgreSQL, JWT
- **Frontend**: Next.js 15, React 19, TailwindCSS
- **AI**: Google Gemini 3 Flash
- **Storage**: MinIO (S3-compatible)
- **Monorepo**: pnpm workspaces + Turborepo

# Foodly Monorepo Migration Plan

## Overview
Migrate from single Next.js app to production-grade monorepo with NestJS backend.

## Current State
- Single Next.js app with embedded API routes
- Email/Password + Google OAuth
- Local SQLite/PostgreSQL
- Local image storage

## Target State
- Monorepo with separate frontend/backend
- NestJS backend (all business logic)
- Next.js frontend (UI only)
- PostgreSQL (self-hosted)
- MinIO (images)
- Google OAuth only

---

## Phase 1: Create Monorepo Structure ⏳

### Tasks:
- [ ] Create `apps/` directory
- [ ] Create `apps/frontend/` (move existing Next.js)
- [ ] Create `apps/backend/` (new NestJS)
- [ ] Create `packages/shared/` (shared types)
- [ ] Create `infra/` (Docker configs)
- [ ] Create root `package.json` with workspaces
- [ ] Set up pnpm/npm workspaces

### Structure:
```
foodly/
├── apps/
│   ├── frontend/        # Existing Next.js code
│   └── backend/         # New NestJS
├── packages/
│   └── shared/          # Shared DTOs, types
├── infra/
│   ├── docker/
│   ├── docker-compose.yml
│   └── nginx/
├── prisma/              # Shared Prisma schema
└── package.json         # Workspace root
```

---

## Phase 2: NestJS Backend Setup ⏳

### Tasks:
- [ ] Initialize NestJS project
- [ ] Set up Prisma module
- [ ] Set up config/environment handling
- [ ] Set up Google OAuth (Passport)
- [ ] Create JWT strategy
- [ ] Set up CORS

### Modules to Create:
- AuthModule (Google OAuth + JWT)
- UserModule
- MealModule
- WeightModule
- CalendarModule
- CoachModule
- HealthModule
- ProgressModule
- UploadModule (MinIO)

---

## Phase 3: Migrate API Routes ⏳

### Move these endpoints to NestJS:

| Next.js Route | NestJS Controller |
|---------------|-------------------|
| /api/auth/* | AuthController |
| /api/profile | UserController |
| /api/meals/* | MealController |
| /api/weight/* | WeightController |
| /api/calendar/* | CalendarController |
| /api/coach/* | CoachController |
| /api/health/* | HealthController |
| /api/progress | ProgressController |
| /api/momentum | ProgressController |
| /api/bootstrap | BootstrapController |
| /api/today/* | TodayController |
| /api/trends/* | TrendsController |
| /api/insights | InsightsController |
| /api/habits/* | HabitsController |

---

## Phase 4: Update Frontend ⏳

### Tasks:
- [ ] Create API client service
- [ ] Update all fetch calls to use backend URL
- [ ] Add auth token handling
- [ ] Remove all `/api/*` routes from Next.js
- [ ] Update NextAuth to backend auth

---

## Phase 5: Google OAuth Only ⏳

### Tasks:
- [ ] Remove email/password auth pages
- [ ] Remove forgot-password flow
- [ ] Update sign-in page (Google button only)
- [ ] Remove registration with email
- [ ] Update NextAuth config

---

## Phase 6: Docker Infrastructure ⏳

### Tasks:
- [ ] Create frontend Dockerfile
- [ ] Create backend Dockerfile
- [ ] Create docker-compose.yml
- [ ] Add PostgreSQL service
- [ ] Add MinIO service
- [ ] Add Nginx reverse proxy
- [ ] Create .env.example

---

## Phase 7: Data Migration ⏳

### Tasks:
- [ ] Create migration script
- [ ] Migrate users
- [ ] Migrate meals
- [ ] Migrate images to MinIO
- [ ] Validate data integrity

---

## File Preservation Strategy

### These files will be MOVED (not deleted):
- `src/app/*` → `apps/frontend/src/app/*`
- `src/components/*` → `apps/frontend/src/components/*`
- `src/hooks/*` → `apps/frontend/src/hooks/*`
- `src/lib/*` → `apps/frontend/src/lib/*`
- `prisma/*` → `prisma/*` (root level shared)

### These files will be CONVERTED to NestJS:
- `src/app/api/*` → Logic moves to `apps/backend/src/modules/*`

### Nothing will be deleted!

---

## Execution Order

1. **Phase 1**: Create monorepo structure (30 min)
2. **Phase 2**: NestJS skeleton (45 min)
3. **Phase 5**: Google OAuth only in frontend (20 min)
4. **Phase 3**: Migrate 2-3 key API routes (1 hr)
5. **Phase 4**: Update frontend for those routes (30 min)
6. **Phase 6**: Docker setup (30 min)
7. Iterate on remaining routes

---

## Status: STARTING PHASE 1

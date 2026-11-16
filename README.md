# OBI CRM — Sales, in a good place

A full-stack mini CRM for thoughtful sales teams, built with **NestJS, Next.js, PostgreSQL, Prisma, JWT, and Socket.IO**. The UI uses a warm, friendly MIUI-inspired visual language: calm surfaces, compact cards, rounded controls, and a quiet coral accent.

## What is included

- Email/password registration and login with bcrypt password hashes and JWT bearer authentication.
- Three roles: `ADMIN`, `SALES_MANAGER`, and `SALES_REP`, with API-side team/owner boundaries.
- Lead CRUD, case-insensitive search, status filter, sorting, pagination, and unique lowercased email addresses.
- Deal pipeline across prospecting, proposal, negotiation, won, and lost, with an atomic stage-history entry for each change.
- Follow-up tasks with owner assignment, priority, due date, status, and upcoming/overdue views.
- Dashboard metrics, lead status breakdown, recent leads, and upcoming tasks.
- Persisted notifications, delivered to a per-user Socket.IO room for lead assignment and deal stage changes.
- Swagger API docs, a demo data seed, PostgreSQL Docker Compose, and access-rule tests.

## Frontend shared components

The shared workspace chrome lives in `apps/web/components/layout` (`AppShell`, `Sidebar`, and `Topbar`). Reusable tables live in `components/ui`, and the root-level `GlobalFeedbackProvider` in `components/providers` makes `useGlobalFeedback()` available across routes for alerts and confirmation dialogs. Pages should use these shared components instead of creating page-specific versions.

## Requirements

- Node.js 20.9 or newer (Node 22 LTS recommended)
- npm 10 or newer
- Docker Desktop / Docker Compose, or an existing PostgreSQL 14+ database

## Start locally

From the repository root:

```bash
cp .env.example .env
# Change JWT_SECRET to a private, long random value before using non-demo data.
docker compose up -d postgres
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

- Web app: [http://localhost:3000](http://localhost:3000)
- REST API: [http://localhost:4000/api](http://localhost:4000/api)
- Swagger: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
- Socket.IO namespace: `ws://localhost:4000/notifications`

Stop PostgreSQL with `docker compose down`; keep its named volume to preserve data. Remove the volume only when intentionally resetting the local database: `docker compose down -v`.

### Environment

| Variable | Purpose | Local default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma | `postgresql://postgres:postgres@localhost:5432/miui_crm?schema=public` |
| `JWT_SECRET` | Secret used to sign/verify JWTs; use a random value of at least 32 characters | Change before use |
| `JWT_EXPIRES_IN` | Access-token lifetime | `1d` |
| `API_PORT` | NestJS API listen port | `4000` |
| `WEB_ORIGIN` | Allowed browser CORS origin | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | API root used by the browser | `http://localhost:4000/api` |

Do not commit `.env` or real secrets. Registration intentionally creates only `SALES_REP` accounts; grant administrative roles through a trusted database/admin process, not a client-supplied registration field.

## Demo sign-in

| Role | Email | Password |
|---|---|---|
| Admin | `admin@miuicrm.dev` | `DemoPass123!` |
| Sales manager | `manager@miuicrm.dev` | `DemoPass123!` |
| Sales rep | `rep@miuicrm.dev` | `DemoPass123!` |

These credentials are for local demonstration only. Never deploy the seeded users or this password to a real environment.

## API overview

All business endpoints are under `/api`. `Authorization: Bearer <accessToken>` is required unless explicitly stated.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/auth/register` | Register a SALES_REP account |
| `POST` | `/auth/login` | Log in and receive an access token |
| `GET` | `/dashboard/overview` | Role-scoped overview and counts |
| `GET, POST` | `/leads` | List/filter/page leads and create one |
| `GET, PATCH, DELETE` | `/leads/:id` | Read, update, and delete an authorized lead |
| `GET, POST` | `/deals` | List deals and create a deal |
| `PATCH, DELETE` | `/deals/:id` | Change a deal (stage changes are recorded) or delete it |
| `GET, POST` | `/tasks` | List follow-ups or create one linked to a lead/deal |
| `PATCH, DELETE` | `/tasks/:id` | Update or delete an authorized task |
| `GET` | `/users/assignable` | List assignable users (ADMIN/SALES_MANAGER only) |
| `GET` | `/notifications` | Read the current user’s persisted notifications |
| `PATCH` | `/notifications/:id/read` | Mark the current user’s notification as read |

Lead list query parameters include `search`, `status`, `assignedToId`, `page`, `limit` (maximum 100), `sortBy` (`createdAt`, `updatedAt`, `name`, `email`, `status`) and `sortOrder` (`asc` or `desc`). Tasks accept `upcoming=true` or `overdue=true`. Use Swagger for request DTO details and interactive testing.

## Role and ownership rules

| Action | ADMIN | SALES_MANAGER | SALES_REP |
|---|---|---|---|
| Register self | Creates a SALES_REP account | Creates a SALES_REP account | Creates a SALES_REP account |
| View leads | All leads | All leads | Leads assigned to them |
| Create/assign a lead | Create and assign to any existing user | Create and assign to any existing user | Create for self |
| Update/delete leads | Any lead | Any lead | Own assigned leads |
| View deals | All deals | All deals | Deals they own |
| Create deal | Any owner; linked lead must be qualified and visible | Any owner; linked lead must be qualified and visible | Self-owned only; linked lead must be qualified and assigned to them |
| Update/delete deals | Any deal | Any deal | Own deals |
| View tasks | All tasks | All tasks | Tasks assigned to them |
| Create/assign tasks | Any assignee; linked record must be visible | Any assignee; linked record must be visible | Self-assigned only; linked record must be visible |
| Update/delete tasks | Any task | Any task | Tasks assigned to them |
| View notifications | Own only | Own only | Own only |

Authorization is checked in API services as well as the UI. A representative’s lead/deal/task lists are scoped in database queries; object endpoints check ownership before exposing or mutating records. Managers and admins are team-wide for sales records. Any authenticated role can delete only records allowed by the row rules above.

## Data model notes

- PostgreSQL enums constrain roles, lead statuses, deal stages, priorities, and task statuses.
- Lead emails are normalized to lowercase in the service and unique in the database. This provides case-insensitive duplicate prevention for application-created records.
- Money uses `Decimal(14,2)` rather than floating-point values.
- Deal stage updates and their history inserts run in one database transaction.
- `DealStageHistory` is append-only through the API; the initial stage is recorded on deal creation.
- Notifications are stored before delivery and scoped by recipient. WebSocket clients present a JWT during handshake and join only `user:<id>`; the backend resolves the account before room membership.
- Tasks require exactly one linked lead or deal; the database has a check constraint in addition to request validation.
- Lead, deal, and task writes use version tokens for optimistic concurrency. Send the version returned by reads when updating; stale writes receive HTTP 409.
- Deals record `wonAt` when they enter the WON stage, and the dashboard's quarter metric uses that timestamp rather than the record's general update time.

## Tests and useful commands

```bash
npm test                  # role/ownership unit tests
npm run build              # production builds for API and web
npm run db:studio          # inspect local records
```

Tests cover shared ownership rules and selected service-level cases for scoped record responses, stale-version rejection, foreign-key validation, and task linking. For manual end-to-end checks, use both the manager and rep demo accounts: confirm the manager can see the team while the rep sees only their assigned leads and owned deals; create a qualified-lead deal and move its stage; verify stage history in Prisma Studio; create a linked follow-up; log in as the assigned user and check that a persisted lead-assignment notification appears both in the notification panel and as a live toast. Reconnect/refresh to confirm persistence.

## Assignment walkthrough

1. Log in as `manager@miuicrm.dev` and review the dashboard and whole-team scope.
2. Add a lead, choose an existing record in Prisma Studio with status `QUALIFIED` (or update one via Swagger), then create a linked deal.
3. Move the deal between stages using its stage selector; inspect `DealStageHistory` to see the audit trail.
4. Add a task linked to the lead or deal; update its status and use the upcoming/overdue filters.
5. Create/assign a lead to the sales rep using Swagger (`POST /api/leads`, `assignedToId` set to the rep ID). Log in as the rep to see the persisted notification and restricted list.
6. Inspect `/api/docs` for interactive endpoint exploration.

## Known scope and limitations

This is an assignment-sized application, not a production deployment template. It intentionally avoids a separate identity service, refresh-token rotation, email verification/reset, audit framework, multi-tenancy, and a general-purpose workflow engine. JWTs are held in browser local storage for demo simplicity (production apps should prefer secure, HTTP-only cookies and a threat model for XSS/CSRF). Some UI controls, such as the displayed date-range selector and summary quick-add, are visual conveniences; dashboard totals are current totals rather than historical time-series aggregates. Notifications cover lead assignment and deal stage changes. Add endpoint-level integration tests, rate limits, stronger operational logging, real user management screens, and proper deployment secrets before a production rollout.

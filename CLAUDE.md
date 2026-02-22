# Expense Tracker PWA

## Architecture
- **Monorepo** with npm workspaces: `client/`, `server/`, `shared/`
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Fastify + TypeScript + Prisma ORM + PostgreSQL
- **Auth**: Clerk (works without key in dev mode with mock user)
- **AI**: Claude API (Anthropic) for receipt scanning via vision
- **Deployment**: Vercel (client) + Railway (server + DB)

## Commands
- `npm run dev` — Start both client (port 5173) and server (port 3001)
- `npm run dev:client` — Client only
- `npm run dev:server` — Server only
- `npm run db:push` — Push Prisma schema to database
- `npm run db:migrate` — Run Prisma migrations
- `npm run db:seed` — Seed default categories and tax categories
- `npm run db:studio` — Open Prisma Studio

## Key Patterns
- **Server state**: TanStack React Query with custom hooks in `client/src/hooks/`
- **UI state**: Zustand store in `client/src/stores/uiStore.ts`
- **API client**: Axios with Clerk token interceptor in `client/src/services/api.ts`
- **Routing**: React Router v7 with Layout component using `<Outlet />`
- **Components**: shadcn/ui components in `client/src/components/ui/`
- **Server routes**: Fastify plugins registered in `server/src/app.ts`
- **Auth**: Fastify plugin verifies Clerk JWT, falls back to dev user if no key

## Database
- PostgreSQL via Prisma ORM
- Schema: `server/prisma/schema.prisma`
- Main models: User, Project, Expense, Receipt, Deposit, Category, TaxCategory, Tag, MileageEntry, Budget
- All records scoped by `userId` for multi-tenancy

## AI Receipt Processing
- Claude Sonnet for vision-based receipt parsing
- Extracts: vendor, amount, date, line items, tax, tip, payment method
- Auto-categorizes using user's category list
- Duplicate detection via SHA-256 fingerprint

## Build Log

### Phase 1: Foundation (Feb 18, 2026)
- Monorepo structure with npm workspaces (`client/`, `server/`, `shared/`)
- Fastify server with Prisma ORM, PostgreSQL schema, migrations, seed data
- Clerk auth (client + server) with dev mode fallback (mock `dev_user`)
- Vite + React + Tailwind + shadcn/ui setup
- Layout component (sidebar + mobile bottom nav)
- Project CRUD (API + UI)
- Expense CRUD with manual entry, pagination, filtering, search
- Deposit CRUD with project association
- Receipt upload (multipart) + camera capture (`getUserMedia`)
- Claude AI vision integration for receipt processing (PDF + image)
- Receipt review/edit/accept flow with confidence scores + duplicate detection

### Phase 2-5: Features (Feb 18-19, 2026)
- **Dashboard Charts**: Recharts pie chart (category breakdown), bar chart (daily spending), line chart (12-month trend)
- **CSV Export**: Server endpoint with csv-stringify, client download button
- **PDF Export**: Server endpoint with pdfkit, formatted A4 reports
- **Tag System**: Tag CRUD in settings, tag selection on expenses, tag filter on expense list
- **Reimbursement Workflow**: Interactive status dropdown, amount/date fields, status filter
- **Bulk Operations**: Multi-select checkboxes, bulk delete, bulk categorize toolbar
- **Mileage Tracking**: Full CRUD routes, IRS $0.70/mile rate, summary cards, trip form/list
- **Budget Tracking**: CRUD routes, budget status (actual vs budget), progress bars on dashboard (green/yellow/red)
- **PDF Viewer**: Clean iframe-based PDF preview on receipt review (no toolbar/sidebar)
- **Receipt Management**: Dedicated receipt review page, batch drag-and-drop upload, receipt deletion
- **Default Categories**: 10 seeded categories (Renovations, Furnishings, Maintenance, etc.)
- **Database Inspector**: Prisma Studio available via `cd server && npx prisma studio`

### Phase 6: Polish & Deploy (not started)
- Vercel deployment (frontend) + Railway deployment (backend + PostgreSQL)
- S3-compatible storage setup
- Recurring expense rules + cron
- Performance optimization (lazy loading, code splitting)
- CSV/Excel data import
- Mobile device testing (camera, install, offline)

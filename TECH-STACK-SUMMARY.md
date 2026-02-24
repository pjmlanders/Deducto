# Deducto — Tech Stack & Code Summary (Beginner-Friendly)

This document explains the **full technology stack** and **how the code is written** for Deducto, including **receipt storage**, **AI receipt analysis**, and **user login and security**. It’s written for someone new to coding or to this codebase.

---

## 1. What Is Deducto?

Deducto is a **web app** (and PWA) for tracking **expenses**, **mileage**, and **income** — especially for **tax write-offs** (e.g. short-term rental or LLC). You can:

- Add expenses manually or by **uploading/capturing receipts**
- Have **AI (Claude)** read receipts and fill in vendor, amount, date, etc.
- Track **mileage**, **deposits**, **budgets**, and **reports**
- Log in with **Clerk** (email/social) so your data is **private to you**

---

## 2. Big Picture: Client and Server

The app is split into two main parts:

| Part | What it does | Where it runs |
|------|----------------|---------------|
| **Client (frontend)** | The screens you see: buttons, forms, charts, receipt upload. Runs in the **browser**. | Your computer (browser) or phone; in production, files are served by **Vercel**. |
| **Server (backend)** | Handles **login**, **saving data**, **storing receipt files**, and **calling the AI**. Never runs in the browser. | Your computer during development; in production, on **Railway**. |

- The **client** never stores passwords or receipt files permanently. It sends requests to the **server**.
- The **server** talks to the **database** (PostgreSQL) and the **file system** (or later, cloud storage) for receipts. It also calls **Claude** for AI receipt reading.

So: **browser → server → database / files / AI**. The server is the only place that touches sensitive data and files.

---

## 3. Tech Stack (What Technologies Are Used)

### 3.1 Frontend (what you see in the browser)

- **React 19** — Library for building the UI (pages, components, state).
- **Vite** — Build tool: compiles TypeScript and React, serves the app in development, and produces the production bundle.
- **TypeScript** — JavaScript with types so the code is safer and easier to understand.
- **Tailwind CSS** — Utility classes for styling (colors, spacing, layout) without writing separate CSS files.
- **shadcn/ui** — Set of React components (buttons, cards, dialogs, etc.) that look good and are accessible.
- **React Router v7** — Handles which “page” (route) is shown (e.g. `/` = Dashboard, `/expenses` = expense list).
- **TanStack React Query** — Fetches data from the server, caches it, and keeps the UI in sync (e.g. list of expenses, projects).
- **Zustand** — Lightweight store for **UI state** (e.g. sidebar open/closed) that doesn’t need to live on the server.
- **Axios** — Sends HTTP requests (GET, POST, etc.) from the browser to the server. All API calls go through one Axios instance that adds the **login token** to every request.
- **Clerk (React)** — Handles **sign-in / sign-up** in the UI. Shows login screen when you’re not logged in; when you are, it gives the app a **token** to send to the server so the server knows who you are.
- **Vercel Analytics** — `@vercel/analytics` with an `<Analytics />` component in the app; sends page views and visitor data to Vercel. View reports in the Vercel project dashboard under **Analytics**.

### 3.2 Backend (server)

- **Fastify** — Web framework for Node.js. Defines **routes** (e.g. `GET /api/v1/expenses`, `POST /api/v1/receipts/upload`) and runs the logic for each request.
- **TypeScript** — Same as on the frontend; the server code is also typed.
- **Prisma** — **ORM** (Object–Relational Mapper): you define **models** (e.g. User, Expense, Receipt) in a schema file, and Prisma talks to the database for you (create, read, update, delete). No raw SQL in app code.
- **PostgreSQL** — **Database**: stores users, projects, expenses, receipts metadata, mileage, etc. All stored in tables; Prisma reads/writes them.
- **Clerk (Backend)** — Verifies the **JWT** (JSON Web Token) the client sends. If the token is valid, the server knows `userId` and uses it so **every query is scoped to that user** (you never see another user’s data).
- **Anthropic SDK** — Calls **Claude** (AI) to analyze receipt images/PDFs and return structured data (vendor, amount, date, etc.).
- **Sharp** — Image library: resizes/converts images (e.g. HEIC → JPEG) for storage and preview.
- **Multipart (Fastify)** — Handles **file uploads** (the receipt image/PDF sent from the browser).

### 3.3 Database and file storage

- **PostgreSQL** — All **structured data**: users, expenses, receipts metadata (file path, status, AI result), mileage, categories, etc. **No receipt file content** is stored in the database; only paths and metadata.
- **Receipt files** — Stored on the **server’s disk** (or, in the future, something like S3). Path is saved in the `Receipt` table (e.g. `uploads/receipts/<userId>/<uuid>.jpg`). Files are **per-user** (one folder per user).

### 3.4 Deployment

- **Vercel** — Hosts the **frontend** (the built React app). Serves it over HTTPS.
- **Railway** — Hosts the **server** and the **PostgreSQL database**. The server runs in a container; the database is a Railway Postgres instance.
- **Environment variables** — Secrets (database URL, Clerk keys, Anthropic API key) are set in Vercel and Railway, **not** in the code.

---

## 4. How the Code Is Organized and Written

### 4.1 Monorepo and folders

The project is a **monorepo**: one Git repo with several “workspaces.”

- **`client/`** — Frontend (React, Vite, Tailwind, etc.). What runs in the browser.
- **`server/`** — Backend (Fastify, Prisma, routes, AI). What runs on Node.
- **`shared/`** — Code that could be used by both (e.g. shared types). Right now it’s minimal.

So: **client** = UI and API client; **server** = API, database, files, and AI.

### 4.2 Frontend (client) structure

- **`client/src/`**
  - **`main.tsx`** — Entry point: renders the app, sets up Router and React Query. If Clerk is configured, it wraps the app in `ClerkProvider` and only shows the main app when **SignedIn**; otherwise it shows the Clerk sign-in screen.
  - **`App.tsx`** — Defines **routes** (e.g. `/` → Dashboard, `/expenses` → ExpenseList). Uses a **Layout** (sidebar + header + main area) and **Outlet** for the current page.
  - **`services/api.ts`** — Single **Axios** instance with:
    - **Base URL** from `VITE_API_URL` (your server).
    - **Request interceptor**: before every request, it gets a **token** from Clerk (via `getToken`) and adds `Authorization: Bearer <token>` so the server knows who is logged in.
  - **`hooks/`** — Custom hooks that use **React Query** to call the API (e.g. `useProjects()`, `useExpenses()`, `useSavedLocations()`). Components use these instead of calling Axios directly.
  - **`components/`** — React components: layout (sidebar, header), pages (Dashboard, ExpenseList, MileageLog, etc.), and **UI** (buttons, cards, dialogs from shadcn).
  - **`stores/uiStore.ts`** — Zustand store for UI-only state (e.g. sidebar open/closed).
  - **`types/`** — TypeScript types/interfaces shared across the client (Project, Expense, Receipt, etc.).

**Pattern:**  
UI components → call hooks → hooks use React Query → Axios sends request with **Bearer token** → server responds. So **every API call is authenticated** (except the health check).

### 4.3 Backend (server) structure

- **`server/src/`**
  - **`app.ts`** — Builds the **Fastify** app: registers CORS, rate limit, **Prisma** plugin, **auth** plugin, then all **route modules** under `/api/v1`.
  - **`plugins/auth.ts`** — **Runs on every request** (except `/api/v1/health`).  
    - If **Clerk** is not configured (no `CLERK_SECRET_KEY`): in dev, it sets `request.userId = 'dev_user'` so you can test without logging in.  
    - If Clerk **is** configured: it reads `Authorization: Bearer <token>`, verifies the token with **Clerk**, and sets `request.userId` (and optionally email).  
    So **every protected route** has a known `userId`; the server never trusts the client to say who they are — it **always** checks the token.
  - **`plugins/prisma.ts`** — Connects to PostgreSQL **in the background** (does not block server startup). Attaches `fastify.prisma` so routes can do `fastify.prisma.expense.findMany(...)` etc. If the DB is unavailable, the server still listens; non-health API routes wait for the connection (with a timeout) or return **503**. So you never get “refused to connect” — you get a proper 503 and can see DB errors in logs.
  - **`routes/health.ts`** — `GET /api/v1/health` returns `{ status, timestamp, database: "connected" | "disconnected" }` (no auth; does not wait for DB).
  - **`routes/stats.ts`** — `GET /api/v1/stats` (auth required) returns aggregate counts: `{ users, projects, expenses }` for dashboards or monitoring.
  - **`routes/`** — One file per “resource”: `expenses.ts`, `receipts.ts`, `projects.ts`, `mileage.ts`, `savedLocations.ts`, `stats.ts`, etc. Each route:
    - Uses **`request.userId`** in every database query (e.g. `where: { userId: request.userId }`) so users only see their own data.
  - **`services/ai/receiptProcessor.ts`** — Calls **Claude** with the receipt image/PDF and a prompt; parses the JSON response into vendor, amount, date, category, etc.
  - **`utils/receiptFingerprint.ts`** — Builds a short hash (e.g. from vendor + amount + date) for **duplicate receipt detection**.
  - **`prisma/schema.prisma`** — Defines all **models** (tables): User, Project, Expense, Receipt, Deposit, MileageEntry, SavedLocation, etc. Running `npm run db:push` (or migrations) keeps the real database in sync with this schema.

**Pattern:**  
Request comes in → **auth** plugin sets `request.userId` (or returns 401) → route handler uses `userId` in Prisma queries and file paths → response is sent. **No route** ever returns another user’s data or files.

---

## 5. Receipt Storage (Where and How Files Are Stored)

### 5.1 What gets stored

- **In the database (PostgreSQL):**  
  One **Receipt** row per upload: `userId`, `fileName`, `originalName`, `mimeType`, `fileSize`, **`storagePath`** (path on disk), `storageType` (e.g. `'local'`), plus AI fields (status, extracted vendor/amount/date, fingerprint, etc.).  
  The **actual file content** is **not** in the database.

- **On disk (server):**  
  The actual image or PDF file is saved under a **per-user** directory, for example:
  - `uploads/receipts/<userId>/<uuid>.jpg` (or `.png`, `.pdf`, etc.)
  - `userId` comes from **auth** (Clerk or dev_user); the server never uses a user ID from the URL or body for file paths.
  - Filename is a **random UUID** so it’s unique and not guessable.

So: **metadata and security-sensitive fields in DB; file bytes on disk (per user).** A single **Expense** can have **multiple Receipts** attached (`Receipt.expenseId`; `Expense.receipts`). After a batch upload, the user can choose “one expense per receipt” (review each and accept separately) or “one expense for all” (`POST /api/v1/receipts/accept-batch`). You can also attach a pending receipt to an existing expense with `POST /api/v1/expenses/:id/receipts` and `{ receiptId }`.

### 5.2 How upload works

1. **Upload (multipart)**  
   - Client sends the file to `POST /api/v1/receipts/upload` (or camera capture to `POST /api/v1/receipts/capture`).  
   - Request includes the **Bearer token**; auth plugin sets `request.userId`.
   - Server:
     - Validates file type (e.g. JPEG, PNG, PDF).
     - Creates folder `uploads/receipts/<userId>` if needed.
     - Saves the file as `uploads/receipts/<userId>/<uuid>.<ext>`.
     - Creates a **Receipt** row with that `storagePath` and `userId`.
   - Only that user’s folder is used; no other user’s ID is ever used for path.

2. **Camera capture**  
   - Same idea: body contains base64 image; server decodes it, saves to the same per-user folder, creates a Receipt row.

3. **Reading the file later**  
   - When the server needs to **read** the file (e.g. to send it to Claude or to serve a preview), it always loads the Receipt row **by id and userId** (e.g. `findFirst({ where: { id, userId: request.userId } })`). If the receipt isn’t found or doesn’t belong to the user, it returns 404. Only then does it read from `storagePath`. So **file access is always tied to the logged-in user**.

### 5.3 Security summary for receipts

- Files are stored **per user** in separate directories.
- Every **create/read/delete** of a receipt (and its file) goes through the server and uses **`request.userId`** from the **verified token**, not from the client.
- Receipt file URLs (e.g. `/api/v1/receipts/:id/file` or `/preview`) are **protected**: the server checks `userId` before returning the file, so you can’t access another user’s receipt by guessing an ID.

---

## 6. AI Receipt Analysis (How the App “Reads” Receipts)

### 6.1 Who does the reading

- **Claude** (Anthropic), via the **Anthropic SDK** in the server.
- Model used: **claude-sonnet-4-6** (vision capable). The server sends the receipt **image or PDF** plus a **text prompt**; Claude returns **structured JSON** (vendor, amount, date, line items, category, confidence, etc.).

### 6.2 Where it runs

- **Only on the server.** The client never sees your Anthropic API key or the raw image bytes sent to Claude. Flow:
  1. User uploads/captures receipt → server stores file and creates Receipt row.
  2. User (or app) triggers “Process” → client calls `POST /api/v1/receipts/:id/process`.
  3. Server loads the receipt (by `id` + `userId`), reads the file from disk, then calls **receiptProcessor.processReceipt()** with the file buffer and mime type.
  4. **receiptProcessor** (in `server/src/services/ai/receiptProcessor.ts`):
     - Converts HEIC/other formats to JPEG if needed (Sharp).
     - Builds a **content block** for Claude (image or PDF, base64).
     - Sends a **message** to Claude with a **prompt** that asks for a fixed JSON shape (vendor, amount, date, items, category, confidence, etc.) and passes the **user’s category list** so the category is one of theirs.
  5. Claude responds with text; the server parses the JSON from the response and stores the result on the Receipt row (and optionally runs **duplicate detection** using a fingerprint).
  6. Client can then show “Review receipt” with pre-filled fields and let the user accept or edit before creating an **Expense**.

So: **AI runs only on the server; the client only sees the extracted data after the server has stored it.**

### 6.3 Duplicate detection

- After extraction, the server computes a **fingerprint** from vendor + amount + date (e.g. SHA-256 hash, truncated).
- It checks if another receipt for the **same user** already has that fingerprint.
- If yes, the new receipt is marked as duplicate (e.g. `isDuplicate: true`, `duplicateOfId: <id>`) so the UI can warn the user.

---

## 7. User Login and Security (Storing Receipts and Login Info Safely)

### 7.1 Who handles login

- **Clerk** handles:
  - Sign-up and sign-in (email, password, or social providers).
  - Storing and managing **passwords** (if used) and **sessions** on Clerk’s side.
  - Issuing **JWTs** (tokens) that the Deducto server can verify.

So: **Deducto never stores or sees your password.** Only Clerk does. The app only gets a **short-lived token** to send to the Deducto server.

### 7.2 How the client sends “who you are”

- When you’re signed in, Clerk provides a **JWT**.
- The client’s **api** module (Axios) has a **request interceptor** that, before every API call, calls Clerk’s `getToken()` and adds:
  - `Authorization: Bearer <token>`
- So **every request** to your server (except health) carries this token. The server does **not** trust anything else (e.g. a “userId” in the body or URL) to identify the user.

### 7.3 How the server checks “who you are”

- **Auth plugin** (`server/src/plugins/auth.ts`):
  - For **production** (when `CLERK_SECRET_KEY` is set): it reads the Bearer token and calls **Clerk’s `verifyToken()`**. If the token is valid, it gets the user’s ID (and email) and sets **`request.userId`** (and optionally email). If the token is missing or invalid, it responds **401 Unauthorized** and the route handler is never run.
  - For **development** without Clerk: it sets `request.userId = 'dev_user'` so you can test without logging in.
- **Every protected route** (receipts, expenses, mileage, etc.) uses **only** `request.userId` when:
  - Reading from the database (e.g. `where: { userId: request.userId }`).
  - Choosing where to save files (e.g. `uploads/receipts/<request.userId>/...`).
  - Deleting or updating (e.g. only allow if the row’s `userId` matches `request.userId`).

So: **login identity is verified once per request using the JWT; all data and file access are scoped to that verified `userId`.**

### 7.4 What is stored where (security view)

| What | Where it lives | Who can access |
|------|----------------|----------------|
| **Passwords / social login** | Clerk’s systems (not in Deducto DB or code) | Only Clerk; Deducto never sees passwords. |
| **JWT** | Sent by browser to Deducto server on each request; not stored long-term in the app’s DB | Server verifies it and then forgets it; used only to set `userId` for that request. |
| **User row (id, email, name)** | PostgreSQL (Deducto) | Created/updated by server from Clerk’s token; used only for scoping data. |
| **Receipt metadata** | PostgreSQL (Deducto) | Every row has `userId`; queries always filter by `request.userId`. |
| **Receipt file (image/PDF)** | Server disk under `uploads/receipts/<userId>/` | Server only serves the file if the Receipt row exists and its `userId` matches `request.userId`. |
| **Expenses, mileage, etc.** | PostgreSQL (Deducto) | All have `userId`; all API handlers filter by `request.userId`. |

So: **receipts and login-related data are kept secure by (1) not storing passwords in our app, (2) verifying the JWT on every request, and (3) scoping every database query and file access to the verified `userId`.**

### 7.5 HTTPS and production

- In production, the app is served over **HTTPS** (Vercel and Railway). So the token and all data in transit are encrypted.
- **Secrets** (database URL, Clerk keys, Anthropic API key) are in **environment variables** on the server, not in the code, so they’re not exposed in the frontend or in Git.

---

## 8. Quick Reference: Important Files

| Purpose | File(s) |
|--------|--------|
| Frontend entry, auth wrapper | `client/src/main.tsx` |
| API client + auth token | `client/src/services/api.ts` |
| Server entry, CORS, auth, routes | `server/src/app.ts` |
| Auth: verify JWT, set userId | `server/src/plugins/auth.ts` |
| DB connection (deferred), health skip | `server/src/plugins/prisma.ts` |
| Health + DB status | `server/src/routes/health.ts` |
| Stats (users, projects, expenses) | `server/src/routes/stats.ts` |
| Receipt upload, storage, file serve, process | `server/src/routes/receipts.ts` |
| AI receipt parsing (Claude) | `server/src/services/ai/receiptProcessor.ts` |
| Duplicate receipt fingerprint | `server/src/utils/receiptFingerprint.ts` |
| Database schema (tables) | `server/prisma/schema.prisma` |

---

## 9. Summary for a Novice

- **Tech stack:** React + Vite + TypeScript on the frontend; Fastify + Prisma + PostgreSQL on the backend; Clerk for login; Claude for receipt AI. Receipt **files** live on the server’s disk (per user); **metadata** and all other data live in the database.
- **Code style:** Frontend uses **hooks** (React Query) to talk to the API; one **Axios** instance adds the **Bearer token** to every request. Backend uses **Fastify** routes and **Prisma** for DB; an **auth plugin** sets **userId** from the JWT so every route can scope data and files to the logged-in user.
- **Receipt storage:** Files saved under `uploads/receipts/<userId>/` with a UUID filename; DB stores path and metadata. Access to files is always checked with **userId** from the verified token.
- **AI analysis:** Done **only on the server** via Claude; the client never sends the image to Claude directly. Server reads the file, sends it to Claude with a prompt, parses the JSON, and stores the result; duplicate detection uses a fingerprint (vendor + amount + date).
- **Login and security:** Clerk handles sign-up/sign-in and stores passwords; Deducto only gets a **JWT** and verifies it on each request. All receipt and expense data are tied to the verified **userId**; nothing is shared between users.

If you want more detail on any one part (e.g. “show me exactly where the token is added” or “where is the receipt file path built?”), the file and section references above point you to the right place in the code.

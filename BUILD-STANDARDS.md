# Build Standards — Security & Storage

This document summarizes how Deducto meets typical web app standards for **storage**, **security**, **responsiveness**, **encryption**, and **legal disclaimers**.

---

## Security

### HTTP Security Headers

The server adds the following headers to all responses (see `server/src/app.ts`):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from guessing MIME types (reduces XSS risk) |
| `X-Frame-Options` | `DENY` (see below) | Prevents the app from being embedded in iframes (clickjacking protection). **Exception:** Omitted for receipt file and preview URLs (`/api/v1/receipts/:id/file` and `.../preview`) so receipt PDFs can load in iframes on the review page. |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter (still used by some browsers) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits what referrer info is sent on cross-origin requests |
| `Permissions-Policy` | `camera=(self), microphone=(self)` | Restricts camera/mic to same-origin only (needed for receipt capture) |

### Authentication & Authorization

- **Clerk** handles sign-up/sign-in; passwords are never stored in Deducto.
- Every API request (except `/api/v1/health`) must include a valid **Bearer JWT** in the `Authorization` header.
- The server verifies the token and sets `request.userId`; all database queries and file access use `userId` so users only see their own data.
- See `TECH-STACK-SUMMARY.md` for more detail on login and security.

### CORS & Rate Limiting

- **CORS**: In production, `CLIENT_URL` should be set so only the frontend origin is allowed; in dev, all origins are allowed for flexibility.
- **Rate limiting**: 100 requests per minute per IP (configurable in `app.ts`).

---

## Storage

### Client-Side Storage

- **No `localStorage` or `sessionStorage`** is used for sensitive data.
- **Clerk** manages session tokens (in memory or httpOnly cookies); the app never stores JWTs in localStorage.
- UI state (e.g. sidebar open/closed) lives in **Zustand** in memory only.

### Server-Side Storage

- **Database (PostgreSQL)**: All structured data — users, expenses, receipts metadata, mileage, etc. Every row is scoped by `userId`. **Encryption at rest**: Enable encryption on the database instance (e.g. Railway, Supabase, or AWS RDS offer encrypted storage). Verify in your provider’s dashboard that “encryption at rest” is enabled for the Deducto database.
- **Receipt files**: Stored on disk under `uploads/receipts/<userId>/<uuid>.<ext>`. Files are only served after verifying the receipt belongs to the logged-in user. For production, use **object storage (S3 or compatible) with server-side encryption (SSE-S3 or SSE-KMS)** so files are encrypted at rest.
- **Production**: Migrate receipt files to **S3** (or compatible) with server-side encryption. Set `storageType` and `storagePath` accordingly and update the receipt routes to read from S3.

### Encryption Summary

| Layer | In transit | At rest |
|-------|------------|---------|
| **API / web** | HTTPS (Vercel, Railway) — all requests and responses encrypted. | N/A |
| **Database** | TLS to DB (provider-dependent; Railway Postgres supports encrypted connections). | Enable encryption at rest on the DB instance (see above). |
| **Receipt files** | Served over HTTPS. | Use S3 (or similar) with SSE; or ensure server disk is encrypted (e.g. LUKS, provider default). |

Do not claim “end-to-end encryption” unless you implement client-side encryption of data before upload; current design relies on **transport encryption (HTTPS)** and **server-side/at-rest encryption** as above.

---

## Legal & Disclaimers

### “Not a tax advisor” disclaimer

Deducto provides **reports and exports for your records** (e.g. tax schedules, mileage, deductions). It does **not** provide tax advice. To limit liability and comply with common regulatory expectations:

- **In-app**: The disclaimer appears in the **footer** (every page) and on the **Reports** page near exports. Wording: *“Deducto is not a tax advisor. Reports and exports are for your records only. Consult a qualified tax professional for advice.”*
- **Exports**: CSV and PDF exports include a short disclaimer line (header/footer) so it travels with the file.
- **Legal pages**: Privacy Policy and Terms of Service (and Security overview) include the same disclaimer and link from the footer.

Do not remove or hide the disclaimer on report/export flows; keep it visible where users generate tax-related exports.

---

## Mobile Responsiveness

- **Viewport**: `width=device-width, initial-scale=1.0, viewport-fit=cover` for proper mobile rendering and safe-area support.
- **Layout**: Main content area uses `min-w-0` and `overflow-x-hidden` to prevent horizontal overflow.
- **Page headers**: Stack on mobile (title above buttons) and align horizontally on larger screens.
- **Cards & lists**: Expense and mileage cards stack on mobile; badges wrap; charts use `ResponsiveContainer` and `min-w-0`.
- **Tap targets**: `-webkit-tap-highlight-color: transparent` for cleaner tap feedback.

---

## Recommendations for Production

1. **Receipt storage**: Migrate to S3 (or similar) with **server-side encryption (SSE)** for durability and scalability.
2. **Database**: Confirm **encryption at rest** is enabled for your PostgreSQL instance (Railway, Supabase, RDS, etc.).
3. **CSP**: Consider a strict Content-Security-Policy after testing; it can break Clerk or third-party scripts if too restrictive.
4. **HTTPS**: Always use HTTPS in production (Vercel and Railway provide this by default).
5. **SOC 2**: The app implements strong **technical controls** (auth, scoping, headers, rate limiting, encryption in transit, recommendations for at-rest). These support a path toward SOC 2–style audits. **Do not** state that the product or organization is “SOC 2 ready” or “SOC 2 compliant” without a formal readiness assessment or audit (which includes policies, evidence, vendor management, incident response, etc.). Prefer a **Security** or **Privacy** page that describes controls and practices without making a compliance claim.

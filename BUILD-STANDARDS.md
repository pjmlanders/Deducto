# Build Standards — Security & Storage

This document summarizes how Deducto meets typical web app standards for **storage**, **security**, and **responsiveness**.

---

## Security

### HTTP Security Headers

The server adds the following headers to all responses (see `server/src/app.ts`):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents browsers from guessing MIME types (reduces XSS risk) |
| `X-Frame-Options` | `DENY` | Prevents the app from being embedded in iframes (clickjacking protection) |
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

- **Database (PostgreSQL)**: All structured data — users, expenses, receipts metadata, mileage, etc. Every row is scoped by `userId`.
- **Receipt files**: Stored on disk under `uploads/receipts/<userId>/<uuid>.<ext>`. Files are only served after verifying the receipt belongs to the logged-in user.
- **Production**: For scalability and durability, consider storing receipt files in **S3** (or compatible object storage) instead of local disk. Set `storageType` and `storagePath` accordingly and update the receipt routes to read from S3.

---

## Mobile Responsiveness

- **Viewport**: `width=device-width, initial-scale=1.0, viewport-fit=cover` for proper mobile rendering and safe-area support.
- **Layout**: Main content area uses `min-w-0` and `overflow-x-hidden` to prevent horizontal overflow.
- **Page headers**: Stack on mobile (title above buttons) and align horizontally on larger screens.
- **Cards & lists**: Expense and mileage cards stack on mobile; badges wrap; charts use `ResponsiveContainer` and `min-w-0`.
- **Tap targets**: `-webkit-tap-highlight-color: transparent` for cleaner tap feedback.

---

## Recommendations for Production

1. **Receipt storage**: Migrate to S3 (or similar) with server-side encryption for durability and scalability.
2. **CSP**: Consider a strict Content-Security-Policy after testing; it can break Clerk or third-party scripts if too restrictive.
3. **HTTPS**: Always use HTTPS in production (Vercel and Railway provide this by default).

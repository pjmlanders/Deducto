# Fixing Custom Domain Access (e.g. deducto.com)

If testers see **"The server can't be found"** or **"A server with the specified hostname could not be found"** when opening your custom domain (e.g. `deducto.com`), but the **Vercel link works**, the domain is not yet pointing to Vercel. Follow these steps.

---

## 1. Add the domain in Vercel

Domains are set **per project**, not in your account Settings.

1. Go to [Vercel Dashboard](https://vercel.com/dashboard).
2. **Click your project** (e.g. **Deducto** or **deducto**) so you’re inside that project.
3. Open **Settings** (project settings, not your profile/account settings).
4. In the left sidebar under Settings, click **Domains**. (If you don’t see it, look for a **Domains** tab at the top of the project next to Deployments / Analytics.)
5. Click **Add** and enter your domain, e.g. `deducto.com`.
6. Optionally add `www.deducto.com` if you want both.
7. Vercel will show the **DNS records** you need. Leave this tab open.

---

## 2. Add DNS records where the domain is registered

You need to add the **exact** records Vercel shows. Where you do this depends on where you bought the domain (GoDaddy, Namecheap, Google Domains, Cloudflare, etc.).

### Typical setup

- **Apex domain (`deducto.com`)**  
  Vercel usually gives:
  - **A** record: Name `@` (or `deducto.com`), Value `76.76.21.21`  
  or
  - **CNAME** (if supported): Name `@`, Value `cname.vercel-dns.com`

- **www (`www.deducto.com`)**  
  - **CNAME** record: Name `www`, Value `cname.vercel-dns.com`

### Where to add them

- **GoDaddy**: My Products → Domains → your domain → **DNS** or **Manage DNS** → add the A and/or CNAME records above.
- **Namecheap**: Domain List → Manage → **Advanced DNS** → add A record and/or CNAME.
- **Google Domains / Cloudflare**: DNS section → add the same A/CNAME records.
- **Cloudflare**: Use the values Vercel gives; keep proxy (orange cloud) **off** until the domain is verified in Vercel, then you can turn it on if you want.

Use the **exact** host and value Vercel shows for your project (they can differ slightly).

---

## 3. Wait for DNS to take effect

- Changes often apply in **5–60 minutes**; sometimes up to **24–48 hours**.
- In Vercel → **Domains**, the domain will show **Verified** when DNS is correct.
- You can check propagation: [dnschecker.org](https://dnschecker.org) — search for `deducto.com` and confirm it resolves to Vercel’s IP or CNAME.

---

## 4. Add the domain in Clerk (auth)

So sign-in and redirects work on the new domain:

1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your application.
2. **Configure** → **Domains** (or **Settings** → **Paths** / allowed origins).
3. Add `https://deducto.com` (and `https://www.deducto.com` if you use www).
4. Save.

---

## 5. What to send testers in the meantime

- **Before the domain is verified:**  
  Send the **Vercel URL** (e.g. `https://deducto-paul-landers-projects.vercel.app`) so they can use the app.
- **After deducto.com shows Verified in Vercel:**  
  Send **https://deducto.com** (or https://www.deducto.com if you use www).

---

## 6. Optional: redirect www to non-www (or the reverse)

In Vercel → **Settings** → **Domains**, you can set which domain is primary and redirect the other (e.g. `www.deducto.com` → `deducto.com`).

---

## Quick checklist

| Step | Action |
|------|--------|
| 1 | Add `deducto.com` (and optional `www`) in Vercel → Settings → Domains |
| 2 | Copy the A and/or CNAME values Vercel shows |
| 3 | Add those records at your domain registrar/DNS provider |
| 4 | Wait until the domain shows **Verified** in Vercel |
| 5 | Add `https://deducto.com` (and www if used) in Clerk → Domains |
| 6 | Share **https://deducto.com** with testers once verified |

If the Vercel URL works but the custom domain still shows "server can't be found", the issue is almost always **missing or incorrect DNS records** at the registrar — double-check the host and value against Vercel’s instructions.

---

## 7. Common production console errors

### “Clerk: Failed to load Clerk” / `clerk.deductoapp.com` 404

If the app loads from `https://www.deductoapp.com` (or `deductoapp.com`) but the browser console shows:

- `GET https://clerk.deductoapp.com/npm/@clerk/clerk-js@5/dist/clerk.browser.js` **404 (Not Found)**
- or **CORS** / “Failed to load Clerk”

then **Clerk is using a custom domain** (`clerk.deductoapp.com`) that isn’t set up correctly.

**Fix (choose one):**

- **Option A – Use Clerk’s default domain (simplest)**  
  1. Go to [Clerk Dashboard](https://dashboard.clerk.com) → your application.  
  2. Open **Configure** → **Domains** (or **Settings** → **Domains**).  
  3. If you see a custom Frontend API domain like `clerk.deductoapp.com`, **remove it** or switch back to Clerk’s default (e.g. `*.clerk.accounts.dev`).  
  4. In **Allowed origins**, keep `https://www.deductoapp.com` and `https://deductoapp.com`.  
  5. Redeploy the app if needed so it uses the default Clerk script URL.

- **Option B – Keep the custom domain**  
  Add the CNAME records Clerk shows (see **Clerk DNS records for deductoapp.com** below), then in Clerk click **Verify configuration**. After DNS propagates (up to 48 hours), Clerk will serve the script from `https://clerk.deductoapp.com`.

Until one of these is done, Clerk’s script will keep returning 404 and sign-in will fail.

#### Clerk DNS records for deductoapp.com

When Clerk shows **DNS Configuration** with “0/5 Verified,” add these **5 CNAME records** at the place where you manage DNS for **deductoapp.com** (e.g. GoDaddy, Namecheap, Cloudflare). Use the **Name** as the record host/subdomain and **Value** as the target.

| Purpose        | Name (host)   | Value (target)                    |
|----------------|---------------|------------------------------------|
| Frontend API   | `clerk`       | `frontend-api.clerk.services`      |
| Account portal | `accounts`    | `accounts.clerk.services`          |
| Email          | `clkmail`     | `mail.eo8utl3hmxje.clerk.services` |
| Email DKIM 1   | `clk._domainkey` | `dkim1.eo8utl3hmxje.clerk.services` |
| Email DKIM 2   | `clk2._domainkey` | `dkim2.eo8utl3hmxje.clerk.services` |

- In most DNS UIs you enter only the **subdomain** (e.g. `clerk`, `accounts`, `clkmail`, `clk._domainkey`, `clk2._domainkey`); the zone is already `deductoapp.com`.
- After saving, wait a few minutes to 48 hours, then in Clerk click **Verify configuration**. When all show Verified, sign-in and the Clerk script will work.
- If your Clerk instance uses different targets (e.g. different `eo8utl3hmxje`), use the **exact** values shown on the Clerk DNS Configuration page.

### PWA icon 404 (`/icons/icon-192x192.png` not found)

If you see **“Download error or resource isn’t a valid image”** for `/icons/icon-192x192.png` or `/icons/icon-512x512.png`, the PWA manifest is asking for icon files that aren’t in the build.

**Fix:** Add at least one PNG in the repo and redeploy:

1. Create **`client/public/icons/icon-512x512.png`** (512×512 px). You can export from `client/public/logo.svg` in a design tool or use any 512×512 PNG.
2. Optionally add **`client/public/icons/icon-192x192.png`** (192×192 px). If you only add the 512 file, the manifest can use it for both sizes (see `client/vite.config.ts`).
3. Commit, push, and let Vercel redeploy.

### `chrome-extension://invalid/` errors

These come from a **browser extension** (e.g. password manager, coupon tool), not from your app. You can ignore them; they don’t affect Deducto.

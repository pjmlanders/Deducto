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

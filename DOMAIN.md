# Setting up worgent.com

You already own worgent.com — this walks you through pointing it at GitHub Pages.

## 1. Find your registrar's DNS panel

Log into wherever you bought worgent.com (Namecheap, GoDaddy, Porkbun, Cloudflare, Google/Squarespace Domains, etc.) and find the DNS / "Manage DNS" / "DNS Records" section. Every registrar has one — usually under the domain's settings page.

> If you bought through a registrar that defaults to its own DNS (e.g. Cloudflare, Namecheap), you'll edit records right there. If you set up custom nameservers anywhere else, edit records on whichever DNS provider is authoritative.

## 2. Add the GitHub Pages records

Add **five** records total:

### Apex (worgent.com → GitHub Pages)

Four `A` records pointing the apex to GitHub's load balancer:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@` | `185.199.108.153` | 3600 |
| A | `@` | `185.199.109.153` | 3600 |
| A | `@` | `185.199.110.153` | 3600 |
| A | `@` | `185.199.111.153` | 3600 |

Some registrars use a blank host instead of `@`, or want you to type `worgent.com`. They all mean the same thing.

### www subdomain (recommended)

One `CNAME` so `www.worgent.com` also works:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| CNAME | `www` | `<your-username>.github.io.` | 3600 |

(The trailing dot at the end of `<your-username>.github.io.` is correct DNS syntax; some registrars hide it.)

### Delete any conflicting records

If your registrar pre-populated `A` records pointing at parking pages, or `CNAME @` records, **delete them**. You can only have one set of records per host. Leaving the parking-page records in place will keep showing the registrar's "this domain is for sale / coming soon" page.

## 3. Tell GitHub about the domain

Already done — the `publish/CNAME` file in this project contains `worgent.com`. As soon as you push that to your repo, GitHub Pages picks it up and starts trying to serve traffic for that domain.

You can also set it manually: repo → **Settings → Pages → Custom domain → worgent.com → Save**.

## 4. Wait for DNS, then enable HTTPS

- DNS usually propagates within 10–60 minutes (sometimes a few hours). Check with `dig worgent.com +short` from a terminal — once you see the four `185.199.x.153` IPs, you're live.
  - On Windows, use `nslookup worgent.com` instead, or try [dnschecker.org](https://dnschecker.org/#A/worgent.com).
- Back in **Settings → Pages**, GitHub will spend up to an hour provisioning a Let's Encrypt cert. Once done, the **Enforce HTTPS** checkbox unlocks — tick it.

## 5. Done

Visit https://worgent.com. Hard-refresh (`Ctrl+Shift+R`) the first time so your browser doesn't serve a cached "site can't be reached" page from earlier attempts.

## Troubleshooting

- **"Domain does not resolve to the GitHub Pages server"** in Pages settings → DNS hasn't propagated yet, or one of the A records is wrong, or there's a stale parking record. Re-check with `dig worgent.com +short`.
- **HTTPS checkbox is greyed out** → wait. Cert provisioning typically takes 15 min but can take up to 24 hours. Make sure DNS is correct first.
- **Site loads but shows old version** → browser cache. Hard-refresh, or test in an incognito window. Look for the "v1.6" stamp under the title to confirm.
- **www works but apex doesn't (or vice versa)** → only one of the record sets is in place. The apex needs all four `A` records; `www` needs the `CNAME`.
- **Still seeing the registrar's parking page** → your `A` records for the apex weren't applied, or there's an old conflicting record (often `A @ → parking-IP`) you forgot to delete.

## Renewal

`.com` domains renew at the same price as in
# vaultra-web

Public marketing one-pager for **[vaultra.fun](https://vaultra.fun)** — the Vaultra mobile game landing page.

This repo is **static only** (HTML/CSS/assets). It is separate from the private Unity game repo (`soloaiagent007-max/vaultra`).

## Live URLs

| URL | Purpose |
|-----|---------|
| `https://soloaiagent007-max.github.io/vaultra-web/` | GitHub Pages project URL (works without custom DNS) |
| `https://vaultra.fun` / `https://www.vaultra.fun` | Custom domain (after GoDaddy DNS + GitHub Pages verification) |

**Pages source:** `main` branch, site root `/` (not `/docs`).

## What’s already done (GitHub)

- Public repo `soloaiagent007-max/vaultra-web` created
- Static site pushed to `main` (`index.html`, `styles.css`, `assets/`, `CNAME`)
- GitHub Pages enabled from `main` / root
- Custom domain set to `vaultra.fun` via repo `CNAME` file (and Pages settings)

## What Brandon must do in GoDaddy (DNS only)

Keep DNS hosted at GoDaddy. Do **not** buy a paid GoDaddy website plan. Only point DNS at GitHub Pages.

### 1. Apex / root: `vaultra.fun`

In GoDaddy → **DNS** for `vaultra.fun` → manage **A** records for `@` (or blank host):

Delete any existing A / ALIAS / ANAME / forwarding that points the apex elsewhere (old parking, GoDaddy site builder, etc.), then add these **four** A records:

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| A | `@` | `185.199.108.153` | 600 (or default) |
| A | `@` | `185.199.109.153` | 600 |
| A | `@` | `185.199.110.153` | 600 |
| A | `@` | `185.199.111.153` | 600 |

These are [GitHub Pages’ published IPv4 addresses](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

Optional IPv6 (AAAA) if GoDaddy shows AAAA for `@`:

| Type | Name | Value |
|------|------|-------|
| AAAA | `@` | `2606:50c0:8000::153` |
| AAAA | `@` | `2606:50c0:8001::153` |
| AAAA | `@` | `2606:50c0:8002::153` |
| AAAA | `@` | `2606:50c0:8003::153` |

### 2. www: `www.vaultra.fun`

| Type | Name / Host | Value / Points to | TTL |
|------|-------------|-------------------|-----|
| CNAME | `www` | `soloaiagent007-max.github.io` | 600 |

Remove any conflicting www A records or GoDaddy “domain forwarding” that fights this CNAME.

### 3. After DNS propagates

1. Open GitHub → repo **vaultra-web** → **Settings** → **Pages**.
2. Confirm **Custom domain** is `vaultra.fun`.
3. Wait for DNS check to go green, then enable **Enforce HTTPS** (GitHub issues the cert after DNS verifies — can take minutes to a few hours).

Propagation tip: apex A + www CNAME changes often show in 5–30 minutes; allow up to 48h if GoDaddy had long TTLs before.

## Local preview

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Brand notes

- Primary mark: `assets/vault-smiley-v.png` (full brand render) plus cropped logo/favicon variants.
- Store buttons are labeled **Coming Soon** until real App Store / Google Play URLs exist.
- Do not nest this site inside the Unity `vaultra` repo.

## Stack

- Free GitHub Pages
- No build step, no paid hosting

# Deploying on Railway

The site runs on Vercel or on Railway from the same code. It is fully
static: `pnpm build` writes every page, image and sitemap to `dist/`, with
no server and no API. Vercel serves `dist/` with the settings in
`vercel.ts`; on Railway, Caddy serves it from a small container. This
guide covers Railway: the container, its settings, a test deployment and
the switch of the public address.

## How it runs

```
visitor -> Railway edge (TLS) -> Caddy :$PORT -> files in /app/dist
```

- **Caddy** (`Caddyfile`) sends the same security headers, redirects and
  cache rules as `vercel.ts`, serves the built files and answers unknown
  paths with the 404 page (status 404). `tests/caddyfile.test.ts` fails when
  the two disagree: change both together.
- **Content** is in the repository (`src/content/*`, photos in
  `src/assets/...`). Publishing is a git push: Railway rebuilds the image
  and deploys it. Nothing is fetched at runtime.

| File                      | Role                                                     |
| ------------------------- | -------------------------------------------------------- |
| `Dockerfile`              | Builds with pnpm (Node 22); the runtime is Caddy alone.  |
| `Caddyfile`               | Headers, redirects, cache rules, static files, 404 page. |
| `tests/caddyfile.test.ts` | Keeps the Caddyfile in sync with `vercel.ts`.            |

## Service variables

| Variable          | When    | Value                                                                                                                              |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL` | build   | The public address, e.g. `https://www.emoj.cl`. Keep it on test deployments too, so canonical URLs never point at the test domain. |
| `PORT`            | runtime | Caddy listens on it; 8080 when unset. The domain's target port must match.                                                         |

Railway passes service variables to the Dockerfile as build arguments.
Remove the variables of the former setup from the service:
`PUBLIC_API_URL`, `API_ORIGIN`, `API_UPSTREAM`, `NODE_PORT` and
`IMAGE_CACHE_MAX_MB`.

## Service settings

Set these in the service's Settings on Railway (Railway deprecated
`railway.json`; services created after 2026-08-28 cannot use it).

- **Source:** this repository and the branch to deploy. Each push to it
  deploys.
- **Build → Builder:** Dockerfile (`/Dockerfile`).
- **Deploy → Healthcheck Path:** `/healthz` (Caddy answers it itself).
- **Networking → Generate Domain:** target port `8080`.

## Test deployment (no DNS changes)

1. Add an empty service, connect this repository and apply the settings
   above before the first deploy.
2. Set `PUBLIC_SITE_URL`.
3. Generate a Railway domain (`*.up.railway.app`) for the service.
4. Check, on the Railway domain:
   - `curl -sI https://<domain>/` shows the CSP, HSTS and the other
     headers; `/_astro/*` files are `immutable`.
   - `/nosotros` and `/nosotros/` both load; an unknown path returns the
     404 page with status 404; `/archivo/2939` redirects (301).
   - Every project and article in `src/content` has its page, with its
     photos.
   - `/contacto` shows the WhatsApp, email and phone links.

## Switching the public address (only once the migration is approved)

Decided on 2026-10-06: the domain, its DNS and the `@emoj.cl` mail stay at
Chilecom. The site's address becomes `www.emoj.cl`; `emoj.cl` keeps pointing
at Chilecom, whose hosting redirects it to `www`. Mail is not touched.

1. Lower the DNS TTL 48 h before and back up the WordPress site (files and
   database, from the Chilecom panel).
2. Add `www.emoj.cl` as a custom domain of this service on Railway and
   create, in Chilecom's DNS, the `www` CNAME record Railway shows. Do not
   change the `emoj.cl` record or the mail records.
3. On Chilecom's hosting for `emoj.cl`, replace the WordPress site with a
   301 redirect to `https://www.emoj.cl` that keeps the path (in cPanel, a
   rewrite in `.htaccess`). Keep the WordPress files for 30 days.
4. Set `PUBLIC_SITE_URL=https://www.emoj.cl` here.
5. Check mail (send and receive), the phone/WhatsApp/map links and a few
   legacy URLs (`curl -sI https://emoj.cl/archivo/2939` ends on the new
   article); submit the sitemap to Search Console.
6. Rolling back: point `www` back to its old record and remove the redirect.

## Running the image locally

```sh
docker build -t emoj-frontend .
docker run --rm -p 8080:8080 emoj-frontend
```

Without Docker: `pnpm build && pnpm preview` serves `dist/` (no headers or
redirects; those come from Caddy or Vercel).

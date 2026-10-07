# Deploying on Railway

The site runs on Vercel or on Railway from the same code. `astro.config.mjs`
picks the adapter: `@astrojs/vercel` when `VERCEL=1` (Vercel sets it in its
builds), `@astrojs/node` anywhere else. This guide covers Railway: the
container, its settings, a test deployment and the switch of the public
address.

## How it runs

One container, two processes (`scripts/start.sh`):

```
visitor -> Railway edge (TLS) -> Caddy :$PORT -+-> built pages and assets, from disk
                                               +-> /api/* -> the API (prefix stripped)
                                               +-> everything else -> Astro Node server 127.0.0.1:$NODE_PORT
```

- **Caddy** (`Caddyfile`) sends the same security headers, redirects, `/api`
  rewrite and cache rules as `vercel.ts`, and serves the pages built ahead
  of time. `tests/caddyfile.test.ts` fails when the two disagree: change both
  together.
- **The Astro server** renders the pages with API content (home, projects,
  news, the content sitemap) on every request, so a change in the panel shows
  on the next visit. There is no page cache and no rebuild.
- **Images** are resized on demand through `/_image` and kept on disk
  (`src/lib/image-cache.ts`): each size is processed once per deploy, then
  served from the cache. The cache starts empty after each deploy.
- If either process exits, the container exits and Railway restarts it.

| File                      | Role                                                                    |
| ------------------------- | ----------------------------------------------------------------------- |
| `Dockerfile`              | Builds with pnpm (Node 22); runtime is Node plus the Caddy binary.      |
| `Caddyfile`               | Headers, redirects, `/api`, static files; the rest to the Astro server. |
| `scripts/start.sh`        | Starts both processes and stops the container if one exits.             |
| `tests/caddyfile.test.ts` | Keeps the Caddyfile in sync with `vercel.ts`.                           |

## Service variables

| Variable                    | When    | Value                                                                                                                                                  |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_API_URL`            | build   | Public API URL. Compiled into the server; the pages call it on every request.                                                                          |
| `PUBLIC_SITE_URL`           | build   | The public address, e.g. `https://www.emoj.cl`. Keep it on test deployments too, so canonical URLs never point at the test domain.                     |
| `PUBLIC_TURNSTILE_SITE_KEY` | build   | Turnstile site key (the test key is used when unset).                                                                                                  |
| `API_ORIGIN`                | runtime | Origin of the API for the CSP `connect-src` (the contact form calls it directly), e.g. `https://api.emoj.cl`.                                          |
| `API_UPSTREAM`              | runtime | Where `/api/*` is proxied. The public origin works; the private network is better: `http://${{<backend>.RAILWAY_PRIVATE_DOMAIN}}:${{<backend>.PORT}}`. |
| `PORT`                      | runtime | Caddy listens on it; 8080 when unset. The domain's target port must match.                                                                             |
| `IMAGE_CACHE_MAX_MB`        | runtime | Optional. Disk for resized images, 512 by default.                                                                                                     |

Railway passes service variables to the Dockerfile as build arguments, so the
`PUBLIC_*` values only need to be defined once on the service.

`NO_CACHE` is no longer needed: content is not baked into the build anymore,
so Railway's build cache is safe and code deploys are faster with it. Remove
the variable from the service.

## Service settings

Set these in the service's Settings on Railway (Railway deprecated
`railway.json`; services created after 2026-08-28 cannot use it).

- **Source:** this repository and the branch to deploy.
- **Build → Builder:** Dockerfile (`/Dockerfile`).
- **Deploy → Healthcheck Path:** `/healthz`. It answers from the Astro server
  without calling the API, so a site deploy does not fail while the API
  restarts.
- **Networking → Generate Domain:** target port `8080`.

## The API side

Content changes need no redeploy of the site anymore:

- On the API service, remove `RAILWAY_FRONTEND_TOKEN` (and
  `RAILWAY_FRONTEND_SERVICE_ID`). Otherwise every publish still redeploys the
  site: harmless, but it empties the image cache for nothing.
- Keep the site's domain in the API's `ALLOWED_ORIGINS`.

The panel still calls `/admin/revalidar` after each change. On the Node
server it checks the session and answers at once (there is no page cache to
refresh), so the editor sees "Ya está en el sitio" right away.

## Test deployment (no DNS changes)

1. In the Railway project that holds the API, add an empty service, connect
   this repository and apply the settings above before the first deploy.
2. Set the variables above, pointing at the staging API.
3. Generate a Railway domain (`*.up.railway.app`) for the service and add it
   to the API's `ALLOWED_ORIGINS`.
4. Check, on the Railway domain:
   - `curl -sI https://<domain>/` shows the CSP, HSTS and the other headers;
     `/_astro/*` files are `immutable`; `/admin` is `no-store` and `noindex`.
   - Publish a news item in the panel: it shows in `/noticias` on the next
     reload, with no new deployment on Railway.
   - Open a project twice: the second time its photos load from the cache
     (`/_image` answers in milliseconds).
   - `/nosotros` and `/nosotros/` both load; an unknown path returns the 404
     page with status 404; `/archivo/2939` redirects (301).
   - The contact form submits (Turnstile loads) and admin sign-in survives a
     reload (the cookie is first-party through `/api`).

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
4. Set `PUBLIC_SITE_URL=https://www.emoj.cl` here and
   `ADMIN_BASE_URL=https://www.emoj.cl` on the API.
5. Check mail (send and receive), the form, the phone/WhatsApp/map links, a
   few legacy URLs (`curl -sI https://emoj.cl/archivo/2939` ends on the new
   article) and the panel; submit the sitemap to Search Console.
6. Rolling back: point `www` back to its old record and remove the redirect.

## Running the image locally

```sh
docker build --build-arg PUBLIC_API_URL=https://api-staging-25e9.up.railway.app -t emoj-frontend .
docker run --rm -p 8080:8080 \
  -e API_ORIGIN=https://api-staging-25e9.up.railway.app \
  -e API_UPSTREAM=https://api-staging-25e9.up.railway.app \
  emoj-frontend
```

Without Docker: `pnpm build`, then `HOST=127.0.0.1 PORT=4321 node
dist/server/entry.mjs` runs the Astro server alone (no headers, redirects or
`/api`; those come from Caddy).

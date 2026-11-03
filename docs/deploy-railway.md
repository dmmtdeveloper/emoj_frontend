# Deploying on Railway

The site runs on Railway, at https://www.emoj.cl. It is fully static:
`pnpm build` writes every page, image and sitemap to `dist/`, with no
server and no API, and Caddy serves it from a small container. This guide
covers the container, its settings, a test deployment and the public
address.

## How it runs

```
visitor -> Railway edge (TLS) -> Caddy :$PORT -> files in /app/dist
```

- **Caddy** (`Caddyfile`) sends the security headers, redirects and cache
  rules, serves the built files and answers unknown paths with the 404 page
  (status 404). `tests/caddyfile.test.ts` lists every header and redirect
  it must send: change both together.
- **Content** is in the repository (`src/content/*`, photos in
  `src/assets/...`). Publishing is a git push: Railway rebuilds the image
  and deploys it. Nothing is fetched at runtime.

| File                      | Role                                                     |
| ------------------------- | -------------------------------------------------------- |
| `Dockerfile`              | Builds with pnpm (Node 22); the runtime is Caddy alone.  |
| `Caddyfile`               | Headers, redirects, cache rules, static files, 404 page. |
| `tests/caddyfile.test.ts` | The headers and redirects the Caddyfile must send.       |

## Service variables

| Variable          | When    | Value                                                                                                     |
| ----------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL` | build   | `https://www.emoj.cl`. Keep it on test deployments too, so canonical URLs never point at the test domain. |
| `PORT`            | runtime | Caddy listens on it; 8080 when unset. The domain's target port must match.                                |

These are the only two. Railway passes service variables to the
Dockerfile as build arguments.
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

## Public address

The site's address is `www.emoj.cl`, a custom domain of this service on
Railway (decided on 2026-10-06). The domain, its DNS and the `@emoj.cl`
mail stay at Chilecom:

- `www` is a CNAME record, in Chilecom's DNS, to the target Railway shows
  for the custom domain.
- `emoj.cl` keeps pointing at Chilecom, whose hosting (cPanel) answers it
  with a 301 redirect to `https://www.emoj.cl` that keeps the path. A
  legacy URL takes two hops (cPanel, then Caddy):
  `curl -sIL https://emoj.cl/archivo/2939` ends on the new article.
- Mail records are not touched.

`PUBLIC_SITE_URL` must stay `https://www.emoj.cl`, so canonical URLs and
sitemaps use the address search engines index.

## Running the image locally

```sh
docker build -t emoj-frontend .
docker run --rm -p 8080:8080 emoj-frontend
```

Without Docker: `pnpm build && pnpm preview` serves `dist/` (no headers or
redirects; those come from Caddy).

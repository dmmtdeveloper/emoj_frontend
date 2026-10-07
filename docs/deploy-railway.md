# Deploying on Railway

The site is deployed on Vercel today. This repository is also ready to run
on Railway, next to the API, without changing anything on Vercel: the
Railway files are ignored there. This guide covers a test deployment, the
content rebuilds and the eventual switch of `emoj.cl`.

## What is in the repository

| File                      | Role                                                                                                      |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Dockerfile`              | Builds the site with pnpm (Node 22) and serves `dist/` with Caddy.                                        |
| `Caddyfile`               | Same security headers, `/api` rewrite and cache rules as `vercel.ts`; 404 page; gzip/zstd.                |
| `tests/caddyfile.test.ts` | Fails when the Caddyfile and `vercel.ts` disagree on headers or the `/api` rewrite. Change both together. |

Static output, so nothing runs on the server but Caddy. The backend has a
matching `railway` site rebuilder (see "Content rebuilds").

## Service variables

| Variable                    | When    | Value                                                                                                                                                  |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PUBLIC_API_URL`            | build   | Public API URL. Must answer during the build (projects and news are fetched).                                                                          |
| `PUBLIC_SITE_URL`           | build   | `https://emoj.cl`. Keep it on test deployments too, so canonical URLs never point at the test domain.                                                  |
| `PUBLIC_TURNSTILE_SITE_KEY` | build   | Turnstile site key (the test key is used when unset).                                                                                                  |
| `API_ORIGIN`                | runtime | Origin of the API for the CSP `connect-src` (the contact form calls it directly), e.g. `https://api.emoj.cl`.                                          |
| `API_UPSTREAM`              | runtime | Where `/api/*` is proxied. The public origin works; the private network is better: `http://${{<backend>.RAILWAY_PRIVATE_DOMAIN}}:${{<backend>.PORT}}`. |
| `PORT`                      | runtime | Caddy listens on it; 8080 when unset. The domain's target port must match.                                                                             |
| `NO_CACHE`                  | build   | `1`. Required: see below.                                                                                                                              |

Railway passes service variables to the Dockerfile as build arguments, so the
`PUBLIC_*` values only need to be defined once on the service.

`NO_CACHE=1` turns off Railway's build layer cache. Without it, a content
rebuild (the API redeploys the service when something is published) changes
no source file, so Docker reuses the cached `pnpm build` layer: the deploy
finishes in seconds with the old pages and the new content never shows up.
Every build then installs dependencies again, about a minute more, which is
the price of always building against the current API content.

## Service settings

Set these in the service's Settings on Railway. There is no `railway.json`:
Railway deprecated config-as-code, and services created after 2026-08-28
cannot opt in.

- **Source:** this repository and the branch to deploy.
- **Build → Builder:** Dockerfile (`/Dockerfile`).
- **Deploy → Healthcheck Path:** `/`.
- **Networking → Generate Domain:** target port `8080`.

## Test deployment (no DNS changes)

1. In the Railway project that holds the API, add an empty service, connect
   this repository and apply the settings above before the first deploy.
2. Set the variables above, pointing at the staging API.
3. Generate a Railway domain (`*.up.railway.app`) for the service.
4. On the API service, add that domain to `ALLOWED_ORIGINS`. The contact form
   calls the API cross-origin, and the admin's Origin check accepts the
   allowed origins (or, through the private network, the forwarded host).
5. Check, on the Railway domain:
   - `curl -sI https://<domain>/` shows the CSP, HSTS and the other headers;
     `/_astro/*` files are `immutable`; `/admin` is `no-store` and `noindex`.
   - The home page shows the client logos and the header wordmark animation,
     with no CSP errors in the browser console.
   - `/nosotros` and `/nosotros/` both load; an unknown path returns the 404
     page with status 404.
   - The contact form submits (Turnstile loads).
   - Admin sign-in works and the session survives a reload (the cookie is
     first-party through `/api`).
6. Remove the Railway domain (or the service) when done; the test site
   should not stay public.

## Content rebuilds

Publishing in the admin rebuilds the static site. With Vercel the API calls a
deploy hook (`VERCEL_DEPLOY_HOOK_URL`). With Railway it calls the public API's
`serviceInstanceDeploy` mutation with `latestCommit`, which builds the
frontend again from its branch (what `railway redeploy --from-source` does).
`environmentTriggersDeploy` does not work here: Railway answers "Bad Access"
to project tokens.

1. Create a project token (project settings → Tokens) for the frontend's
   environment.
2. On the API service set `RAILWAY_FRONTEND_TOKEN` (the token) and
   `RAILWAY_FRONTEND_SERVICE_ID` (the frontend service id). The environment
   defaults to the one Railway injects into the API service
   (`RAILWAY_FRONTEND_ENVIRONMENT_ID` overrides it).
3. Unset `VERCEL_DEPLOY_HOOK_URL`: the API refuses to start with both.
4. Publish something and confirm a new frontend deployment starts and its
   build logs run `pnpm build` (not `CACHED`); see `NO_CACHE` above. If it does
   not, the API logs `site rebuild failed` with Railway's message.

## Switching emoj.cl (only once the migration is approved)

Email for `@emoj.cl` stays on Chilecom (the current hosting). Today the MX
record points at `emoj.cl` itself and `mail.emoj.cl` is an alias of
`emoj.cl`, so moving the apex record to Railway would also move mail. Do it in
this order:

1. **Detach mail from the apex record.**
   - `mail.emoj.cl` → `A 200.63.96.7` (instead of the alias to `emoj.cl`).
   - `MX emoj.cl` → `mail.emoj.cl` (priority 0 or 10).
   - Keep `webmail.emoj.cl` and the SPF record as they are (SPF already lists
     `200.63.96.7` explicitly).
   - Check that mail clients use `mail.emoj.cl` as the IMAP/SMTP server.
   - Wait for the old TTL (4 h) and send/receive a test message.
2. **Pick how the apex reaches Railway.** Railway custom domains use a CNAME,
   which the apex can only have with CNAME flattening/ALIAS:
   - Move DNS to Cloudflare (free), copy every record (mail ones included),
     then point `emoj.cl` and `www` at Railway; or
   - keep DNS at Chilecom, serve the site on `www.emoj.cl` (CNAME) and
     redirect the apex there from the old hosting.
3. **Add the custom domains** on the Railway service and create the DNS
   records it shows. Set `ALLOWED_ORIGINS` on the API to the final origin.
4. **Content rebuilds:** switch the API from the Vercel hook to Railway (see
   above).
5. **Legacy URLs:** the old WordPress addresses already redirect (301) to
   the new pages, on Vercel (`legacyRedirects` in `vercel.ts`) and on Railway
   (`redir` lines in the Caddyfile). Check a few after the switch, e.g.
   `curl -sI https://emoj.cl/archivo/2939`.
6. Keep the Vercel project for a while. Rolling back is pointing DNS back.

## Running the image locally

```sh
docker build --build-arg PUBLIC_API_URL=https://api-staging-25e9.up.railway.app -t emoj-frontend .
docker run --rm -p 8080:8080 \
  -e API_ORIGIN=https://api-staging-25e9.up.railway.app \
  -e API_UPSTREAM=https://api-staging-25e9.up.railway.app \
  emoj-frontend
```

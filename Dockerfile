# Static site image for Railway: Astro builds the site, Caddy serves it.
#
# Vercel ignores this file; it only matters on Railway, where the service's
# builder is set to Dockerfile. Caddy reproduces what vercel.ts configures on
# Vercel: security headers, the /api rewrite to the backend and the cache
# rules (tests/caddyfile.test.ts keeps the two in sync). See
# docs/deploy-railway.md.

FROM node:22.23.2-alpine3.23 AS build

WORKDIR /app

# pnpm at the version pinned in package.json (packageManager).
RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Read at build time (Railway passes service variables as build args).
# PUBLIC_API_URL must be reachable: pages fetch projects and news from it
# and the build fails otherwise.
ARG PUBLIC_SITE_URL=https://emoj.cl
ARG PUBLIC_API_URL
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_API_URL=$PUBLIC_API_URL \
    PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY

RUN test -n "$PUBLIC_API_URL" || (echo "PUBLIC_API_URL is required" >&2 && exit 1)
RUN pnpm build

FROM caddy:2-alpine AS runtime

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv

# Railway sets PORT; 8080 when running the image locally.
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider "http://127.0.0.1:${PORT}/" || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

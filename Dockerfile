# Site image for Railway: the Astro Node server behind Caddy.
#
# Vercel ignores this file; it only matters on Railway, where the service's
# builder is set to Dockerfile. Caddy serves the pages built ahead of time,
# reproduces what vercel.ts configures on Vercel (security headers,
# redirects, the /api rewrite, cache rules; tests/caddyfile.test.ts keeps
# them in sync) and passes the rest to the Astro server, which renders the
# pages with API content on every request. See docs/deploy-railway.md.

FROM node:22.23.2-alpine3.23 AS base
WORKDIR /app
# pnpm at the version pinned in package.json (packageManager).
RUN corepack enable
COPY package.json pnpm-lock.yaml ./

# Runtime dependencies only (sharp and what the server bundle imports).
# Cached until the lockfile changes.
FROM base AS prod-deps
RUN pnpm install --prod --frozen-lockfile

FROM base AS build
RUN pnpm install --frozen-lockfile
COPY . .

# Read at build time (Railway passes service variables as build args).
# The pages with API content render at request time, but PUBLIC_* values
# are compiled into the server, so they are set here.
ARG PUBLIC_SITE_URL=https://emoj.cl
ARG PUBLIC_API_URL
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_API_URL=$PUBLIC_API_URL \
    PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY

RUN test -n "$PUBLIC_API_URL" || (echo "PUBLIC_API_URL is required" >&2 && exit 1)
RUN pnpm build

FROM node:22.23.2-alpine3.23 AS runtime
COPY --from=caddy:2-alpine /usr/bin/caddy /usr/bin/caddy

WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY Caddyfile /etc/caddy/Caddyfile
COPY scripts/start.sh ./start.sh

# Railway sets PORT (Caddy); 8080 when running the image locally. The
# Astro server listens on 127.0.0.1:$NODE_PORT and is reached only through
# Caddy. Resized images are cached in /tmp (src/lib/image-cache.ts).
ENV NODE_ENV=production \
    PORT=8080 \
    NODE_PORT=4321 \
    XDG_CONFIG_HOME=/tmp/caddy-config \
    XDG_DATA_HOME=/tmp/caddy-data
EXPOSE 8080
USER node

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --spider "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["./start.sh"]

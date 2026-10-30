# Site image for Railway: the static build served by Caddy.
#
# Vercel ignores this file; it only matters on Railway, where the service's
# builder is set to Dockerfile. `pnpm build` writes every page to dist/ (no
# server, no API), and Caddy serves those files with the headers, redirects
# and cache rules of vercel.ts (tests/caddyfile.test.ts keeps them in sync).
# See docs/deploy-railway.md.

FROM node:22.23.2-alpine3.23 AS build
WORKDIR /app
# pnpm at the version pinned in package.json (packageManager).
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .

# Canonical address compiled into the pages (Railway passes service
# variables as build args).
ARG PUBLIC_SITE_URL=https://emoj.cl
ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL
RUN pnpm build

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /app/dist

# Railway sets PORT; 8080 when running the image locally.
ENV PORT=8080 \
    XDG_CONFIG_HOME=/tmp/caddy-config \
    XDG_DATA_HOME=/tmp/caddy-data
EXPOSE 8080
USER nobody

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --spider "http://127.0.0.1:${PORT}/healthz" || exit 1

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]

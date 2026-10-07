# emoj_frontend

Public website of **EMOJ Consultora** ([emoj.cl](https://emoj.cl)), a Chilean civil engineering firm. Tagline: _Humanizamos la ingeniería_.

The site is built with Astro and deployed on Vercel: most pages are static, and the pages that show projects and news are rendered on demand and cached, so a change made in the admin panel is on the site in seconds. Content comes from a separate Go API, [emoj_backend](https://github.com/dmmtdeveloper/emoj_backend).

> Status: Phase 12 "Public site", slice 2. Layout, home, services (content collection), contact form wired to the API, projects and news read from the API at build time, the Nosotros page, SEO and security headers.

## Stack

| Concern         | Choice                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | [Astro](https://astro.build) 7, `output: "static"` + `@astrojs/vercel` (ISR for content pages)                                                                        |
| Styling         | Tailwind CSS 4 via `@tailwindcss/vite`, design tokens as CSS custom properties                                                                                        |
| Font            | Urbanist 400/500/600, self-hosted with `@fontsource/urbanist`                                                                                                         |
| Icons           | [`@lucide/astro`](https://lucide.dev) (stroke 1.75, size 20 or 24)                                                                                                    |
| Language        | TypeScript, `astro/tsconfigs/strictest`                                                                                                                               |
| Tests           | Vitest                                                                                                                                                                |
| Lint / format   | ESLint (typescript-eslint, eslint-plugin-astro + jsx-a11y rules), Prettier                                                                                            |
| Hosting         | Vercel, configured in [`vercel.ts`](./vercel.ts) (`@vercel/config`); or Railway as a Node server behind Caddy, see [docs/deploy-railway.md](./docs/deploy-railway.md) |
| Package manager | pnpm (see `packageManager` in `package.json`), Node 22 (`.nvmrc`)                                                                                                     |

## Getting started

```sh
pnpm install
cp .env.example .env
pnpm dev
```

## Scripts

| Script              | What it does                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev`          | Start the dev server.                                                                    |
| `pnpm build`        | Build into `.vercel/output/` (static pages, the on-demand function, sitemap, CSP check). |
| `pnpm preview`      | Serve the production build locally.                                                      |
| `pnpm check`        | Type-check `.astro` and TypeScript files (`astro check`).                                |
| `pnpm lint`         | Run ESLint.                                                                              |
| `pnpm format`       | Format all files with Prettier.                                                          |
| `pnpm format:check` | Verify formatting without writing.                                                       |
| `pnpm test`         | Run unit tests once (`vitest run`).                                                      |
| `pnpm tokens`       | Regenerate `src/styles/tokens.css` from `design/tokens.json`.                            |
| `pnpm tokens:check` | Fail if `src/styles/tokens.css` is out of date (used in CI).                             |
| `pnpm api:types`    | Generate API types from `../emoj_backend/openapi.yaml` into `src/lib/api/schema.d.ts`.   |

## Design tokens

```
design/tokens.json  ->  scripts/build-tokens.mjs  ->  src/styles/tokens.css  ->  Tailwind theme
```

- `design/tokens.json` is the source of truth in this repo, copied verbatim from the EMOJ design system. Edit it there first, then copy it here.
- `scripts/build-tokens.mjs` validates the document and writes `src/styles/tokens.css`:
  - Every color, spacing, radius and shadow token as a CSS custom property (`--surface`, `--plum-950`, `--space-4`, `--radius-md`, `--shadow-sm`). Light values live in `:root`.
  - Dark values apply under `@media (prefers-color-scheme: dark)` unless the page sets `data-theme="light"`, and always under `:root[data-theme="dark"]`.
  - A Tailwind `@theme inline` block that exposes semantic colors (`bg-surface`, `text-ink`, `bg-brand`, `text-on-brand`, ...), brand scales (`plum|brick|sage|sand-50..950`), radii (`rounded-md`, `rounded-signature`) and `font-sans`. Tailwind's default color palette and radii are reset, so only brand values exist as utilities.
  - Values like `"{brick-700}"` are aliases and compile to `var(--brick-700)`. Unknown or circular aliases, missing themes, invalid or duplicate names and missing semantic colors fail the build.
- `src/styles/tokens.css` is generated but committed. Never edit it by hand: run `pnpm tokens`. A unit test and the CI step `pnpm tokens:check` fail when it is stale.
- In components, use semantic tokens (`surface`, `ink`, `brand`, ...), not the raw scales. The signature shape is the `radius-signature` utility (`border-radius: 50px 0 0 50px`, equivalent to `rounded-l-signature`). Never use `rounded-signature` alone: the brand rule is left corners only.
- Shadows are theme-aware variables. Use them as `shadow-(--shadow-sm)` / `shadow-(--shadow-md)`; Tailwind's own `shadow-sm` utility does not follow the dark theme.

Global styles live in `src/styles/global.css` (Tailwind, tokens, fonts, base styles, focus ring, native cross-document view transitions and reduced-motion handling).

## Environment variables

Copy `.env.example` to `.env`. Only `PUBLIC_*` variables are exposed to the client.

| Variable                    | Example                    | Purpose                                                                                                                                                 |
| --------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC_SITE_URL`           | `https://emoj.cl`          | Canonical origin for URLs, Open Graph, sitemap.                                                                                                         |
| `PUBLIC_API_URL`            | `http://localhost:8080`    | Base URL of the EMOJ Go API, read by the pages rendered on demand (projects and news).                                                                  |
| `REVALIDATE_TOKEN`          | 32+ random characters      | Secret (server only, set it in Vercel). Lets `/admin/revalidar` refresh cached pages after a change in the panel. Without it, pages refresh every hour. |
| `PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` | Cloudflare Turnstile site key for the contact form. Defaults to Cloudflare's always-passing test key.                                                   |

## Content from the API (rendered on demand)

Projects and news are not in this repo: the editor publishes them in the admin panel and the API serves them. The pages that show them (home, `/proyectos`, `/noticias` and their pages and details, and `/sitemap-content.xml`) have `prerender = false`. On Vercel they are rendered on the first visit and kept cached (ISR); on Railway the Node server renders them on every request (no page cache, so nothing to refresh). Everything else is built ahead of time. `astro.config.mjs` picks the adapter: `@astrojs/vercel` when `VERCEL=1` (set by Vercel), `@astrojs/node` anywhere else.

```
panel saves or publishes -> API -> panel POSTs /admin/revalidar -> those pages are rendered again and cached (seconds)
```

- **Refresh (Vercel):** `src/pages/admin/revalidar.ts` checks the editor's session against the API (`/v1/auth/me`) and asks again for every page that shows the item (`src/lib/content/revalidation.ts`) with the `x-prerender-revalidate` header and `REVALIDATE_TOKEN`; Vercel replaces the cached copy. The panel then shows a dialog saying the change is live (or, if the refresh failed, that it shows within the hour). Cached pages also expire after an hour as a fallback. On the Node server it only checks the session and answers right away (`refreshPolicy`).
- `src/lib/content/source.ts` reads the API with the typed client. Create a source per page render (`contentSource()`), never share one across requests: it memoizes.
- **Failure policy:** if the API answers with an error or is unreachable, the page answers 503 with a short notice and `Cache-Control: no-store` (`src/middleware.ts`), so the cache keeps the last good version. A slug the API does not know rewrites to `/no-encontrada` (the 404 page, status 404).
- **Empty states:** a valid empty list is not an error. `/proyectos` and `/noticias` show an empty state with links to services and contact, and the home hides "Proyectos destacados" until a project is featured.
- **Rebuilds:** no longer needed for content. If the backend still has `VERCEL_DEPLOY_HOOK_URL`, each change also triggers a full deploy, which is harmless but empties the page cache; remove it once `REVALIDATE_TOKEN` works. On Railway, remove `RAILWAY_FRONTEND_TOKEN` from the API for the same reason: a redeploy is not needed for content anymore.
- **Images:** the API returns presigned URLs that expire (6 h by default), so pages never point at them. They use `/media/{proyectos|noticias}/{slug}/{key}` (`src/lib/content/media.ts`): the key is a hash of the object's path, and the route streams that image of that published item from the bucket. `src/lib/image-service.ts` makes `<Image>` resize those addresses through `/_image` (WebP, with srcset; a 1200×630 JPEG for Open Graph), and `src/middleware.ts` lets Vercel's CDN keep every size for a year. The Node server has no CDN, so the middleware keeps each size on disk instead (`src/lib/image-cache.ts`, `IMAGE_CACHE_MAX_MB`, 512 by default), and `src/lib/image-endpoint.ts` loads `/media/...` in-process because Astro's Node endpoint only reads files from disk. No remote image patterns are allowed, so CSP `img-src 'self'` keeps working.
- **Rich text:** news bodies are TipTap JSON. `src/lib/content/tiptap.ts` renders the same allowlist as the API (paragraphs, headings 2-4, lists, blockquotes, breaks, rules; bold, italic, underline, strike and http/https/mailto links) with every text and attribute escaped and unknown nodes dropped. External links get `rel="noopener noreferrer"`. Body images only carry a media ID in the public API, so they are not rendered yet (backend follow-up: resolve them to URLs).
- `/proyectos` renders every project; the service and region chips are a progressive enhancement (`src/scripts/project-filter.ts`, a same-origin module). They reserve their space from the first paint (no layout shift); without JavaScript `public/noscript.css` hides them and all projects stay visible. With it, the URL keeps `?servicio=&region=` so filtered views can be shared.
- `/noticias` shows 12 articles per page (`/noticias/pagina/2`, ...).

To see realistic content locally, run the backend with its dev seed (`go run ./cmd/seed` in emoj_backend, see its README) and start `pnpm dev` with `PUBLIC_API_URL=http://localhost:8080`. `pnpm build` also renders a few on-demand pages through the built function for the CSP check; it skips them with a warning when the API is down.

The team on `/nosotros` is static data in `src/lib/team.ts` with photos in `src/assets/team/` (resized to 800px, JPEG quality 82); people without a photo get an initials avatar.

## API contract

The API is defined in `openapi.yaml` in [emoj_backend](https://github.com/dmmtdeveloper/emoj_backend). With both repos checked out side by side, run `pnpm api:types` to generate TypeScript types in `src/lib/api/schema.d.ts`; the script fails if `../emoj_backend/openapi.yaml` is missing.

The generated file **is committed**, because Vercel and CI only check out this repo. Whenever the backend contract changes, regenerate it, run `pnpm check && pnpm test`, and commit it in the same change that adapts the frontend. Never edit it by hand.

`src/lib/api/client.ts` is a small typed `fetch` wrapper built on those types. It never throws: every call resolves to `{ ok: true, data }`, a typed RFC 9457 problem (`kind: "problem"`, with `errors[]` on 422 and `retryAfter` on 429) or a network error (`kind: "network"`).

## Security headers

`vercel.ts` sets a strict Content-Security-Policy (no `'unsafe-inline'`, no `'unsafe-eval'`), HSTS with preload and the usual hardening headers. The CSP works because `astro.config.mjs` never inlines scripts or stylesheets (`build.inlineStylesheets: "never"`, `vite.build.assetsInlineLimit: 0`): keep it that way, and never add `is:inline` executable scripts. `connect-src` allows the origin of `PUBLIC_API_URL` when Vercel exposes it while compiling `vercel.ts`, plus the staging API as a fallback; add the production API origin there if it differs. Turnstile needs `https://challenges.cloudflare.com` in `script-src` and `frame-src`. Run `npx @vercel/config validate` after editing. The `Caddyfile` (Railway) must send the same headers; `tests/caddyfile.test.ts` checks it.

## Project layout

```
design/          design tokens source (tokens.json)
public/          favicons, web manifest, robots.txt
scripts/         build scripts (token generator)
src/assets/      brand SVGs, optimized photos and team portraits (rendered with astro:assets)
src/content/     services content collection (one Markdown file per API service slug)
src/components/  UI components (layout, home, services, projects, news, about, contact, ui)
src/lib/         API client and types, build-time content fetchers, TipTap renderer, team data,
                 site facts, contact form rules, structured data
src/layouts/     page layouts (BaseLayout: SEO, social, favicons, skip link)
src/pages/       routes (home, servicios, proyectos, noticias, nosotros, contacto, 404)
src/scripts/     small browser modules (project filter, copy link)
src/styles/      global.css and generated tokens.css
tests/           unit tests
```

## Conventions

- UI copy is Spanish (neutral, addressing the reader as "tú"). Code, comments and docs are English.
- Conventional commits.

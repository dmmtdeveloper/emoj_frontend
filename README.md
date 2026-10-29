# emoj_frontend

Public website of **EMOJ Consultora** ([emoj.cl](https://emoj.cl)), a Chilean civil engineering firm. Tagline: _Humanizamos la ingeniería_.

The site is built with Astro and is fully static: every page, including every project and news article, is built ahead of time from files in this repository. There is no backend, no API and no admin panel. **Content is edited in `src/content/*` and published by a git push**: the push triggers a new build and deploy.

> Status: static site. Layout, home, services, projects and news (content collections), a contact page with direct channels (WhatsApp, email, phone; there is no contact form), the Nosotros page, SEO and security headers.

## Stack

| Concern         | Choice                                                                                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework       | [Astro](https://astro.build) 7, `output: "static"`, no adapter (every page is built ahead of time)                                                                      |
| Styling         | Tailwind CSS 4 via `@tailwindcss/vite`, design tokens as CSS custom properties                                                                                          |
| Font            | Urbanist 400/500/600, self-hosted with `@fontsource/urbanist`                                                                                                           |
| Icons           | [`@lucide/astro`](https://lucide.dev) (stroke 1.75, size 20 or 24)                                                                                                      |
| Language        | TypeScript, `astro/tsconfigs/strictest`                                                                                                                                 |
| Tests           | Vitest                                                                                                                                                                  |
| Lint / format   | ESLint (typescript-eslint, eslint-plugin-astro + jsx-a11y rules), Prettier                                                                                              |
| Hosting         | Vercel, configured in [`vercel.ts`](./vercel.ts) (`@vercel/config`); or Railway, Caddy serving the static files, see [docs/deploy-railway.md](./docs/deploy-railway.md) |
| Package manager | pnpm (see `packageManager` in `package.json`), Node 22 (`.nvmrc`)                                                                                                       |

## Getting started

```sh
pnpm install
cp .env.example .env
pnpm dev
```

## Scripts

| Script              | What it does                                                                       |
| ------------------- | ---------------------------------------------------------------------------------- |
| `pnpm dev`          | Start the dev server.                                                              |
| `pnpm build`        | Build the static site into `dist/` (pages, optimised images, sitemaps, CSP check). |
| `pnpm preview`      | Serve the production build locally.                                                |
| `pnpm check`        | Type-check `.astro` and TypeScript files (`astro check`).                          |
| `pnpm lint`         | Run ESLint.                                                                        |
| `pnpm format`       | Format all files with Prettier.                                                    |
| `pnpm format:check` | Verify formatting without writing.                                                 |
| `pnpm test`         | Run unit tests once (`vitest run`).                                                |
| `pnpm tokens`       | Regenerate `src/styles/tokens.css` from `design/tokens.json`.                      |
| `pnpm tokens:check` | Fail if `src/styles/tokens.css` is out of date (used in CI).                       |

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

| Variable          | Example           | Purpose                                         |
| ----------------- | ----------------- | ----------------------------------------------- |
| `PUBLIC_SITE_URL` | `https://emoj.cl` | Canonical origin for URLs, Open Graph, sitemap. |

The build needs no network and no secrets.

## Content: editing and publishing

Projects and news are [content collections](https://docs.astro.build/en/guides/content-collections/), typed in `src/content.config.ts`. Each item is one Markdown file named after its slug, and the slug is its address:

| What      | File                              | Photos                         | Page                |
| --------- | --------------------------------- | ------------------------------ | ------------------- |
| Project   | `src/content/proyectos/<slug>.md` | `src/assets/proyectos/<slug>/` | `/proyectos/<slug>` |
| Article   | `src/content/noticias/<slug>.md`  | `src/assets/noticias/<slug>/`  | `/noticias/<slug>`  |
| Service   | `src/content/servicios/<slug>.md` | `src/assets/photos/`           | `/servicios/<slug>` |
| Home hero | `src/lib/content/home-hero.ts`    | `src/assets/photos/`           | `/`                 |

To publish, edit or add the file (and its photos), run the checks in `CLAUDE.md`, commit and push. Vercel (or Railway) builds and deploys the new version; there is nothing else to refresh.

- **Projects** keep everything in the frontmatter: `title`, `slug`, `client`, `location`, `region`, optional `year`, `services` (service slugs), `summary`, optional `magnitude` (`label`, `value`, `unit`), `featured`, `publishedAt`, `cover`, `challenge`/`solution`/`result` (plain text, blank lines between paragraphs; empty hides the section), `gallery` and `seo` (`title`, `description`, optional `ogImage`). The body is unused.
- **News** have `title`, `slug`, `excerpt`, `category` (empty for none), optional `location`, `publishedAt`, `cover`, `gallery` and `seo` in the frontmatter; the Markdown body is the article (headings `##` to `####`, lists, quotes, bold, italic, links).
- **Photos** are `{ src, alt }` pairs; `src` is relative to the Markdown file (`../../assets/proyectos/<slug>/portada.jpg`). `astro:assets` resizes them at build time (WebP with `srcset`, a 1200×630 JPEG for Open Graph), so commit the original photo, not a pre-resized copy. The build fails if a photo is missing or has no `alt`.
- **Order:** listings are newest first by `publishedAt`; on the home rail, featured projects come first.
- A file must be named after its `slug`; the build fails otherwise (`src/lib/content/collections.ts`).
- `/proyectos` renders every project; the service and region chips are a progressive enhancement (`src/scripts/project-filter.ts`, a same-origin module). They reserve their space from the first paint (no layout shift); without JavaScript `public/noscript.css` hides them and all projects stay visible. With it, the URL keeps `?servicio=&region=` so filtered views can be shared.
- `/noticias` shows 12 articles per page (`/noticias/pagina/2`, ...).
- `/sitemap-content.xml` lists the home, the listings and every project and article, with `publishedAt` as `lastmod`; `@astrojs/sitemap` lists the other pages.

The current projects and news were exported once from the former EMOJ API (October 2026), photos included; that API and its admin panel are retired.

The team on `/nosotros` is static data in `src/lib/team.ts` with photos in `src/assets/team/` (resized to 800px, JPEG quality 82); people without a photo get an initials avatar.

## Security headers

`vercel.ts` sets a strict Content-Security-Policy (no `'unsafe-inline'`, no `'unsafe-eval'`), HSTS with preload and the usual hardening headers. The CSP works because `astro.config.mjs` never inlines scripts or stylesheets (`build.inlineStylesheets: "never"`, `vite.build.assetsInlineLimit: 0`): keep it that way, and never add `is:inline` executable scripts. `img-src` and `connect-src` allow only the site's own origin: photos are optimised at build time and the site calls no API. The site loads no third-party scripts (`script-src 'self'`) and no frames (`frame-src 'none'`). Run `npx @vercel/config validate` after editing. The `Caddyfile` (Railway) must send the same headers and redirects; `tests/caddyfile.test.ts` checks it. `pnpm build` ends with `scripts/check-csp.mjs`, which fails if any built page has inline scripts or styles.

## Project layout

```
design/          design tokens source (tokens.json)
public/          favicons, web manifest, robots.txt
scripts/         build scripts (token generator, CSP check)
src/assets/      brand SVGs, photos (site, projects, news) and team portraits (rendered with astro:assets)
src/content/     content collections: servicios, proyectos, noticias (one Markdown file per slug)
src/components/  UI components (layout, home, services, projects, news, about, ui)
src/lib/         content readers and helpers, team data, site facts, privacy policy data,
                 structured data
src/layouts/     page layouts (BaseLayout: SEO, social, favicons, skip link)
src/pages/       routes (home, servicios, proyectos, noticias, nosotros, contacto, 404)
src/scripts/     small browser modules (project filter, copy link)
src/styles/      global.css and generated tokens.css
tests/           unit tests
```

## Conventions

- UI copy is Spanish (neutral, addressing the reader as "tú"). Code, comments and docs are English.
- Conventional commits.

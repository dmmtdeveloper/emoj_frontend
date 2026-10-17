# emoj_frontend — agent guide

Astro site for emoj.cl (static, deployed on Vercel) plus the admin panel (React island under `/admin`, later phases). The API lives in [emoj_backend](https://github.com/dmmtdeveloper/emoj_backend).

## Precedence

1. The user's instructions.
2. This file and the EMOJ design system (`design/tokens.json`, brand book in the design-system artifact).
3. Installed skills in `.claude/skills/` (installed with `npx autoskills`). They are generic: when a skill contradicts the design system or the rules below, the design system wins. In particular, `frontend-design` must not introduce new palettes, fonts or "bold" aesthetics outside the brand tokens.

## Design rules

- Use semantic tokens only (`bg-surface`, `text-ink`, `bg-brand`, `text-on-brand`, `bg-accent`, `text-on-accent`…). Never hard-code hex colors or use Tailwind's default palette (it is reset in the theme).
- Forbidden pairs: cream/white text on `accent` (1.69:1), `brand` on `surface-inverse`/plum (2.24:1), `brand` on `accent` below 24px (4.17:1).
- Font: Urbanist 400/500/600. Body ≥ 16px, left-aligned, max ~65ch; never justified.
- Data font: Space Grotesk 400/500/600 (`font-data`), only for figures and data labels (hero facts, project sheets, numbers); never for headings, body copy or buttons.
- Signature shape: `rounded-l-signature` (50px on the left corners only).
- Icons: `@lucide/astro` in the site; `lucide-react` only inside the admin island.
- Tagline: "Acercamos la ingeniería" (the one in the official `vertical-tagline-*` files).
- Logos: the official files are in `design/brand/oficial/` (see its README). Build marks from their geometry, never redraw them; fine stroke (`recorte`) for large sizes, `bold` for small ones. The `vertical-tagline-*` files carry the tagline and may be used. Brand pattern tile: `public/brand/patron.svg` (`.brand-pattern`).

## Home chapters

- The home (below the hero) is a sequence of pinned chapters built with `src/components/home/chapters/Chapter.astro` (head, scene, body) and animated with anime.js, the same pattern as the deividportfolio site: each scene builds one timeline authored against `SCENE_LENGTH` (10000) through `scrubbedScene()` in `src/scripts/chapters/scrub.ts`, which scrubs it with the scroll, reveals the copy and adds the desktop focus.
- A fast scroll cannot skip the chapters: on mouse and trackpad, Lenis plus the gates in `src/scripts/chapters/scroll-gate.ts` (logic in `src/lib/motion/scroll-gate.ts`) stop each wheel burst at the next chapter's start and, inside a chapter, cap the pace (`chapterPace`: slower steps, a short lead over the scroll); on touch, CSS `scroll-snap-stop` does the same (`chapters.css`). Keyboard, scrollbar and anchors stay native.
- Scenes are decorative (`aria-hidden`) unless they hold content (stage captions, the team photo); the chapter body carries the real text and links. Without the `data-scenes` mark (no JS, reduced motion) every scene must read complete at rest.

## Code rules

- UI copy in Spanish (neutral, "tú"); code, comments, identifiers and docs in English.
- Strict TDD for logic: write the failing test first.
- Before committing: `pnpm format:check && pnpm lint && pnpm check && pnpm test && pnpm tokens:check && pnpm build`.
- Conventional commits, no AI attribution lines.
- Regenerate API types with `pnpm api:types` after the backend `openapi.yaml` changes; never hand-edit them.

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
- Signature shape: `rounded-l-signature` (50px on the left corners only).
- Icons: `@lucide/astro` in the site; `lucide-react` only inside the admin island.
- Tagline: "Humanizamos la ingeniería".

## Code rules

- UI copy in Spanish (neutral, "tú"); code, comments, identifiers and docs in English.
- Strict TDD for logic: write the failing test first.
- Before committing: `pnpm format:check && pnpm lint && pnpm check && pnpm test && pnpm tokens:check && pnpm build`.
- Conventional commits, no AI attribution lines.
- Regenerate API types with `pnpm api:types` after the backend `openapi.yaml` changes; never hand-edit them.

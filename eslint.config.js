// @ts-check
import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import { defineConfig, globalIgnores } from "eslint/config";
import jsxA11y from "eslint-plugin-jsx-a11y-x";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores([
    "dist/",
    ".astro/",
    ".vercel/",
    "node_modules/",
    "coverage/",
    "src/lib/api/schema.d.ts",
  ]),
  js.configs.recommended,
  tseslint.configs.strict,
  tseslint.configs.stylistic,
  astro.configs["flat/recommended"],
  // Accessibility rules for .astro templates (backed by eslint-plugin-jsx-a11y-x,
  // the ESLint 10 compatible fork of eslint-plugin-jsx-a11y).
  astro.configs["flat/jsx-a11y-strict"],
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // Admin React island: hooks rules and the same strict a11y rules.
  {
    files: ["src/admin/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat["recommended-latest"],
  },
  { ...jsxA11y.configs.strict, files: ["src/admin/**/*.tsx"] },
);

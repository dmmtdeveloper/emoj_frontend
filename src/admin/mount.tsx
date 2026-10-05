/**
 * Starts the panel. Pages render an empty `#admin-root` with the page and
 * its data in `data-*` attributes, and load this module as a regular
 * same-origin script (AdminMount.astro). Astro's `client:only` islands need
 * small inline scripts, which the site's Content-Security-Policy
 * (`script-src 'self'`, vercel.ts) blocks in production.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminApp, { ADMIN_PAGES, type AdminPage } from "./AdminApp";

function isAdminPage(value: string | undefined): value is AdminPage {
  return (ADMIN_PAGES as readonly string[]).includes(value ?? "");
}

function readTitles(raw: string | undefined): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

const root = document.getElementById("admin-root");
const page = root?.dataset["page"];
if (root && isAdminPage(page)) {
  createRoot(root).render(
    <StrictMode>
      <AdminApp
        page={page}
        serviceTitles={readTitles(root.dataset["serviceTitles"])}
      />
    </StrictMode>,
  );
}

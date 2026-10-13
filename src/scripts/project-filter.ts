import {
  matchesFilter,
  readFilter,
  writeFilter,
  type FilterState,
} from "../lib/content/project-filter";

function parseList(value: string | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === "string")
      : [];
  } catch {
    return [];
  }
}

function projectsLabel(count: number): string {
  return count === 1 ? "1 proyecto" : `${count} proyectos`;
}

/** Wire the /proyectos filter, if present on the page. */
export function initProjectFilters(): void {
  const root = document.querySelector<HTMLElement>("[data-project-filters]");
  if (!root) return;

  const items = [...document.querySelectorAll<HTMLElement>("[data-project]")];
  const buttons = [
    ...root.querySelectorAll<HTMLButtonElement>("button[data-filter]"),
  ];
  const status = root.querySelector<HTMLElement>("[data-filter-status]");
  const empty = document.querySelector<HTMLElement>("[data-filter-empty]");
  const reset = document.querySelector<HTMLButtonElement>(
    "[data-filter-reset]",
  );
  const options = {
    services: parseList(root.dataset["services"]),
    regions: parseList(root.dataset["regions"]),
  };

  let state: FilterState = readFilter(window.location.search, options);

  function apply(updateUrl: boolean): void {
    let visible = 0;
    for (const item of items) {
      const match = matchesFilter(
        {
          services: (item.dataset["services"] ?? "").split(" "),
          region: item.dataset["region"] ?? "",
        },
        state,
      );
      item.hidden = !match;
      if (match) visible++;
    }
    for (const button of buttons) {
      const key = button.dataset["filter"] === "region" ? "region" : "service";
      button.setAttribute(
        "aria-pressed",
        String(state[key] === (button.dataset["value"] ?? "")),
      );
    }
    if (status) {
      const filtered = state.service !== "" || state.region !== "";
      status.textContent = filtered
        ? `Mostrando ${projectsLabel(visible)} de ${items.length}.`
        : `${projectsLabel(items.length)}.`;
    }
    if (empty) empty.hidden = visible > 0;
    if (updateUrl) {
      const url = `${window.location.pathname}${writeFilter(window.location.search, state)}${window.location.hash}`;
      window.history.replaceState(null, "", url);
    }
  }

  /**
   * Apply a new filter, letting the cards glide to their new places and the
   * new ones rise in (motion.css `.vt-filtering`, `[data-entering]`). Without
   * View Transitions or with reduced motion the grid just updates.
   */
  let latest: ViewTransition | null = null;

  function change(next: FilterState): void {
    state = next;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!document.startViewTransition || reduced) {
      apply(true);
      return;
    }
    const shown = new Set(items.filter((item) => !item.hidden));
    const page = document.documentElement;
    page.classList.add("vt-filtering");
    const transition = document.startViewTransition(() => {
      apply(true);
      for (const item of items) {
        if (!item.hidden && !shown.has(item)) item.dataset["entering"] = "";
      }
    });
    latest = transition;
    // A click during the glide starts a new one; only the last cleans up.
    void transition.finished.finally(() => {
      if (latest !== transition) return;
      latest = null;
      page.classList.remove("vt-filtering");
      for (const item of items) delete item.dataset["entering"];
    });
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const key = button.dataset["filter"] === "region" ? "region" : "service";
      change({ ...state, [key]: button.dataset["value"] ?? "" });
    });
  }
  reset?.addEventListener("click", () => {
    change({ service: "", region: "" });
  });

  root.classList.remove("invisible");
  apply(false);
}

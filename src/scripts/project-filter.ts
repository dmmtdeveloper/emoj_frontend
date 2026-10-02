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

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const key = button.dataset["filter"] === "region" ? "region" : "service";
      state = { ...state, [key]: button.dataset["value"] ?? "" };
      apply(true);
    });
  }
  reset?.addEventListener("click", () => {
    state = { service: "", region: "" };
    apply(true);
  });

  root.classList.remove("invisible");
  apply(false);
}

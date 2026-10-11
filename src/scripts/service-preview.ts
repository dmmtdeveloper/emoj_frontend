/**
 * /servicios on desktop: the sticky frame beside the services index shows
 * a real project of the row under the pointer or keyboard focus. Rows carry
 * `data-svc-row="<slug>"`, frames and captions `data-svc-frame="<slug>"`;
 * the visible ones get `data-on`. A row without a photo keeps the last one.
 * Without JavaScript the first photo stays.
 */
function init(): void {
  const index = document.querySelector<HTMLElement>("[data-svc-index]");
  if (!index) return;
  const frames = [...index.querySelectorAll<HTMLElement>("[data-svc-frame]")];
  if (frames.length === 0) return;
  const known = new Set(frames.map((f) => f.dataset["svcFrame"]));

  const show = (slug: string | undefined): void => {
    if (!slug || !known.has(slug)) return;
    for (const frame of frames) {
      frame.toggleAttribute("data-on", frame.dataset["svcFrame"] === slug);
    }
  };

  for (const row of index.querySelectorAll<HTMLElement>("[data-svc-row]")) {
    const slug = row.dataset["svcRow"];
    row.addEventListener("pointerenter", () => show(slug));
    row.addEventListener("focusin", () => show(slug));
  }
}

init();

// A module, so `init` stays local to this file.
export {};

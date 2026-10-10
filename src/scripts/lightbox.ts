/**
 * Full-screen viewer for a project gallery ([slug].astro): each photo is a
 * button that opens the native <dialog> (focus is contained, Escape closes
 * it and focus returns to the photo). Arrows and the keyboard's left and
 * right keys move through the photos (src/lib/motion/lightbox.ts).
 */
import { stepIndex } from "../lib/motion/lightbox";

function init(): void {
  const dialog = document.querySelector<HTMLDialogElement>("[data-lightbox]");
  const items = [
    ...document.querySelectorAll<HTMLButtonElement>("[data-lightbox-item]"),
  ];
  if (!dialog || items.length === 0) return;
  const image = dialog.querySelector<HTMLImageElement>("[data-lightbox-image]");
  const count = dialog.querySelector<HTMLElement>("[data-lightbox-count]");
  const total = String(items.length).padStart(2, "0");
  let index = 0;
  let opener: HTMLButtonElement | null = null;

  const show = (i: number) => {
    index = stepIndex(i, 0, items.length);
    const item = items[index];
    if (!item || !image) return;
    image.src = item.dataset["full"] ?? "";
    image.alt = item.dataset["alt"] ?? "";
    if (count) {
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${total}`;
    }
  };

  items.forEach((item, i) => {
    item.addEventListener("click", () => {
      opener = item;
      show(i);
      dialog.showModal();
    });
  });

  dialog
    .querySelector("[data-lightbox-prev]")
    ?.addEventListener("click", () => show(stepIndex(index, -1, items.length)));
  dialog
    .querySelector("[data-lightbox-next]")
    ?.addEventListener("click", () => show(stepIndex(index, 1, items.length)));
  dialog
    .querySelector("[data-lightbox-close]")
    ?.addEventListener("click", () => dialog.close());

  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") show(stepIndex(index, -1, items.length));
    if (event.key === "ArrowRight") show(stepIndex(index, 1, items.length));
  });
  // A click on the dark backdrop (not the photo or a control) closes it.
  dialog.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    if (target === dialog || target.tagName === "FIGURE") dialog.close();
  });
  dialog.addEventListener("close", () => opener?.focus());
}

init();

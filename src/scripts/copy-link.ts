/**
 * "Copiar enlace" buttons (`[data-copy-link]`): rendered hidden and revealed
 * only when the Clipboard API is available. The result is announced in the
 * sibling `[data-copy-status]` live region.
 */
export function initCopyLinks(): void {
  if (!navigator.clipboard) return;
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "button[data-copy-link]",
  )) {
    const status =
      button.parentElement?.querySelector<HTMLElement>("[data-copy-status]");
    button.hidden = false;
    button.addEventListener("click", async () => {
      const url = button.dataset["copyLink"] ?? window.location.href;
      try {
        await navigator.clipboard.writeText(url);
        if (status) status.textContent = "Enlace copiado.";
      } catch {
        if (status) status.textContent = "No pudimos copiar el enlace.";
      }
    });
  }
}

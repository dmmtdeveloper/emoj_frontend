/**
 * Classes for the last item of a grid with two columns from `sm` and three
 * from `lg`, so it fills the empty cells of its row instead of leaving a
 * lone card with holes beside it. Written out in full for Tailwind.
 */
export function lastItemSpan(count: number): string {
  if (count <= 0) return "";
  const sm = count % 2 === 1 ? "sm:col-span-2" : "";
  const rest = count % 3;
  const lg =
    rest === 1
      ? "lg:col-span-3"
      : rest === 2
        ? "lg:col-span-2"
        : sm
          ? "lg:col-span-1"
          : "";
  return [sm, lg].filter(Boolean).join(" ");
}

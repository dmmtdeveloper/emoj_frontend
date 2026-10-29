/**
 * Chapter numbers for the home ("02 Servicios"), computed from the chapters
 * actually rendered, in order, so a chapter left out (the projects reel
 * without published projects) never leaves a gap. The hero is the implicit
 * 01, so the first chapter is 02.
 */
export function chapterNumbers<Id extends string>(
  ids: readonly Id[],
  first = 2,
): Record<Id, string> {
  const numbers = {} as Record<Id, string>;
  ids.forEach((id, i) => {
    numbers[id] = String(first + i).padStart(2, "0");
  });
  return numbers;
}

/** Sort MCQ options A→B→C… (by leading label) or alphabetically by text. */
export function sortQuizOptions(options: string[]): string[] {
  const copy = [...options];
  copy.sort((a, b) => {
    const keyA = optionSortKey(a);
    const keyB = optionSortKey(b);
    if (keyA !== keyB) {
      return keyA.localeCompare(keyB, undefined, { sensitivity: "base" });
    }
    return a.localeCompare(b, undefined, { sensitivity: "base" });
  });
  return copy;
}

function optionSortKey(option: string): string {
  const trimmed = option.trim();
  const match = /^([A-Z])[\).:\-\s]/i.exec(trimmed);
  if (match) {
    return match[1].toUpperCase();
  }
  return trimmed.toLowerCase();
}

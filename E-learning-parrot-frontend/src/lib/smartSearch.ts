export function tokenizeSearch(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function matchesSmartSearch(
  query: string,
  ...haystacks: Array<string | number | null | undefined | boolean>
): boolean {
  const tokens = tokenizeSearch(query);
  if (tokens.length === 0) return true;

  const haystack = haystacks
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");

  return tokens.every((token) => haystack.includes(token));
}

export function filterBySmartSearch<T>(
  items: T[],
  query: string,
  getHaystacks: (item: T) => Array<string | number | null | undefined | boolean>
): T[] {
  const list = Array.isArray(items) ? items : [];
  if (!query.trim()) return list;
  return list.filter((item) => matchesSmartSearch(query, ...getHaystacks(item)));
}

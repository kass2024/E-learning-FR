export function starburstPoints(
  outerR: number,
  innerR: number,
  points: number,
  cx: number,
  cy: number,
): string {
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    coords.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return coords.join(" ");
}

export function formatStarBannerExpiry(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isStarBannerExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return false;
  return Date.now() >= end;
}

/** Single source of truth for brand logo assets in public/ */
export const LOGO = {
  src: "/logo.png",
  alt: "F&R Rwanda Ltd",
  /** Bump when replacing logo.png to bust browser favicon cache */
  version: "1",
} as const;

export function logoUrl(path: string = LOGO.src): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${LOGO.version}`;
}

export const FAVICONS = {
  ico: "/favicon.ico",
  png16: "/favicon-16x16.png",
  png32: "/favicon-32x32.png",
  apple: "/apple-touch-icon.png",
} as const;

import { FAVICONS, LOGO, logoUrl } from "./brandLogo";

/** Ensures tab icon and PWA manifest always use the Xander logo (with cache bust). */
export function applyBrandIcons(): void {
  const head = document.head;
  if (!head) return;

  const iconDefs: Array<{ rel: string; href: string; sizes?: string; type?: string }> = [
    { rel: "icon", href: logoUrl(LOGO.src), type: "image/png" },
    { rel: "icon", href: logoUrl(FAVICONS.png32), sizes: "32x32", type: "image/png" },
    { rel: "icon", href: logoUrl(FAVICONS.png16), sizes: "16x16", type: "image/png" },
    { rel: "apple-touch-icon", href: logoUrl(FAVICONS.apple), sizes: "180x180" },
    { rel: "shortcut icon", href: logoUrl(LOGO.src), type: "image/png" },
  ];

  for (const def of iconDefs) {
    const selector = `link[rel="${def.rel}"]${def.sizes ? `[sizes="${def.sizes}"]` : ""}`;
    let link = head.querySelector(selector) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = def.rel;
      if (def.sizes) link.sizes = def.sizes;
      head.appendChild(link);
    }
    if (def.type) link.type = def.type;
    link.href = def.href;
  }

  let manifest = head.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
  if (!manifest) {
    manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = "/site.webmanifest";
    head.appendChild(manifest);
  }
}

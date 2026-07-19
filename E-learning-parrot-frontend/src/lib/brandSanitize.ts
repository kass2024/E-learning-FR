import { HUB } from "./hubConfig";

const LEGACY_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /parrot\s*global\s*study\s*academy/gi, replacement: HUB.name },
  { pattern: /parrot\s*canada\s*visa\s*consultant/gi, replacement: HUB.company },
  { pattern: /parrotglobalstudyacademy/gi, replacement: HUB.name },
];

/** Replace legacy Parrot branding in any visible UI string. */
export function sanitizeLegacyBrandText(text: string | null | undefined): string {
  if (!text?.trim()) return "";
  let result = text.trim();
  for (const { pattern, replacement } of LEGACY_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }
  return result.trim();
}

function titleCaseFromEmailLocal(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .replace(/[._+-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Person name for navbar/profile — never show legacy org names. */
export function formatUserDisplayName(
  name: string | null | undefined,
  email?: string | null
): string {
  const trimmed = (name ?? "").trim();

  if (/parrot/i.test(trimmed)) {
    const fromEmail = email ? titleCaseFromEmailLocal(email) : "";
    if (fromEmail) return fromEmail;
    return sanitizeLegacyBrandText(trimmed) || HUB.name;
  }

  const sanitized = sanitizeLegacyBrandText(trimmed);
  if (sanitized) return sanitized;

  if (email) {
    const fromEmail = titleCaseFromEmailLocal(email);
    if (fromEmail) return fromEmail;
  }

  return "User";
}

export function normalizeLegacyLoginEmail(email: string | null | undefined): string {
  const trimmed = (email ?? "").trim().toLowerCase();
  if (!trimmed) return "";

  const aliases: Record<string, string> = {
    "infos@parrotglobalstudyacademy.ca": "frwanda19juillet2020@gmail.com",
    "admin@parrot.com": "frwanda19juillet2020@gmail.com",
  };

  return aliases[trimmed] ?? trimmed;
}

export function getAppDisplayName(): string {
  const fromEnv = import.meta.env.VITE_APP_NAME?.trim();
  if (fromEnv) return sanitizeLegacyBrandText(fromEnv) || HUB.name;
  return HUB.name;
}

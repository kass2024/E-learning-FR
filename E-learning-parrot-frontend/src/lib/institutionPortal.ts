import type { CSSProperties } from "react";
import type { PlatformInstitutionInfo } from "@/api/axios";

export type InstitutionPortalFeature = {
  title: string;
  description: string;
};

export type InstitutionPortalContent = {
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  about: string;
  primary_color: string | null;
  accent_color?: string | null;
  hero_bg_color?: string | null;
  button_bg_color?: string | null;
  button_text_color?: string | null;
  features: InstitutionPortalFeature[];
  hero_image_url: string | null;
  cta_label: string;
};

export type InstitutionPortalProgram = {
  id: number;
  name: string;
  description?: string | null;
  status?: string;
  courses?: Array<{
    id: number;
    title: string;
    description?: string | null;
    duration?: string | null;
    price?: number | string | null;
  }>;
};

export type InstitutionPortalPayload = {
  institution: PlatformInstitutionInfo & { portal?: InstitutionPortalContent };
  programs: InstitutionPortalProgram[];
  stats: {
    programs_count: number;
    courses_count: number;
  };
};

export type InstitutionPortalTheme = {
  primary: string;
  accent: string;
  heroBg: string;
  buttonBg: string;
  buttonText: string;
  primaryDark: string;
};

export const DEFAULT_PORTAL_PRIMARY = "#0070D0";
export const DEFAULT_PORTAL_ACCENT = "#0EA5E9";
export const DEFAULT_PORTAL_BUTTON_TEXT = "#FFFFFF";

export function isValidPortalHex(color: string | null | undefined): boolean {
  return Boolean(color && /^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?([0-9A-Fa-f]{2})?$/.test(color.trim()));
}

export function normalizePortalHex(color: string | null | undefined, fallback: string): string {
  const trimmed = color?.trim() ?? "";
  if (isValidPortalHex(trimmed)) {
    return trimmed.toUpperCase();
  }
  return fallback.toUpperCase();
}

/** Darken a #RRGGBB color for hover / depth. */
export function darkenHex(hex: string, amount = 0.18): string {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.slice(0, 6);
  if (!/^[0-9A-Fa-f]{6}$/.test(full)) return hex;
  const num = parseInt(full, 16);
  const r = Math.max(0, Math.round(((num >> 16) & 255) * (1 - amount)));
  const g = Math.max(0, Math.round(((num >> 8) & 255) * (1 - amount)));
  const b = Math.max(0, Math.round((num & 255) * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

export function resolvePortalPrimary(institution: PlatformInstitutionInfo | null | undefined): string {
  return normalizePortalHex(institution?.portal?.primary_color, DEFAULT_PORTAL_PRIMARY);
}

export function resolvePortalTheme(institution: PlatformInstitutionInfo | null | undefined): InstitutionPortalTheme {
  const portal = institution?.portal;
  const primary = normalizePortalHex(portal?.primary_color, DEFAULT_PORTAL_PRIMARY);
  const accent = normalizePortalHex(portal?.accent_color, DEFAULT_PORTAL_ACCENT);
  const heroBg = normalizePortalHex(portal?.hero_bg_color, primary);
  const buttonBg = normalizePortalHex(portal?.button_bg_color, primary);
  const buttonText = normalizePortalHex(portal?.button_text_color, DEFAULT_PORTAL_BUTTON_TEXT);

  return {
    primary,
    accent,
    heroBg,
    buttonBg,
    buttonText,
    primaryDark: darkenHex(primary),
  };
}

export function portalThemeStyle(themeOrPrimary: InstitutionPortalTheme | string): CSSProperties {
  const theme =
    typeof themeOrPrimary === "string"
      ? {
          primary: themeOrPrimary,
          accent: DEFAULT_PORTAL_ACCENT,
          heroBg: themeOrPrimary,
          buttonBg: themeOrPrimary,
          buttonText: DEFAULT_PORTAL_BUTTON_TEXT,
          primaryDark: darkenHex(themeOrPrimary),
        }
      : themeOrPrimary;

  return {
    ["--institution-primary" as string]: theme.primary,
    ["--institution-primary-dark" as string]: theme.primaryDark,
    ["--institution-accent" as string]: theme.accent,
    ["--institution-hero-bg" as string]: theme.heroBg,
    ["--institution-button-bg" as string]: theme.buttonBg,
    ["--institution-button-text" as string]: theme.buttonText,
  };
}

export type PortalColorDraft = {
  primary_color: string;
  accent_color: string;
  hero_bg_color: string;
  button_bg_color: string;
  button_text_color: string;
};

export function emptyPortalColorDraft(portal?: InstitutionPortalContent | null): PortalColorDraft {
  const primary = normalizePortalHex(portal?.primary_color, DEFAULT_PORTAL_PRIMARY);
  return {
    primary_color: primary,
    accent_color: normalizePortalHex(portal?.accent_color, DEFAULT_PORTAL_ACCENT),
    hero_bg_color: normalizePortalHex(portal?.hero_bg_color, primary),
    button_bg_color: normalizePortalHex(portal?.button_bg_color, primary),
    button_text_color: normalizePortalHex(portal?.button_text_color, DEFAULT_PORTAL_BUTTON_TEXT),
  };
}

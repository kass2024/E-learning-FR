import { HUB } from "@/lib/hubConfig";

export type HubBrandColors = {
  primary: string;
  primaryDark: string;
  accent: string;
};

/** F&R Rwanda — green primary, black accents (Busuu-inspired language school). */
export function hubBrand(): HubBrandColors {
  const label = `${HUB.name} ${HUB.company}`.toLowerCase();
  const isParrotCanada =
    label.includes("parrot canada") ||
    label.includes("parrot global study academy") ||
    label.includes("parrotglobalstudyacademy");

  if (isParrotCanada) {
    return {
      primary: "#012F6B",
      primaryDark: "#0a3d7a",
      accent: "#E01C21",
    };
  }

  return {
    primary: "#1F8A4C",
    primaryDark: "#166B3A",
    accent: "#0B0B0B",
  };
}

export const HUB = {
  name: "F&R Rwanda",
  company: "F&R Rwanda Ltd",
  slogan: "Learn Today. Master Tomorrow. Succeed Globally.",
  tagline: "New language, new opportunities, new you — English, French, and Kinyarwanda online.",
  supportEmail: "frwanda19juillet2020@gmail.com",
  supportPhone: "+250 788 821 579",
  tiktok: "@frrwandaltd",
} as const;

export const EXAM_CATEGORIES = [] as const;

export const LANGUAGE_CATEGORIES = [
  "English (Academic, Business, General)",
  "French (Conversation & DELF/DALF)",
  "Kinyarwanda",
] as const;


export const PLATFORM_USERS = [
  {
    id: 24,
    name: "F&R Rwanda Admin",
    email: "info@frwanda.com",
    role: "admin",
    description: "Full platform access — users, courses, payments, Zoom, reports.",
  },
] as const;

export type HubRole =
  | "learner"
  | "instructor"
  | "admin"
  | "staff"
  | "meeting_user"
  | "partner_company";

export function dashboardPathForRole(role: string): string {
  switch (role) {
    case "admin":
    case "staff":
    case "partner_company":
      return "/dashboard/admin";
    case "instructor":
      return "/dashboard/instructor";
    case "meeting_user":
      return "/dashboard/appointments";
    default:
      return "/dashboard/learner";
  }
}

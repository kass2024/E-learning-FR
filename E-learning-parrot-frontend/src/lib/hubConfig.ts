export const HUB = {
  name: "F&R Rwanda",
  company: "F&R Rwanda Ltd",
  slogan: "Learn Today. Master Tomorrow. Succeed Globally.",
  tagline: "School of Fluency and Proficiency — quality language education at affordable prices.",
  supportEmail: "frwanda19juillet2020@gmail.com",
  supportPhone: "+250 788 821 579",
  tiktok: "@frrwandaltd",
} as const;

export const EXAM_CATEGORIES = [
  "IELTS Preparation",
  "TOEFL Preparation",
  "DELF / DALF",
  "TCF / TEF",
  "Cambridge English",
] as const;

export const LANGUAGE_CATEGORIES = [
  "English (Academic, Business, General)",
  "French (DELF/DALF)",
  "Kinyarwanda",
] as const;

export const PLATFORM_USERS = [
  {
    id: 24,
    name: "F&R Rwanda Admin",
    email: "frwanda19juillet2020@gmail.com",
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

export type CommonTimezone = {
  code: string;
  name: string;
  offset: string;
  iana: string;
  label: string;
};

/** Searchable timezone list for scheduling (East Africa first, then global). */
export const COMMON_TIMEZONES: CommonTimezone[] = [
  {
    code: "CAT-RW",
    name: "Kigali",
    offset: "UTC+2",
    iana: "Africa/Kigali",
    label: "Kigali, Rwanda (UTC+2)",
  },
  {
    code: "EAT-KE",
    name: "Nairobi",
    offset: "UTC+3",
    iana: "Africa/Nairobi",
    label: "Nairobi, Kenya (UTC+3)",
  },
  {
    code: "EAT-TZ",
    name: "Dar es Salaam",
    offset: "UTC+3",
    iana: "Africa/Dar_es_Salaam",
    label: "Dar es Salaam, Tanzania (UTC+3)",
  },
  {
    code: "EAT-UG",
    name: "Kampala",
    offset: "UTC+3",
    iana: "Africa/Kampala",
    label: "Kampala, Uganda (UTC+3)",
  },
  {
    code: "EAT-ET",
    name: "Addis Ababa",
    offset: "UTC+3",
    iana: "Africa/Addis_Ababa",
    label: "Addis Ababa, Ethiopia (UTC+3)",
  },
  {
    code: "EAT",
    name: "East Africa Time",
    offset: "UTC+3",
    iana: "Africa/Nairobi",
    label: "EAT - East Africa Time (UTC+3)",
  },
  {
    code: "CAT",
    name: "Central Africa Time",
    offset: "UTC+2",
    iana: "Africa/Harare",
    label: "CAT - Central Africa Time (UTC+2)",
  },
  {
    code: "WAT",
    name: "West Africa Time",
    offset: "UTC+1",
    iana: "Africa/Lagos",
    label: "WAT - West Africa Time (UTC+1)",
  },
  {
    code: "SAST",
    name: "Johannesburg",
    offset: "UTC+2",
    iana: "Africa/Johannesburg",
    label: "Johannesburg, South Africa (UTC+2)",
  },
  {
    code: "UTC",
    name: "Coordinated Universal Time",
    offset: "UTC+0",
    iana: "Etc/UTC",
    label: "UTC - Coordinated Universal Time (UTC+0)",
  },
  {
    code: "GMT",
    name: "Greenwich Mean Time",
    offset: "UTC+0",
    iana: "Europe/London",
    label: "GMT - London (UTC+0 / BST)",
  },
  {
    code: "CET",
    name: "Central European Time",
    offset: "UTC+1",
    iana: "Europe/Berlin",
    label: "CET - Central Europe (UTC+1)",
  },
  {
    code: "EET",
    name: "Eastern European Time",
    offset: "UTC+2",
    iana: "Europe/Athens",
    label: "EET - Eastern Europe (UTC+2)",
  },
  {
    code: "GST",
    name: "Gulf Standard Time",
    offset: "UTC+4",
    iana: "Asia/Dubai",
    label: "GST - Gulf Standard Time (UTC+4)",
  },
  {
    code: "IST",
    name: "India Standard Time",
    offset: "UTC+5:30",
    iana: "Asia/Kolkata",
    label: "IST - India (UTC+5:30)",
  },
  {
    code: "CST",
    name: "Central Standard Time",
    offset: "UTC-6",
    iana: "America/Chicago",
    label: "CST - US Central (UTC-6)",
  },
  {
    code: "EST",
    name: "Eastern Standard Time",
    offset: "UTC-5",
    iana: "America/New_York",
    label: "EST - US Eastern (UTC-5)",
  },
  {
    code: "MST",
    name: "Mountain Standard Time",
    offset: "UTC-7",
    iana: "America/Denver",
    label: "MST - US Mountain (UTC-7)",
  },
  {
    code: "PST",
    name: "Pacific Standard Time",
    offset: "UTC-8",
    iana: "America/Los_Angeles",
    label: "PST - US Pacific (UTC-8)",
  },
  {
    code: "JST",
    name: "Japan Standard Time",
    offset: "UTC+9",
    iana: "Asia/Tokyo",
    label: "JST - Japan (UTC+9)",
  },
  {
    code: "AEST",
    name: "Australian Eastern",
    offset: "UTC+10",
    iana: "Australia/Sydney",
    label: "AEST - Sydney (UTC+10)",
  },
];

export function timezoneLabel(iana: string): string {
  return COMMON_TIMEZONES.find((tz) => tz.iana === iana)?.label ?? iana;
}

export function resolveDefaultTimezone(): string {
  try {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (device && COMMON_TIMEZONES.some((tz) => tz.iana === device)) {
      return device;
    }
    if (device) return device;
  } catch {
    /* ignore */
  }
  return "Africa/Nairobi";
}

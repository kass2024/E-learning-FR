import { getApiBaseUrl } from "@/lib/apiConfig";

/** Prefer calling getApiBaseUrl() at request time so production host mapping works. */
export const API_URLS = {
  get profile() {
    return `${getApiBaseUrl()}/auth/profile`;
  },
  get changePassword() {
    return `${getApiBaseUrl()}/auth/change-password`;
  },
  get avatar() {
    return `${getApiBaseUrl()}/auth/avatar`;
  },
};

export const API_BASE_URL = typeof window !== "undefined" ? getApiBaseUrl() : "/api/admin";

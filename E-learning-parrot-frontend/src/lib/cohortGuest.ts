export function isValidGuestEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function extractApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return fallback;

  if (typeof data.message === "string" && data.message.trim()) {
    return data.message;
  }

  const errors = data.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") {
      return first[0];
    }
  }

  return fallback;
}

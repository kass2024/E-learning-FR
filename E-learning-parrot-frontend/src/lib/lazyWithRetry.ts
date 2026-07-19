import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const CHUNK_RELOAD_KEY = "parrot_chunk_reload_once";

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /dynamically imported module|loading chunk|failed to fetch/i.test(message);
}

/** Lazy import with retries — recovers from stale CDN/browser caches after deploy. */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  retries = 2,
): LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const module = await factory();
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        return module;
      } catch (error) {
        lastError = error;
        if (!isChunkLoadError(error) || attempt >= retries) break;

        if (attempt === retries - 1 && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
          sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
          window.location.reload();
          await new Promise<void>(() => undefined);
        }

        await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
      }
    }

    throw lastError;
  });
}

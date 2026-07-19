import type { ZoomEmbeddedClient } from "@/components/live/zoomMeetingClient";
import { loadZoomEmbeddedModule } from "@/lib/zoomEmbeddedLoader";

let teardownChain: Promise<void> = Promise.resolve();

/** Wait until any in-flight embedded Zoom session has fully torn down. */
export function waitForZoomEmbeddedTeardown(): Promise<void> {
  return teardownChain;
}

/** Queue async teardown so the next init/join never overlaps the previous session. */
export function chainZoomEmbeddedTeardown(teardown: () => Promise<void>): void {
  teardownChain = teardownChain.then(teardown).catch(() => undefined);
}

/** Fully leave and destroy the embedded client (required before a new join). */
export async function destroyEmbeddedZoomClient(client: ZoomEmbeddedClient | null): Promise<void> {
  const ZoomMtgEmbedded = await loadZoomEmbeddedModule();

  if (!client) {
    try {
      ZoomMtgEmbedded.destroyClient?.();
    } catch {
      // ignore
    }
    await delay(350);
    return;
  }

  try {
    client.leaveMeeting?.();
  } catch {
    // ignore
  }

  try {
    ZoomMtgEmbedded.destroyClient?.();
  } catch {
    // ignore
  }

  await delay(450);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function clearZoomEmbeddedRoot(root: HTMLElement | null): void {
  if (!root) return;
  try {
    root.replaceChildren();
  } catch {
    root.innerHTML = "";
  }
}

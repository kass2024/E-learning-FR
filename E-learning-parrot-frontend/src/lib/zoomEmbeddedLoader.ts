import type { ZoomEmbeddedClient } from "@/components/live/zoomMeetingClient";

type ZoomEmbeddedModule = {
  createClient: () => ZoomEmbeddedClient;
  destroyClient?: () => void;
};

let modulePromise: Promise<ZoomEmbeddedModule> | null = null;

/** Lazy-load the Zoom embedded SDK (~3 MB) only when a meeting starts. */
export function loadZoomEmbeddedModule(): Promise<ZoomEmbeddedModule> {
  if (!modulePromise) {
    modulePromise = import("@zoom/meetingsdk/embedded").then(
      (mod) => mod.default as ZoomEmbeddedModule,
    );
  }
  return modulePromise;
}

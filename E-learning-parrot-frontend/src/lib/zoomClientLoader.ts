import type { ZoomMtg as ZoomMtgNamespace } from "@zoom/meetingsdk";

let preparePromise: Promise<typeof ZoomMtgNamespace> | null = null;

/**
 * Client View — Step 1 from Zoom SDK docs:
 * https://marketplacefront.zoom.us/sdk/meeting/web/components/index.html
 */
export function loadZoomClientSdk(): Promise<typeof ZoomMtgNamespace> {
  if (!preparePromise) {
    preparePromise = import("@zoom/meetingsdk").then((mod) => {
      mod.ZoomMtg.preLoadWasm();
      mod.ZoomMtg.prepareWebSDK();
      return mod.ZoomMtg;
    });
  }
  return preparePromise;
}

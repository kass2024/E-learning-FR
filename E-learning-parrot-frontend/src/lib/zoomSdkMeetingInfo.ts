import { loadZoomClientSdk } from "@/lib/zoomClientLoader";
import type { ZoomEmbeddedClient } from "@/components/live/zoomMeetingClient";

/** Meeting details shown in Zoom SDK info panels (Client + Component view). */
export const ZOOM_SDK_MEETING_INFO = [
  "topic",
  "host",
  "mn",
  "pwd",
  "telPwd",
  "invite",
  "participant",
  "dc",
  "enctype",
  "report",
] as const;

export type ZoomSdkMeetingInfoSnapshot = Record<string, unknown>;

export function fetchZoomClientMeetingInfo(): Promise<ZoomSdkMeetingInfoSnapshot | null> {
  return loadZoomClientSdk().then(
    (ZoomMtg) =>
      new Promise((resolve) => {
        try {
          ZoomMtg.getCurrentMeetingInfo({
            success: (info: ZoomSdkMeetingInfoSnapshot) => resolve(info ?? null),
            error: () => resolve(null),
          });
        } catch {
          resolve(null);
        }
      }),
  );
}

export function readZoomEmbeddedMeetingInfo(
  client: ZoomEmbeddedClient | null | undefined,
): ZoomSdkMeetingInfoSnapshot | null {
  if (!client?.getCurrentMeetingInfo) return null;
  try {
    const info = client.getCurrentMeetingInfo();
    return info && typeof info === "object" ? (info as ZoomSdkMeetingInfoSnapshot) : null;
  } catch {
    return null;
  }
}

export function cacheZoomMeetingInfo(context: string, info: ZoomSdkMeetingInfoSnapshot | null): void {
  if (!info || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      "parrot_zoom_meeting_info",
      JSON.stringify({ context, fetchedAt: Date.now(), info }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export async function captureZoomClientMeetingInfo(context: string): Promise<ZoomSdkMeetingInfoSnapshot | null> {
  const info = await fetchZoomClientMeetingInfo();
  cacheZoomMeetingInfo(context, info);
  return info;
}

export function captureZoomEmbeddedMeetingInfo(
  client: ZoomEmbeddedClient | null | undefined,
  context: string,
): ZoomSdkMeetingInfoSnapshot | null {
  const info = readZoomEmbeddedMeetingInfo(client);
  cacheZoomMeetingInfo(context, info);
  return info;
}

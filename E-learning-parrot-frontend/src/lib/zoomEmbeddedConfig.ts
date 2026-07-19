import type { ZoomMeetingSdkAuth } from "@/api/axios";
import type { ZoomEmbeddedClient } from "@/components/live/zoomMeetingClient";
import { maxGalleryVideosForViewport } from "@/components/live/zoomMeetingClient";
import { ZOOM_SDK_MEETING_INFO } from "@/lib/zoomSdkMeetingInfo";

/**
 * Component View init — matches Zoom Meeting SDK docs Step 4:
 * https://marketplacefront.zoom.us/sdk/meeting/web/components/index.html
 *
 * zoomAppRoot renders the native toolbar AND main panel inside one container.
 */
export function buildZoomEmbeddedInitOptions(zoomAppRoot: HTMLElement) {
  return {
    zoomAppRoot,
    language: "en-US" as const,
    patchJsMedia: true,
    leaveOnPageUnload: true,
    maximumVideosInGalleryView: maxGalleryVideosForViewport(),
    customize: {
      meetingInfo: [...ZOOM_SDK_MEETING_INFO],
    },
  };
}

/**
 * Component View join — docs Step 3 parameters:
 * signature, meetingNumber, password, userName, userEmail.
 * Embedded same-account host uses role=1 signature only (no ZAK — SDK returns "Token error").
 */
export function buildZoomEmbeddedJoinOptions(
  sdk: ZoomMeetingSdkAuth,
  joinPassword: string,
  isHost: boolean,
): Parameters<ZoomEmbeddedClient["join"]>[0] {
  return {
    signature: sdk.signature,
    meetingNumber: String(sdk.meeting_number),
    password: joinPassword,
    userName: sdk.user_name,
    ...(sdk.user_email ? { userEmail: sdk.user_email } : {}),
  };
}

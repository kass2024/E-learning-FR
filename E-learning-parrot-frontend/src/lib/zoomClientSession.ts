import type { ZoomMeetingSdkAuth } from "@/api/axios";
import { loadZoomClientSdk } from "@/lib/zoomClientLoader";
import { ZOOM_SDK_MEETING_INFO, captureZoomClientMeetingInfo } from "@/lib/zoomSdkMeetingInfo";

let clientInitPromise: Promise<void> | null = null;
let joinedSessionKey: string | null = null;
let joinInFlight: Promise<void> | null = null;

export function zoomClientLeaveUrl(): string {
  return `${window.location.origin}/meeting-ended`;
}

/** Zoom Client View mounts into #zmmtg-root (required by Meeting SDK). */
export function showZoomClientRoot(): void {
  let root = document.getElementById("zmmtg-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "zmmtg-root";
    document.body.prepend(root);
  }
  root.style.display = "block";
}

export function hideZoomClientRoot(): void {
  const root = document.getElementById("zmmtg-root");
  if (root) root.style.display = "none";
}

function joinPasswordCandidates(sdk: ZoomMeetingSdkAuth): string[] {
  const fromApi = Array.isArray(sdk.password_candidates) ? sdk.password_candidates : [];
  const ordered = [sdk.password ?? "", ...fromApi].map((v) => String(v ?? "").trim());
  const unique = [...new Set(ordered.filter((v) => v !== ""))];
  if (unique.length === 0) unique.push("");
  return unique;
}

function zoomErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Zoom meeting error";
  const e = err as { reason?: string; message?: string; errorCode?: number };
  return e.reason || e.message || "Zoom meeting error";
}

function sessionKey(sdk: ZoomMeetingSdkAuth, isHost: boolean): string {
  return `${sdk.meeting_number}:${sdk.signature}:${isHost ? "host" : "guest"}`;
}

function initClient(leaveUrl: string): Promise<void> {
  if (clientInitPromise) return clientInitPromise;

  clientInitPromise = loadZoomClientSdk().then(
    (ZoomMtg) =>
      new Promise<void>((resolve, reject) => {
        showZoomClientRoot();

        ZoomMtg.inMeetingServiceListener("onMeetingStatus", (data: { status?: number }) => {
          if (data?.status === 3 && joinedSessionKey) {
            joinedSessionKey = null;
          }
        });

        ZoomMtg.init({
          leaveUrl,
          patchJsMedia: true,
          leaveOnPageUnload: true,
          showPureSharingContent: true,
          meetingInfo: [...ZOOM_SDK_MEETING_INFO],
          success: () => resolve(),
          error: (err) => {
            clientInitPromise = null;
            reject(new Error(zoomErrorMessage(err)));
          },
        });
      }),
  );

  return clientInitPromise;
}

function joinOnce(
  sdk: ZoomMeetingSdkAuth,
  isHost: boolean,
  passWord: string,
): Promise<void> {
  return loadZoomClientSdk().then(
    (ZoomMtg) =>
      new Promise<void>((resolve, reject) => {
        let settled = false;
        const finish = (fn: () => void) => {
          if (settled) return;
          settled = true;
          fn();
        };

        const timeout = window.setTimeout(() => {
          finish(() => reject(new Error("Timed out connecting to the Zoom meeting.")));
        }, 120_000);

        const statusHandler = (data: { status?: number }) => {
          if (data?.status === 2) {
            window.clearTimeout(timeout);
            finish(() => resolve());
          } else if (data?.status === 3) {
            window.clearTimeout(timeout);
            finish(() => reject(new Error("Disconnected from the Zoom meeting.")));
          }
        };

        ZoomMtg.inMeetingServiceListener("onMeetingStatus", statusHandler);

        /* Fallback if status=2 never fires (some SDK builds). */
        const joinSuccessFallback = window.setTimeout(() => {
          window.clearTimeout(timeout);
          finish(() => resolve());
        }, 800);

        ZoomMtg.join({
          signature: sdk.signature,
          meetingNumber: String(sdk.meeting_number),
          userName: sdk.user_name,
          passWord,
          ...(sdk.user_email ? { userEmail: sdk.user_email } : {}),
          // Same-account embedded host: role=1 signature only — never pass ZAK (SDK returns "Token error").
          success: () => {
            window.clearTimeout(joinSuccessFallback);
            window.clearTimeout(timeout);
            finish(() => resolve());
          },
          error: (err) => {
            window.clearTimeout(joinSuccessFallback);
            window.clearTimeout(timeout);
            finish(() => reject(new Error(zoomErrorMessage(err))));
          },
        });
      }),
  );
}

/** Client View init + join (embedded same-account host uses role=1 signature, no ZAK). */
export async function startZoomClientMeeting(
  sdk: ZoomMeetingSdkAuth,
  isHost: boolean,
): Promise<void> {
  const key = sessionKey(sdk, isHost);
  if (joinedSessionKey === key) return;
  if (joinInFlight) return joinInFlight;

  const leaveUrl = zoomClientLeaveUrl();

  joinInFlight = (async () => {
    await initClient(leaveUrl);

    const passwords = joinPasswordCandidates(sdk);
    let lastError = "Failed to join the Zoom meeting.";

    for (const passWord of passwords) {
      try {
        await joinOnce(sdk, isHost, passWord);
        joinedSessionKey = key;
        void captureZoomClientMeetingInfo(isHost ? "client-host" : "client-guest");
        return;
      } catch (err) {
        lastError = err instanceof Error ? err.message : lastError;
        if (!/password|passcode|wrong/i.test(lastError)) {
          throw new Error(lastError);
        }
      }
    }

    throw new Error(lastError);
  })();

  try {
    await joinInFlight;
  } finally {
    joinInFlight = null;
  }
}

export function isZoomClientMeetingJoined(): boolean {
  return joinedSessionKey !== null;
}

export function resetZoomClientSession(force = false): void {
  if (!force && joinedSessionKey) return;
  joinedSessionKey = null;
  clientInitPromise = null;
  joinInFlight = null;
  hideZoomClientRoot();
}

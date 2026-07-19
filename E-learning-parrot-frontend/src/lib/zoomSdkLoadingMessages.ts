export type ZoomSdkLoadingPhase =
  | "preparing"
  | "loading-sdk"
  | "connecting"
  | "joining"
  | "waiting-host";

const PHASE_MESSAGES: Record<ZoomSdkLoadingPhase, string[]> = {
  preparing: [
    "Preparing your session…",
    "Fetching meeting credentials…",
    "Setting up the live room…",
  ],
  "loading-sdk": [
    "Loading Zoom meeting client…",
    "Initializing video & audio…",
    "Almost ready to connect…",
  ],
  connecting: [
    "Connecting to the meeting…",
    "Securing your connection…",
    "Joining the room…",
  ],
  joining: [
    "Joining meeting…",
    "Starting camera and microphone…",
    "Entering the session…",
  ],
  "waiting-host": [
    "Waiting for the host to start…",
    "You'll enter as soon as the host is live…",
    "Stay on this page — connecting automatically…",
  ],
};

export function pickZoomLoadingMessage(phase: ZoomSdkLoadingPhase, tick: number): string {
  const messages = PHASE_MESSAGES[phase];
  return messages[tick % messages.length] ?? messages[0];
}

export function zoomLoadingHeadline(phase: ZoomSdkLoadingPhase, isHost?: boolean): string {
  switch (phase) {
    case "preparing":
      return isHost ? "Starting live session" : "Preparing to join";
    case "loading-sdk":
      return "Loading Zoom";
    case "connecting":
      return "Connecting";
    case "joining":
      return isHost ? "Starting as host" : "Joining meeting";
    case "waiting-host":
      return "Waiting for host";
    default:
      return "Please wait";
  }
}

import type ZoomMtgEmbedded from "@zoom/meetingsdk/embedded";
import type { MediaDevicePreferences } from "@/hooks/useMediaDevices";

export type ZoomEmbeddedClient = ReturnType<typeof ZoomMtgEmbedded.createClient>;
export type ZoomParticipant = ReturnType<ZoomEmbeddedClient["getAttendeeslist"]>[number];
export type MeetingViewMode = "speaker" | "gallery" | "active";

export const ZOOM_MEETING_TOOLBAR_HEIGHT = 76;
export const ZOOM_MEETING_TOPBAR_HEIGHT = 44;
/** Hidden native SDK footer still reserves layout space inside the mount node. */
export const ZOOM_NATIVE_FOOTER_HEIGHT = 72;

export function isMobileZoomViewport(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 640 || window.matchMedia("(pointer: coarse)").matches;
}

export function maxGalleryVideosForViewport(): number {
  return isMobileZoomViewport() ? 2 : 9;
}

export function readZoomParticipants(client: ZoomEmbeddedClient): ZoomParticipant[] {
  try {
    return client.getAttendeeslist?.() ?? [];
  } catch {
    return [];
  }
}

export function participantIsInWaitingRoom(participant: ZoomParticipant): boolean {
  return Boolean(participant.isHold ?? participant.bHold);
}

export function readInMeetingParticipants(client: ZoomEmbeddedClient): ZoomParticipant[] {
  return readZoomParticipants(client).filter((p) => !participantIsInWaitingRoom(p));
}

export function readWaitingRoomParticipants(client: ZoomEmbeddedClient): ZoomParticipant[] {
  return readZoomParticipants(client).filter(participantIsInWaitingRoom);
}

export function readWaitingRoomCount(client: ZoomEmbeddedClient): number {
  return readWaitingRoomParticipants(client).length;
}

export function readCurrentZoomUser(client: ZoomEmbeddedClient): ZoomParticipant | null {
  try {
    return client.getCurrentUser?.() ?? null;
  } catch {
    return null;
  }
}

export function anyoneIsSharing(client: ZoomEmbeddedClient): boolean {
  return readZoomParticipants(client).some((p) => Boolean(p.sharerOn));
}

/** True when the SDK is painting a large shared-screen surface. */
export function hasVisibleShareStream(root: HTMLElement | null): boolean {
  if (!root) return false;
  const stageRect = root.getBoundingClientRect();
  const minMainHeight = Math.max(stageRect.height * 0.22, 120);
  const selectors = [
    '[class*="share-view"] video',
    '[class*="ShareView"] video',
    '[class*="share-view"] canvas',
    '[class*="ShareView"] canvas',
  ];
  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 160 && rect.height > minMainHeight) return true;
    }
  }
  return false;
}

function hasShareViewingBanner(root: HTMLElement | null): boolean {
  if (!root) return false;
  const selectors = [
    '[class*="share-notice"]',
    '[class*="ShareNotice"]',
    '[class*="viewing-screen"]',
    '[class*="ViewingScreen"]',
    '[class*="sharing-notice"]',
    '[class*="SharingNotice"]',
  ];
  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) {
      const text = (el.textContent ?? "").toLowerCase();
      if (text.includes("viewing") && text.includes("screen")) return true;
    }
  }
  return false;
}

/**
 * Reliable share detection for learners whose roster may omit sharerOn.
 * Uses live SDK signals only — never latched — so host gallery is not blocked.
 */
export function resolveActiveSharing(
  client: ZoomEmbeddedClient,
  root: HTMLElement | null,
): boolean {
  if (anyoneIsSharing(client)) return true;
  if (hasVisibleShareStream(root)) return true;
  if (hasShareViewingBanner(root)) return true;
  return false;
}

export function readActiveSharer(client: ZoomEmbeddedClient): ZoomParticipant | null {
  return readZoomParticipants(client).find((p) => Boolean(p.sharerOn)) ?? null;
}

export function localUserIsSharing(client: ZoomEmbeddedClient): boolean {
  const me = readCurrentZoomUser(client);
  return Boolean(me?.sharerOn);
}

export function canUseScreenShare(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  if (isIos || isAndroid) return false;
  if (!window.isSecureContext) return false;
  return Boolean(navigator.mediaDevices?.getDisplayMedia);
}

/** Zoom SDK screen-share decode needs SharedArrayBuffer (crossOriginIsolated). */
export function isZoomScreenShareSupported(): boolean {
  if (typeof window === "undefined") return false;
  return window.crossOriginIsolated === true;
}

export function warnIfScreenShareUnsupported(): void {
  if (typeof window === "undefined" || isZoomScreenShareSupported()) return;
  console.warn(
    "[Xander Live] Screen share may show a black screen: crossOriginIsolated is false. " +
      "Ensure COOP/COEP headers are set (see public/.htaccess or vite dev server headers).",
  );
}

function sdkFooterNodes(): HTMLElement[] {
  const nodes: HTMLElement[] = [];
  for (const root of sdkRoots()) {
    for (const el of root.querySelectorAll<HTMLElement>('[class*="footer"], [class*="Footer"], footer')) {
      nodes.push(el);
    }
  }
  return nodes;
}

function repositionShareDialogs() {
  const selectors = [
    '[role="dialog"]',
    '[class*="share-picker"]',
    '[class*="SharePicker"]',
    '[class*="screen-share"]',
    '[class*="ScreenShare"]',
    '[class*="share-dialog"]',
    '[class*="ShareDialog"]',
    '[class*="share-tab"]',
    '[class*="ShareTab"]',
  ];
  const roots: ParentNode[] = [...sdkRoots()];
  if (typeof document !== "undefined" && document.body) {
    roots.push(document.body);
  }
  for (const root of roots) {
    for (const sel of selectors) {
      for (const el of root.querySelectorAll<HTMLElement>(sel)) {
        const hay = buttonHaystack(el);
        if (
          hay.includes("chat") ||
          hay.includes("participants") ||
          hay.includes("reaction") ||
          hay.includes("emoji")
        ) {
          continue;
        }
        el.style.setProperty("position", "fixed", "important");
        el.style.setProperty("left", "50%", "important");
        el.style.setProperty("top", "50%", "important");
        el.style.setProperty("transform", "translate(-50%, -50%)", "important");
        el.style.setProperty("z-index", "10050", "important");
        el.style.setProperty("opacity", "1", "important");
        el.style.setProperty("visibility", "visible", "important");
        el.style.setProperty("pointer-events", "auto", "important");
        el.style.setProperty("max-width", "min(96vw, 720px)", "important");
        el.style.setProperty("max-height", "90dvh", "important");
      }
    }
  }
}

function scheduleSharePickerReposition(durationMs = 1200) {
  const delays = [0, 40, 100, 220, 500, durationMs];
  for (const delay of delays) {
    window.setTimeout(repositionShareDialogs, delay);
  }
}

let cachedShareButton: HTMLElement | null = null;

export function warmSdkShareButton(): void {
  const btn = findSdkShareButton();
  if (btn) {
    cachedShareButton = btn;
  }
}

function resolveSdkShareButton(): HTMLElement | null {
  if (cachedShareButton && document.contains(cachedShareButton)) {
    return cachedShareButton;
  }
  const btn = findSdkShareButton();
  if (btn) {
    cachedShareButton = btn;
  }
  return btn;
}

async function withVisibleSdkFooter<T>(fn: () => Promise<T>): Promise<T> {
  const footers = sdkFooterNodes();
  const saved = footers.map((el) => ({
    el,
    style: el.getAttribute("style") ?? "",
  }));

  for (const el of footers) {
    el.style.setProperty("position", "fixed", "important");
    el.style.setProperty("left", "50%", "important");
    el.style.setProperty("bottom", "88px", "important");
    el.style.setProperty("transform", "translateX(-50%)", "important");
    el.style.setProperty("width", "auto", "important");
    el.style.setProperty("min-width", "280px", "important");
    el.style.setProperty("opacity", "1", "important");
    el.style.setProperty("visibility", "visible", "important");
    el.style.setProperty("pointer-events", "auto", "important");
    el.style.setProperty("z-index", "10040", "important");
    el.style.setProperty("background", "#232323", "important");
    el.style.setProperty("border-radius", "12px", "important");
    el.style.setProperty("padding", "8px 12px", "important");
    el.style.setProperty("box-shadow", "0 8px 32px rgba(0,0,0,0.45)", "important");
  }

  try {
    const result = await fn();
    scheduleSharePickerReposition();
    return result;
  } finally {
    window.setTimeout(() => {
      for (const { el, style } of saved) {
        if (style) el.setAttribute("style", style);
        else el.removeAttribute("style");
      }
    }, 350);
  }
}

export function findSdkShareButton(): HTMLElement | null {
  const strictKeywords = [
    "share screen",
    "screen share",
    "start share",
    "new share",
    "share my screen",
  ];

  for (const keyword of strictKeywords) {
    const hit = findSdkButton([keyword]);
    if (hit) return hit;
  }

  const footerButtons = findSdkFooterButtons();
  for (const btn of footerButtons) {
    const hay = buttonHaystack(btn);
    if (
      hay.includes("share screen") ||
      hay.includes("screen share") ||
      (hay.includes("share") && !hay.includes("stop") && !hay.includes("chat"))
    ) {
      return btn;
    }
  }

  return null;
}

export function participantDisplayName(
  participant: ZoomParticipant,
  options?: { hostName?: string | null },
): string {
  if (participant.isHost) {
    const hostName = options?.hostName?.trim();
    if (hostName) return hostName;
  }

  const name = participant.userName || participant.displayName || "";
  const trimmed = String(name).trim();
  return trimmed && trimmed !== "undefined" ? trimmed : "Participant";
}

export function participantVideoOn(participant: ZoomParticipant): boolean {
  return Boolean(participant.video ?? participant.bVideoOn);
}

export function isComputerAudioConnected(participant: ZoomParticipant): boolean {
  const audio = String(participant.audio ?? "").toLowerCase();
  if (audio === "computer") return true;
  const status = participant.audioStatus ?? participant.audioConnectionStatus;
  return status === 2;
}

export function hasVisibleSdkVideo(root: HTMLElement | null, minHeight = 64): boolean {
  if (!root) return false;
  const nodes = root.querySelectorAll("video, canvas");
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 64 && rect.height > minHeight) return true;
  }
  return false;
}

/** True when the SDK paints a large main-stage surface (not just a filmstrip tile). */
export function hasLargeMainSdkSurface(root: HTMLElement | null): boolean {
  if (!root) return false;
  const stageRect = root.getBoundingClientRect();
  const minMainHeight = Math.max(stageRect.height * 0.32, 160);

  const shareSelectors = [
    '[class*="share-view"] video',
    '[class*="ShareView"] video',
    '[class*="share-view"] canvas',
    '[class*="ShareView"] canvas',
  ];
  for (const sel of shareSelectors) {
    for (const el of root.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 120 && rect.height > minMainHeight) return true;
    }
  }

  const nodes = root.querySelectorAll("video, canvas");
  for (const node of nodes) {
    const rect = node.getBoundingClientRect();
    if (rect.width > 120 && rect.height > minMainHeight) return true;
  }

  const avatarSelectors = [
    '[class*="video-avatar"]',
    '[class*="VideoAvatar"]',
    '[class*="participant-avatar"]',
    '[class*="ParticipantAvatar"]',
    '[class*="avatar-name"]',
    '[class*="AvatarName"]',
  ];
  for (const sel of avatarSelectors) {
    for (const el of root.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 100 && rect.height > minMainHeight * 0.6) return true;
    }
  }

  return false;
}

/** True when the SDK is already painting participant UI (skip custom avatar fallback). */
export function hasVisibleSdkParticipantSurface(root: HTMLElement | null): boolean {
  return hasLargeMainSdkSurface(root);
}

export function participantsWithCameraOff(client: ZoomEmbeddedClient): ZoomParticipant[] {
  return readInMeetingParticipants(client).filter((p) => !participantVideoOn(p));
}

function sortParticipantsHostFirst(participants: ZoomParticipant[]): ZoomParticipant[] {
  return [...participants].sort((a, b) => {
    if (a.isHost && !b.isHost) return -1;
    if (!a.isHost && b.isHost) return 1;
    return 0;
  });
}

/** Camera-off tiles for custom fallback UI; can inject host when learner roster is incomplete. */
export function participantsForDisplayTiles(
  client: ZoomEmbeddedClient,
  options?: {
    hostDisplayName?: string | null;
    ensureHostVisible?: boolean;
  },
): ZoomParticipant[] {
  const cameraOff = participantsWithCameraOff(client);
  if (!options?.ensureHostVisible || cameraOff.some((p) => p.isHost)) {
    return sortParticipantsHostFirst(cameraOff);
  }

  const hostName = options.hostDisplayName?.trim();
  if (!hostName) return sortParticipantsHostFirst(cameraOff);

  const syntheticHost = {
    userId: -1,
    userName: hostName,
    displayName: hostName,
    isHost: true,
    muted: false,
    video: false,
    bVideoOn: false,
  } as ZoomParticipant;

  return sortParticipantsHostFirst([syntheticHost, ...cameraOff]);
}

export function participantsForShareRibbon(
  client: ZoomEmbeddedClient,
  options?: {
    hostDisplayName?: string | null;
    ensureHostVisible?: boolean;
  },
): ZoomParticipant[] {
  const inMeeting = readInMeetingParticipants(client);
  if (!options?.ensureHostVisible || inMeeting.some((p) => p.isHost)) {
    return sortParticipantsHostFirst(inMeeting);
  }

  const hostName = options.hostDisplayName?.trim();
  if (!hostName) return sortParticipantsHostFirst(inMeeting);

  const syntheticHost = {
    userId: -1,
    userName: hostName,
    displayName: hostName,
    isHost: true,
    muted: false,
    video: false,
    bVideoOn: false,
    sharerOn: anyoneIsSharing(client),
  } as ZoomParticipant;

  return sortParticipantsHostFirst([syntheticHost, ...inMeeting]);
}

export function learnerRosterLooksIncomplete(client: ZoomEmbeddedClient): boolean {
  const inMeeting = readInMeetingParticipants(client);
  return inMeeting.length < 2 && !inMeeting.some((p) => p.isHost);
}

export function anyParticipantVideoOn(client: ZoomEmbeddedClient): boolean {
  return readZoomParticipants(client).some(participantVideoOn);
}

function hasVisibleSdkAvatarImages(root: HTMLElement | null): boolean {
  if (!root) return false;
  const images = root.querySelectorAll<HTMLImageElement>(
    '[class*="avatar"] img, [class*="Avatar"] img',
  );
  return Array.from(images).some((img) => {
    const rect = img.getBoundingClientRect();
    return rect.width >= 40 && rect.height >= 40 && img.naturalWidth > 0;
  });
}

export function shouldShowParticipantFallback(
  client: ZoomEmbeddedClient,
  root: HTMLElement | null,
  someoneSharing: boolean,
  options?: { expectHostInMeeting?: boolean },
): boolean {
  if (someoneSharing) return false;
  const inMeeting = readInMeetingParticipants(client);
  if (inMeeting.length === 0) return false;
  if (options?.expectHostInMeeting && learnerRosterLooksIncomplete(client)) return true;
  // Blank SDK gallery/speaker is common when all cameras are off — always show custom tiles.
  if (!anyParticipantVideoOn(client)) return true;
  if (!hasVisibleSdkParticipantSurface(root)) return true;
  return !hasVisibleSdkAvatarImages(root);
}

export function pickViewForCount(
  _count: number,
  someoneSharing: boolean,
  _anyVideoOn = false,
): MeetingViewMode {
  if (someoneSharing) return "active";
  // Gallery renders profile avatars when cameras are off; solo speaker view is often blank.
  return "gallery";
}

export type ZoomStageMetrics = {
  width: number;
  height: number;
  videoHeight: number;
  ribbonWidth: number;
  ribbonHeight: number;
};

export function measureFullShareStage(stage: HTMLElement): ZoomStageMetrics {
  const rect = stage.getBoundingClientRect();
  const stageWidth = Math.max(Math.floor(rect.width), 320);
  const stageHeight = Math.max(Math.floor(rect.height), 240);
  return {
    width: stageWidth,
    height: stageHeight,
    videoHeight: stageHeight,
    ribbonWidth: 0,
    ribbonHeight: 0,
  };
}

export function shareRibbonWidth(stageWidth: number): number {
  if (isMobileZoomViewport()) return Math.max(stageWidth, 320);
  return Math.min(Math.max(200, Math.floor(stageWidth * 0.24)), 300);
}

export type ShareRibbonDensity = "none" | "normal" | "compact" | "minimal";

/** How much right-side overlay to reserve during screen share. */
export function shareRibbonDensity(participantCount: number): ShareRibbonDensity {
  const count = Math.max(participantCount, 1);
  if (count <= 1) return "none";
  if (count <= 8) return "normal";
  if (count <= 24) return "compact";
  return "minimal";
}

/** HTML overlay ribbon width — shrinks as meetings grow so share stays large. */
export function shareOverlayRibbonWidth(stageWidth: number, participantCount: number): number {
  const count = Math.max(participantCount, 1);
  if (isMobileZoomViewport()) return 0;
  const density = shareRibbonDensity(count);
  switch (density) {
    case "none":
      return 0;
    case "normal":
      return Math.min(Math.max(168, Math.floor(stageWidth * 0.17)), 220);
    case "compact":
      return Math.min(Math.max(104, Math.floor(stageWidth * 0.1)), 132);
    case "minimal":
      return Math.min(Math.max(68, Math.floor(stageWidth * 0.06)), 84);
    default:
      return 0;
  }
}

function mobileShareRibbonHeight(stageHeight: number, participantCount: number): number {
  const count = Math.max(participantCount, 1);
  if (count <= 1) return 0;
  if (count <= 8) return Math.min(Math.max(Math.floor(stageHeight * 0.26), 120), 180);
  if (count <= 24) return Math.min(Math.max(Math.floor(stageHeight * 0.18), 88), 120);
  return Math.min(Math.max(Math.floor(stageHeight * 0.12), 64), 80);
}

export function maxShareRibbonTiles(participantCount: number): number {
  switch (shareRibbonDensity(participantCount)) {
    case "none":
      return 0;
    case "normal":
      return Math.min(Math.max(participantCount, 1), 6);
    case "compact":
      return 3;
    case "minimal":
      return 2;
    default:
      return 0;
  }
}

export type ShareRibbonDisplay = {
  visible: ZoomParticipant[];
  totalCount: number;
  overflowCount: number;
};

/** Cap ribbon tiles for large meetings — share view always wins. */
export function participantsForShareRibbonDisplay(
  client: ZoomEmbeddedClient,
  options?: {
    hostDisplayName?: string | null;
    ensureHostVisible?: boolean;
    activeSpeakerId?: number | null;
    participantCount?: number;
  },
): ShareRibbonDisplay {
  const all = participantsForShareRibbon(client, {
    hostDisplayName: options?.hostDisplayName,
    ensureHostVisible: options?.ensureHostVisible,
  });
  const totalCount = Math.max(options?.participantCount ?? all.length, all.length);
  const maxVisible = maxShareRibbonTiles(totalCount);
  if (maxVisible === 0 || all.length === 0) {
    return { visible: [], totalCount, overflowCount: Math.max(totalCount - all.length, 0) };
  }
  if (all.length <= maxVisible) {
    return { visible: all, totalCount, overflowCount: Math.max(totalCount - all.length, 0) };
  }

  const picked = new Map<number, ZoomParticipant>();
  const tryPick = (p: ZoomParticipant | undefined) => {
    if (!p || picked.size >= maxVisible) return;
    picked.set(p.userId, p);
  };

  tryPick(all.find((p) => p.sharerOn));
  tryPick(all.find((p) => p.isHost));
  if (options?.activeSpeakerId != null) {
    tryPick(all.find((p) => p.userId === options.activeSpeakerId));
  }
  for (const p of all) {
    if (picked.size >= maxVisible) break;
    tryPick(p);
  }

  const visible = [...picked.values()];
  const overflowCount = Math.max(totalCount - visible.length, 0);
  return { visible, totalCount, overflowCount };
}

/** HTML filmstrip height — floating bottom bar, does not shrink share width. */
export function shareFilmstripHeight(participantCount: number): number {
  const count = Math.max(participantCount, 1);
  if (count <= 1) return 0;
  if (isMobileZoomViewport()) {
    if (count <= 8) return 108;
    if (count <= 24) return 88;
    return 72;
  }
  if (count <= 8) return 96;
  if (count <= 24) return 84;
  return 72;
}

/** Full-bleed share stage — responsive across desktop and mobile. */
export function measureShareViewMetrics(
  panel: HTMLElement,
  participantCount = 1,
): ZoomStageMetrics {
  const rect = panel.getBoundingClientRect();
  const width = Math.max(Math.floor(rect.width), 280);
  const totalHeight = Math.max(Math.floor(rect.height), 200);
  const filmstrip = isMobileZoomViewport()
    ? Math.max(shareFilmstripHeight(participantCount), Math.floor(totalHeight * 0.2))
    : shareFilmstripHeight(participantCount);
  const videoHeight = Math.max(totalHeight - filmstrip, isMobileZoomViewport() ? 160 : 200);
  return {
    width,
    height: totalHeight,
    videoHeight,
    ribbonWidth: 0,
    ribbonHeight: 0,
  };
}

/** True when the SDK paints its own participant strip during screen share. */
export function hasVisibleSdkShareRibbon(root: HTMLElement | null): boolean {
  if (!root) return false;
  const selectors = [
    '[class*="video-ribbon"]',
    '[class*="VideoRibbon"]',
    '[class*="gallery-video-ribbon"]',
    '[class*="GalleryVideoRibbon"]',
  ];
  for (const sel of selectors) {
    for (const el of root.querySelectorAll(sel)) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (rect.width > 56 && rect.height > 56 && style.opacity !== "0" && style.visibility !== "hidden") {
        return true;
      }
    }
  }
  return false;
}

export function shouldShowCustomShareFilmstrip(
  root: HTMLElement | null,
  participantCount: number,
): boolean {
  if (shareRibbonDensity(participantCount) === "none") return false;
  return !hasVisibleSdkShareRibbon(root);
}

export function applyShareStageChrome(
  stage: HTMLElement,
  participantCount: number,
  options?: { nativeLayout?: boolean },
): void {
  const useNative = options?.nativeLayout ?? hasVisibleSdkShareRibbon(stage);
  const filmstripH = useNative ? 0 : shareFilmstripHeight(participantCount);
  stage.style.setProperty("--zoom-share-filmstrip-height", `${filmstripH}px`);
  stage.dataset.shareRibbonDensity = shareRibbonDensity(participantCount);
  stage.classList.toggle("zoom-meeting-stage--native-share", useNative);
}

export function measureShareStage(stage: HTMLElement): ZoomStageMetrics {
  const rect = stage.getBoundingClientRect();
  const stageWidth = Math.max(Math.floor(rect.width), 320);
  const stageHeight = Math.max(Math.floor(rect.height), 240);
  const ribbonW = shareRibbonWidth(stageWidth);
  const mainW = isMobileZoomViewport()
    ? stageWidth
    : Math.max(stageWidth - ribbonW, 360);
  const mainH = isMobileZoomViewport()
    ? Math.max(stageHeight - Math.floor(stageHeight * 0.3), 220)
    : stageHeight;

  return {
    width: mainW,
    height: stageHeight,
    videoHeight: mainH,
    ribbonWidth: ribbonW,
    ribbonHeight: stageHeight,
  };
}

/** @deprecated use measureShareStage */
export function measureShareMainPanel(mainPanel: HTMLElement): ZoomStageMetrics {
  const stage = mainPanel.closest(".zoom-meeting-stage") as HTMLElement | null;
  if (stage) return measureShareStage(stage);
  const rect = mainPanel.getBoundingClientRect();
  const width = Math.max(Math.floor(rect.width), 280);
  const height = Math.max(Math.floor(rect.height), 240);
  return {
    width,
    height,
    videoHeight: height,
    ribbonWidth: shareRibbonWidth(width + 300),
    ribbonHeight: height,
  };
}

export function measureZoomStage(
  stage: HTMLElement,
  options?: { sharing?: boolean; hybridToolbar?: boolean },
): ZoomStageMetrics {
  const rect = stage.getBoundingClientRect();
  const width = Math.max(Math.floor(rect.width), 320);
  const stageHeight = Math.max(Math.floor(rect.height), 280);
  const sdkFooter = options?.hybridToolbar
    ? 0
    : isMobileZoomViewport()
      ? 56
      : ZOOM_NATIVE_FOOTER_HEIGHT;

  if (options?.sharing) {
    const ribbonWidth = isMobileZoomViewport()
      ? width
      : Math.min(Math.max(200, Math.floor(width * 0.24)), 320);
    const ribbonHeight = isMobileZoomViewport()
      ? Math.max(108, Math.floor(stageHeight * 0.3))
      : stageHeight;
    const mainWidth = isMobileZoomViewport() ? width : Math.max(width - ribbonWidth, 360);
    const mainHeight = isMobileZoomViewport()
      ? Math.max(stageHeight - ribbonHeight, 240)
      : stageHeight;

    return {
      width: mainWidth,
      height: stageHeight,
      videoHeight: mainHeight,
      ribbonWidth: isMobileZoomViewport() ? width : ribbonWidth,
      ribbonHeight,
    };
  }

  const videoHeight = Math.max(stageHeight - sdkFooter, 220);

  return {
    width,
    height: stageHeight,
    videoHeight,
    ribbonWidth: Math.min(Math.max(168, Math.floor(width * 0.24)), 280),
    ribbonHeight: Math.max(96, Math.floor(stageHeight * 0.22)),
  };
}

export function applyVideoViewSizes(
  client: ZoomEmbeddedClient,
  metrics: ZoomStageMetrics,
): void {
  try {
    client.updateVideoOptions?.({
      isResizable: true,
      viewSizes: {
        default: { width: metrics.width, height: metrics.videoHeight },
        ribbon: { width: metrics.ribbonWidth, height: metrics.ribbonHeight },
      },
    });
  } catch {
    // ignore
  }
}

let lastShareLayoutAt = 0;
let shareGalleryPickDone = false;
let shareFitDone = false;
let shareGalleryPickTimer: number | null = null;
let shareSettleTimer: number | null = null;
let shareLayoutLocked = false;

export function resetShareViewGuards(): void {
  lastShareLayoutAt = 0;
  shareGalleryPickDone = false;
  shareFitDone = false;
  shareLayoutLocked = false;
  if (shareGalleryPickTimer !== null) {
    window.clearTimeout(shareGalleryPickTimer);
    shareGalleryPickTimer = null;
  }
  if (shareSettleTimer !== null) {
    window.clearTimeout(shareSettleTimer);
    shareSettleTimer = null;
  }
}

/**
 * Resize the SDK share viewport once. Avoid repeated calls — they cause flicker.
 * The Zoom SDK owns share layout, participant strip, and fit-to-window.
 */
export function applyShareViewLayout(
  client: ZoomEmbeddedClient,
  stage: HTMLElement,
  _participantCount = 1,
  _sharePanel?: HTMLElement | null,
  options?: { force?: boolean; lock?: boolean },
): void {
  const now = Date.now();
  if (!options?.force && shareLayoutLocked) return;
  if (!options?.force && now - lastShareLayoutAt < 1500) return;
  lastShareLayoutAt = now;

  const metrics = measureFullShareStage(stage);
  stage.style.setProperty("--zoom-share-filmstrip-height", "0px");
  stage.classList.add("zoom-meeting-stage--native-share");

  try {
    client.setViewType?.("active");
    client.updateVideoOptions?.({
      isResizable: true,
      viewSizes: {
        default: { width: metrics.width, height: metrics.videoHeight },
        ribbon: {
          width: Math.min(Math.max(160, Math.floor(metrics.width * 0.18)), 260),
          height: metrics.height,
        },
      },
    });
  } catch {
    // ignore
  }

  if (options?.lock) shareLayoutLocked = true;
}

function matchesFitToWindowLabel(text: string): boolean {
  const hay = text.toLowerCase().replace(/\s+/g, " ");
  return hay.includes("fit to window") || hay.includes("fit to screen");
}

function matchesOriginalSizeLabel(text: string): boolean {
  const hay = text.toLowerCase().replace(/\s+/g, " ");
  return hay.includes("original size") || hay.includes("100% (original");
}

/** True when decoded share media is tiny vs the stage (clipped strip on the side). */
export function isShareMediaUnderscaled(stage: HTMLElement): boolean {
  const mount =
    stage.querySelector<HTMLElement>(".zoom-share-main--active .zoom-sdk-mount--hybrid") ??
    stage.querySelector<HTMLElement>(".zoom-sdk-mount--hybrid");
  if (!mount) return true;
  const mountRect = mount.getBoundingClientRect();
  if (mountRect.width < 48 || mountRect.height < 48) return true;
  const minW = mountRect.width * 0.4;
  const minH = mountRect.height * 0.32;
  const media = mount.querySelectorAll<HTMLVideoElement | HTMLCanvasElement>(
    '[class*="share-view"] video, [class*="share-view"] canvas, [class*="ShareView"] video, [class*="ShareView"] canvas',
  );
  if (media.length === 0) return true;
  for (const el of media) {
    const r = el.getBoundingClientRect();
    if (r.width >= minW && r.height >= minH) return false;
  }
  return true;
}

/** Banner chevron / View Options — opens Fit to Window vs Original Size menu. */
async function openShareSizingMenu(): Promise<boolean> {
  const roots: ParentNode[] = [...sdkRoots()];
  if (typeof document !== "undefined" && document.body) roots.push(document.body);

  for (const root of roots) {
    for (const el of root.querySelectorAll<HTMLElement>(
      'button[aria-label*="View Options"], button[aria-label*="view options"], [class*="share-notice"] button, [class*="ShareNotice"] button, [class*="viewing-screen"] button, [class*="ViewingScreen"] button',
    )) {
      const hay = buttonHaystack(el).toLowerCase();
      if (hay.includes("fit to") || hay.includes("original size")) continue;
      if (
        hay.includes("view option") ||
        el.getAttribute("aria-haspopup") === "true" ||
        el.getAttribute("aria-expanded") != null
      ) {
        fireClick(el);
        await delay(220);
        return true;
      }
    }
  }

  return clickSdkButton(["view options", "view option"]);
}

async function pickShareSizingMenuItem(matcher: (text: string) => boolean): Promise<boolean> {
  const roots: ParentNode[] = [...sdkRoots()];
  if (typeof document !== "undefined" && document.body) roots.push(document.body);

  for (const root of roots) {
    for (const el of root.querySelectorAll<HTMLElement>(
      "[role='menuitem'], [role='option'], [role='menuitemradio'], li[role='menuitem'], button[role='menuitem']",
    )) {
      if (!matcher(buttonHaystack(el))) continue;
      fireClick(el);
      return true;
    }
  }
  return false;
}

export async function selectShareFitToWindow(): Promise<boolean> {
  if (shareFitDone) return true;

  if (await pickShareSizingMenuItem(matchesFitToWindowLabel)) {
    shareFitDone = true;
    await delay(160);
    return true;
  }

  await openShareSizingMenu();
  await delay(200);
  if (await pickShareSizingMenuItem(matchesFitToWindowLabel)) {
    shareFitDone = true;
    await delay(160);
    return true;
  }

  return false;
}

export async function selectShareOriginalSize(): Promise<boolean> {
  if (await pickShareSizingMenuItem(matchesOriginalSizeLabel)) {
    await delay(160);
    return true;
  }

  await openShareSizingMenu();
  await delay(200);
  if (await pickShareSizingMenuItem(matchesOriginalSizeLabel)) {
    await delay(160);
    return true;
  }

  return false;
}

/** @deprecated Automated View Options clicks caused blinking — SDK handles fit-to-window. */
export async function applyShareViewScaling(_stage: HTMLElement): Promise<void> {
  // no-op
}

function matchesSideBySideGalleryLabel(text: string): boolean {
  const hay = text.toLowerCase().replace(/\s+/g, " ");
  if (hay.includes("side-by-side") && hay.includes("gallery")) return true;
  if (hay.includes("side by side") && hay.includes("gallery")) return true;
  if (hay.includes("并排") && hay.includes("画廊")) return true;
  if (hay.includes("並排") && hay.includes("圖庫")) return true;
  if (hay.includes("nebeneinander") && hay.includes("galerie")) return true;
  if (hay.includes("côte à côte") && hay.includes("galerie")) return true;
  if (hay.includes("lado a lado") && hay.includes("galer")) return true;
  return false;
}

function isShareFitMenuLabel(text: string): boolean {
  const hay = text.toLowerCase();
  return (
    hay.includes("fit to window") ||
    hay.includes("original size") ||
    hay.includes("view options") ||
    hay.includes("view option")
  );
}

/** Layout switcher (top-right / Speaker) — NOT the banner "View Options" (fit/original size). */
async function openShareLayoutSwitcher(): Promise<boolean> {
  for (const btn of findSdkFooterButtons()) {
    const hay = buttonHaystack(btn).toLowerCase().trim();
    if (hay === "speaker") {
      fireClick(btn);
      await delay(220);
      return true;
    }
  }

  const roots: ParentNode[] = [...sdkRoots()];
  if (typeof document !== "undefined" && document.body) roots.push(document.body);

  for (const root of roots) {
    for (const el of root.querySelectorAll<HTMLElement>(
      'button[aria-haspopup="true"], [role="button"][aria-haspopup="true"], button[aria-expanded], [role="button"][aria-expanded]',
    )) {
      const hay = buttonHaystack(el).toLowerCase();
      if (isShareFitMenuLabel(hay)) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8 || rect.top > 140) continue;
      if (hay.includes("side") || hay.includes("layout") || hay.includes("gallery")) {
        fireClick(el);
        await delay(220);
        return true;
      }
    }
  }

  return false;
}

/** Zoom paints remote share reliably in Side-by-side: Gallery — select it once per share session. */
export async function selectSideBySideGalleryShareView(): Promise<boolean> {
  if (shareGalleryPickDone) return true;

  const roots: ParentNode[] = [...sdkRoots()];
  if (typeof document !== "undefined" && document.body) {
    roots.push(document.body);
  }

  const tryPick = (): boolean => {
    for (const root of roots) {
      for (const el of root.querySelectorAll<HTMLElement>(
        "[role='menuitem'], [role='option'], [role='menuitemradio'], li[role='menuitem'], button[role='menuitem']",
      )) {
        if (!matchesSideBySideGalleryLabel(buttonHaystack(el))) continue;
        fireClick(el);
        return true;
      }
    }
    return false;
  };

  if (tryPick()) {
    shareGalleryPickDone = true;
    await delay(120);
    return true;
  }

  await openShareLayoutSwitcher();
  await delay(200);
  if (tryPick()) {
    shareGalleryPickDone = true;
    await delay(120);
    return true;
  }

  return false;
}

export function scheduleSideBySideGalleryShareView(): void {
  if (shareGalleryPickDone) return;
  if (shareGalleryPickTimer !== null) return;

  const run = () => {
    void selectSideBySideGalleryShareView();
  };
  shareGalleryPickTimer = window.setTimeout(() => {
    shareGalleryPickTimer = null;
    run();
    window.setTimeout(() => {
      if (!shareGalleryPickDone) run();
    }, 900);
  }, 450);
}

/** @deprecated Use activateRemoteShareView — repeated setup caused flicker. */
export function scheduleSharePresentationSetup(
  client: ZoomEmbeddedClient,
  stage: HTMLElement,
  participantCount = 1,
  sharePanel?: HTMLElement | null,
): void {
  activateRemoteShareView(client, stage, participantCount, sharePanel);
}

/** Call when peer-share-state-change reports Start — one layout pass, one settle retry. */
export function activateRemoteShareView(
  client: ZoomEmbeddedClient,
  stage: HTMLElement,
  participantCount = 1,
  sharePanel?: HTMLElement | null,
): void {
  if (shareSettleTimer !== null) {
    window.clearTimeout(shareSettleTimer);
    shareSettleTimer = null;
  }
  shareLayoutLocked = false;

  try {
    client.setViewType?.("active");
  } catch {
    // ignore
  }

  applyShareViewLayout(client, stage, participantCount, sharePanel, { force: true });

  shareSettleTimer = window.setTimeout(() => {
    shareSettleTimer = null;
    if (!stage.isConnected) return;
    applyShareViewLayout(client, stage, participantCount, sharePanel, { force: true, lock: true });
  }, 900);
}

/** @deprecated SDK manages share surfaces — avoid DOM overrides that break decode. */
function tuckNativeSdkRibbon(_stage: HTMLElement): void {
  // Intentionally no-op: hiding SDK ribbon nodes via DOM/CSS broke share-view rendering.
}

/** @deprecated */
function boostShareSurfaceVisibility(_stage: HTMLElement, _options?: { remoteViewer?: boolean }): void {
  // Intentionally no-op.
}

/** @deprecated Inline DOM overrides fight the SDK and cause black regions + flicker. */
export function polishShareLayoutDom(_stage: HTMLElement, _options?: { remoteViewer?: boolean }): void {
  // no-op — layout is CSS + updateVideoOptions only
}

export function scheduleShareLayoutRefresh(
  client: ZoomEmbeddedClient,
  stage: HTMLElement,
  onResize?: (client: ZoomEmbeddedClient) => void,
  options?: { fast?: boolean; participantCount?: number; sharePanel?: HTMLElement | null },
): void {
  const count = options?.participantCount ?? 1;
  const panel = options?.sharePanel ?? stage.querySelector<HTMLElement>(".zoom-share-main");
  const delays = options?.fast ? [0, 400, 1000] : [0, 500, 1500];
  for (const delay of delays) {
    window.setTimeout(() => {
      applyShareViewLayout(client, stage, count, panel);
      onResize?.(client);
    }, delay);
  }
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: number | null = null;
  return ((...args: Parameters<T>) => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  }) as T;
}

export function isShareStartAction(action: string): boolean {
  const normalized = action.toLowerCase();
  if (isShareStopAction(action)) return false;
  return normalized.includes("start") || normalized === "1" || normalized.includes("sharing");
}

export function isShareStopAction(action: string): boolean {
  const normalized = action.toLowerCase();
  return normalized.includes("stop") || normalized === "0" || normalized.includes("ended");
}

function delay(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function sdkRoots(): HTMLElement[] {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(".zoom-sdk-mount, .zoom-meeting-root"));
  return roots.length > 0 ? roots : [document.body];
}

function buttonHaystack(el: HTMLElement): string {
  return [
    el.getAttribute("aria-label"),
    el.getAttribute("title"),
    el.getAttribute("data-tooltip"),
    el.textContent,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function findSdkButton(keywords: string[]): HTMLElement | null {
  for (const root of sdkRoots()) {
    const nodes = root.querySelectorAll<HTMLElement>(
      "button, [role='button'], [role='menuitem'], [role='option'], a[aria-label]",
    );
    for (const el of nodes) {
      const hay = buttonHaystack(el);
      if (keywords.some((k) => hay.includes(k.toLowerCase()))) return el;
    }
  }
  return null;
}

function findSdkFooterButtons(): HTMLElement[] {
  for (const root of sdkRoots()) {
    const footer = root.querySelector<HTMLElement>('[class*="footer"], [class*="Footer"], footer');
    if (!footer) continue;
    return Array.from(footer.querySelectorAll<HTMLElement>("button, [role='button']"));
  }
  return [];
}

async function clickFooterChevronNear(keywords: string[]): Promise<boolean> {
  const buttons = findSdkFooterButtons();
  const idx = buttons.findIndex((btn) => {
    const hay = buttonHaystack(btn);
    return keywords.some((k) => hay.includes(k.toLowerCase()));
  });
  if (idx < 0) return false;

  const candidates = buttons.slice(idx + 1, idx + 4);
  for (const btn of candidates) {
    const hay = buttonHaystack(btn);
    if (
      hay.includes("audio settings") ||
      hay.includes("video settings") ||
      hay.includes("select") ||
      hay.includes("microphone") ||
      hay.includes("camera") ||
      hay.includes("speaker") ||
      hay.length <= 2
    ) {
      fireClick(btn);
      await delay(350);
      return true;
    }
  }
  return false;
}

export async function selectSdkMenuDevice(deviceLabel: string): Promise<boolean> {
  await delay(300);
  const needle = deviceLabel.trim().toLowerCase();
  if (!needle) return false;

  for (const root of sdkRoots()) {
    const items = root.querySelectorAll<HTMLElement>(
      "[role='menuitem'], [role='option'], [role='menuitemradio'], li button, li[role='button']",
    );
    for (const el of items) {
      const hay = buttonHaystack(el);
      if (hay.includes(needle) || needle.includes(hay.slice(0, 24))) {
        fireClick(el);
        await delay(300);
        return true;
      }
    }
  }

  const partial = needle.split(/[\s(]/)[0];
  if (partial.length >= 4) {
    const hit = findSdkButton([partial]);
    if (hit) {
      fireClick(hit);
      await delay(300);
      return true;
    }
  }
  return false;
}

function fireClick(el: HTMLElement) {
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
  el.click();
  el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
  el.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, cancelable: true }));
}

export async function clickSdkButton(keywords: string[]) {
  const el = findSdkButton(keywords);
  if (!el) return false;
  fireClick(el);
  await delay(350);
  return true;
}

export async function ensureComputerAudio(client: ZoomEmbeddedClient): Promise<boolean> {
  const me = readCurrentZoomUser(client);
  if (!me) return false;
  if (isComputerAudioConnected(me)) return true;

  const steps = [
    ["join audio", "connect audio", "audio"],
    ["join with computer audio", "computer audio", "use computer audio"],
    ["unmute", "unmute my audio", "turn on microphone"],
  ];

  for (const keywords of steps) {
    await clickSdkButton(keywords);
    await delay(450);
    const updated = readCurrentZoomUser(client);
    if (updated && isComputerAudioConnected(updated)) return true;
  }

  return false;
}

async function muteViaApi(client: ZoomEmbeddedClient, userId: number, mute: boolean): Promise<boolean> {
  try {
    const result = await client.mute?.(mute, userId);
    if (typeof result === "string" && result !== "") return false;
    await delay(250);
    const after = readCurrentZoomUser(client);
    if (!after) return false;
    return Boolean(after.muted) === mute;
  } catch {
    return false;
  }
}

export async function toggleSdkMute(client: ZoomEmbeddedClient): Promise<boolean> {
  const me = readCurrentZoomUser(client);
  if (!me) return false;

  const currentlyMuted = Boolean(me.muted);
  const targetMuted = !currentlyMuted;

  if (!isComputerAudioConnected(me)) {
    await ensureComputerAudio(client);
    await delay(600);
  }

  const fresh = readCurrentZoomUser(client);
  if (!fresh) return false;

  if (!targetMuted) {
    const joined = isComputerAudioConnected(fresh) || (await ensureComputerAudio(client));
    if (!joined) {
      await clickSdkButton(["unmute", "unmute my audio", "join audio", "join with computer audio"]);
      await delay(500);
    }
  }

  const user = readCurrentZoomUser(client);
  if (!user) return false;

  const apiWorked = await muteViaApi(client, user.userId, targetMuted);
  if (apiWorked) return !targetMuted;

  if (targetMuted) {
    await clickSdkButton([
      "mute",
      "mute my audio",
      "mute audio",
      "turn off microphone",
      "mute microphone",
      "mute/unmute",
    ]);
  } else {
    await clickSdkButton([
      "unmute",
      "unmute my audio",
      "unmute audio",
      "turn on microphone",
      "unmute microphone",
      "mute/unmute",
      "join audio",
      "join with computer audio",
    ]);
  }

  await delay(450);
  const final = readCurrentZoomUser(client);
  return final ? !final.muted : !targetMuted;
}

export async function setSdkMuted(client: ZoomEmbeddedClient, muted: boolean): Promise<boolean> {
  const me = readCurrentZoomUser(client);
  if (!me) return false;
  if (Boolean(me.muted) === muted) return !muted;

  if (!muted && !isComputerAudioConnected(me)) {
    await ensureComputerAudio(client);
    await delay(500);
  }

  const user = readCurrentZoomUser(client);
  if (!user) return false;

  if (await muteViaApi(client, user.userId, muted)) return !muted;

  if (muted) {
    await clickSdkButton(["mute", "mute my audio", "turn off microphone"]);
  } else {
    await clickSdkButton(["unmute", "unmute my audio", "join with computer audio", "join audio"]);
  }

  await delay(400);
  const after = readCurrentZoomUser(client);
  return after ? !after.muted : !muted;
}

export async function toggleSdkVideo(): Promise<boolean> {
  const stopBtn = findSdkButton(["stop video", "stop my video", "turn off video"]);
  if (stopBtn) {
    fireClick(stopBtn);
    await delay(300);
    return false;
  }
  await clickSdkButton(["start video", "start my video", "turn on video"]);
  return true;
}

export async function toggleSdkShare(client: ZoomEmbeddedClient, isLocalSharing: boolean) {
  if (isLocalSharing) {
    return stopSdkScreenShare();
  }
  if (!canUseScreenShare()) return false;
  return startSdkScreenShare(client);
}

async function trySdkShareApi(client: ZoomEmbeddedClient): Promise<boolean> {
  const extended = client as ZoomEmbeddedClient & {
    startShareScreen?: () => Promise<string>;
    startShare?: (options?: { shareSound?: boolean }) => Promise<string>;
  };

  try {
    if (typeof extended.startShareScreen === "function") {
      const result = await withOperationTimeout(extended.startShareScreen(), 8000, "timeout");
      return result !== "timeout" && (typeof result !== "string" || result === "");
    }
    if (typeof extended.startShare === "function") {
      const result = await withOperationTimeout(extended.startShare({ shareSound: true }), 8000, "timeout");
      return result !== "timeout" && (typeof result !== "string" || result === "");
    }
  } catch {
    // fall through to footer share button
  }

  return false;
}

export async function startSdkScreenShare(client?: ZoomEmbeddedClient) {
  if (client) {
    const viaApi = await trySdkShareApi(client);
    if (viaApi) {
      scheduleSharePickerReposition(600);
      return true;
    }
  }

  return withVisibleSdkFooter(async () => {
    const btn = resolveSdkShareButton();
    if (btn) {
      fireClick(btn);
      scheduleSharePickerReposition();
      await delay(280);
      await pickEntireScreenInShareDialog();
      return true;
    }

    const clicked = await clickSdkButton(["share screen", "screen share", "start share", "share"]);
    scheduleSharePickerReposition();
    await delay(280);
    await pickEntireScreenInShareDialog();
    return clicked;
  });
}

async function pickEntireScreenInShareDialog(): Promise<boolean> {
  const tabKeywords = ["entire screen", "screen", "your screen", "full screen", "display"];
  for (const keyword of tabKeywords) {
    const tabs = await clickShareDialogButtons([keyword]);
    if (tabs > 0) {
      await delay(220);
      break;
    }
  }

  const confirmKeywords = [
    "entire screen",
    "your entire screen",
    "whole screen",
    "full screen",
    "screen 1",
    "display",
    "share screen",
    "monitor",
  ];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const clicked = await clickShareDialogButtons(confirmKeywords);
    if (clicked > 0) return true;
    await delay(180);
  }
  return false;
}

async function clickShareDialogButtons(keywords: string[]): Promise<number> {
  let count = 0;
  const roots = [
    ...sdkRoots(),
    ...Array.from(document.querySelectorAll<HTMLElement>(
      '[role="dialog"], [class*="share-picker"], [class*="SharePicker"], [class*="share-dialog"], [class*="ShareDialog"]',
    )),
  ];

  for (const root of roots) {
    const nodes = root.querySelectorAll<HTMLElement>(
      "button, [role='button'], [role='tab'], [role='menuitem'], [role='option'], a[aria-label]",
    );
    for (const el of nodes) {
      const hay = buttonHaystack(el);
      if (!keywords.some((k) => hay.includes(k.toLowerCase()))) continue;
      fireClick(el);
      count += 1;
      await delay(180);
    }
  }
  return count;
}

function withOperationTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function stopSdkScreenShare() {
  return clickSdkButton(["stop share", "stop sharing", "stop screen share", "you are sharing"]);
}

export async function openSdkAudioSettings() {
  const opened =
    (await clickFooterChevronNear(["mute", "unmute", "audio"])) ||
    (await clickSdkButton([
      "audio settings",
      "select a microphone",
      "select microphone",
      "microphone",
      "speaker",
      "audio options",
    ]));
  return opened;
}

export async function openSdkVideoSettings() {
  const opened =
    (await clickFooterChevronNear(["video", "start video", "stop video"])) ||
    (await clickSdkButton([
      "video settings",
      "select a camera",
      "select camera",
      "camera",
      "video options",
    ]));
  return opened;
}

export async function applyMediaPreferencesAfterJoin(
  client: ZoomEmbeddedClient,
  prefs: MediaDevicePreferences,
) {
  await delay(1200);

  try {
    await ensureComputerAudio(client);
  } catch {
    // audio may be unavailable — continue without crashing the session
  }

  const me = readCurrentZoomUser(client);
  if (!me) return;

  try {
    if (prefs.startWithAudio) {
      await setSdkMuted(client, false);
    } else {
      await setSdkMuted(client, true);
    }
  } catch {
    // ignore mute toggle failures
  }

  const hasVideoDevice = Boolean(prefs.videoInputId && prefs.videoInputId !== "none");
  try {
    if (prefs.startWithVideo && hasVideoDevice) {
      await clickSdkButton(["start video", "start my video"]);
    } else {
      await clickSdkButton(["stop video", "stop my video"]);
    }
  } catch {
    // no camera connected — host can still run audio-only
  }
}

export async function endOrLeaveMeeting(client: ZoomEmbeddedClient, isHost: boolean) {
  if (isHost) {
    await clickSdkButton(["end", "end meeting for all", "end meeting"]);
  } else {
    await clickSdkButton(["leave", "leave meeting"]);
  }
  try {
    if (isHost) await client.endMeeting?.();
    else await client.leaveMeeting?.();
  } catch {
    // ignore
  }
}

export type CloudRecordingState = "Recording" | "Paused" | "Stopped" | "Unknown";

export async function setSdkCloudRecording(
  client: ZoomEmbeddedClient,
  action: "start" | "pause" | "stop",
): Promise<boolean> {
  try {
    const result = await client.record?.(action);
    if (typeof result === "string" && result !== "") return false;
    await delay(300);
    return true;
  } catch {
    const keywords =
      action === "start"
        ? ["record", "start recording", "cloud recording"]
        : action === "stop"
          ? ["stop recording", "end recording"]
          : ["pause recording"];
    return clickSdkButton(keywords);
  }
}

export async function openSdkParticipantsPanel(): Promise<boolean> {
  return withVisibleSdkFooter(async () => {
    return clickSdkButton(["participants", "manage participants", "open participants", "participants list"]);
  });
}

export async function openSdkWaitingRoomPanel(): Promise<boolean> {
  await openSdkParticipantsPanel();
  await delay(450);
  return clickSdkButton(["waiting room", "waiting", "view waiting room", "participants in waiting room"]);
}

function mergeWaitingByUserId(
  fromSdk: ZoomParticipant[],
  tracked: ZoomParticipant[],
): ZoomParticipant[] {
  const map = new Map<number, ZoomParticipant>();
  for (const p of fromSdk) map.set(p.userId, p);
  for (const p of tracked) {
    if (p.userId > 0 && !map.has(p.userId)) map.set(p.userId, p);
  }
  return Array.from(map.values());
}

export function collectWaitingUserIds(
  client: ZoomEmbeddedClient,
  tracked: ZoomParticipant[] = [],
): number[] {
  const merged = mergeWaitingByUserId(readWaitingRoomParticipants(client), tracked);
  return merged.map((p) => p.userId).filter((id) => id > 0);
}

async function clickAllMatchingButtons(keywords: string[]): Promise<number> {
  let count = 0;
  for (const root of sdkRoots()) {
    const nodes = root.querySelectorAll<HTMLElement>(
      "button, [role='button'], [role='menuitem'], a[aria-label]",
    );
    for (const el of nodes) {
      const hay = buttonHaystack(el);
      if (!keywords.some((k) => hay.includes(k.toLowerCase()))) continue;
      fireClick(el);
      count += 1;
      await delay(220);
    }
  }
  return count;
}

export async function releaseWaitingParticipant(
  client: ZoomEmbeddedClient,
  userId: number,
): Promise<boolean> {
  if (!userId) return false;

  try {
    const result = await client.admit?.(userId);
    if (typeof result === "string" && result === "") {
      await delay(300);
      return true;
    }
  } catch {
    // fall through
  }

  try {
    const result = await client.putOnHold?.(userId, false);
    if (typeof result === "string" && result === "") {
      await delay(300);
      return true;
    }
  } catch {
    // fall through
  }

  return false;
}

export async function admitWaitingParticipant(
  client: ZoomEmbeddedClient,
  userId: number,
): Promise<boolean> {
  if (await releaseWaitingParticipant(client, userId)) return true;

  await openSdkWaitingRoomPanel();
  await delay(400);
  const clicked = await clickAllMatchingButtons(["admit", "allow to join", "admit participant"]);
  return clicked > 0;
}

export async function admitAllWaitingParticipants(
  client: ZoomEmbeddedClient,
  tracked: ZoomParticipant[] = [],
): Promise<boolean> {
  const userIds = collectWaitingUserIds(client, tracked);
  if (userIds.length === 0) return false;

  let admittedAny = false;

  for (const userId of userIds) {
    if (await releaseWaitingParticipant(client, userId)) {
      admittedAny = true;
    }
  }

  try {
    const result = await withOperationTimeout(
      Promise.resolve(client.admitAll?.()),
      6000,
      "timeout" as const,
    );
    if (result !== "timeout" && (typeof result !== "string" || result === "")) {
      await delay(300);
      return true;
    }
  } catch {
    // fall through
  }

  if (admittedAny) return true;

  await withOperationTimeout(
    (async () => {
      await withVisibleSdkFooter(async () => {
        await openSdkParticipantsPanel();
      });
      await delay(400);
      await openSdkWaitingRoomPanel();
      await delay(500);

      const admitAllClicks = await clickAllMatchingButtons([
        "admit all",
        "allow all to join",
        "allow all",
        "admit all waiting",
      ]);
      if (admitAllClicks > 0) return;

      await clickAllMatchingButtons(["admit", "allow to join"]);
    })(),
    7000,
    undefined,
  );

  return admittedAny || readWaitingRoomParticipants(client).length < userIds.length;
}

export async function admitLobbyLearner(
  client: ZoomEmbeddedClient,
  learner: { display_name: string; student_id: number },
  tracked: ZoomParticipant[] = [],
  hostDisplayName?: string | null,
): Promise<boolean> {
  const waiting = mergeWaitingByUserId(readWaitingRoomParticipants(client), tracked);
  const learnerName = learner.display_name.trim().toLowerCase();
  const match = waiting.find((p) => {
    const name = participantDisplayName(p, { hostName: hostDisplayName }).trim().toLowerCase();
    return name === learnerName || name.includes(learnerName) || learnerName.includes(name);
  });

  if (match) {
    return admitWaitingParticipant(client, match.userId);
  }

  return admitAllWaitingParticipants(client, tracked);
}

export async function setSdkMeetingLocked(
  client: ZoomEmbeddedClient,
  locked: boolean,
): Promise<boolean> {
  try {
    const result = await client.lockMeeting?.(locked);
    if (typeof result === "string" && result !== "") return false;
    await delay(250);
    return true;
  } catch {
    return clickSdkButton(locked ? ["lock meeting", "lock"] : ["unlock meeting", "unlock"]);
  }
}

export async function setSdkMuteAll(client: ZoomEmbeddedClient, mute: boolean): Promise<boolean> {
  try {
    const result = await client.muteAll?.(mute);
    if (typeof result === "string" && result !== "") return false;
    await delay(300);
    return true;
  } catch {
    return clickSdkButton(
      mute ? ["mute all", "mute all participants"] : ["unmute all", "ask all to unmute"],
    );
  }
}

export async function openSdkReactions(): Promise<boolean> {
  return clickSdkButton(["reactions", "reaction", "send a reaction"]);
}

export async function openSdkSecurity(): Promise<boolean> {
  return clickSdkButton(["security", "meeting security", "host tools"]);
}

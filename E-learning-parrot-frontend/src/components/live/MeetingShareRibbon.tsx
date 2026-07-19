import { useEffect, useState } from "react";

import { MeetingProfileAvatar } from "@/components/live/MeetingProfileAvatar";
import { resolveParticipantAvatar } from "@/lib/zoomAvatars";
import {
  participantDisplayName,
  participantVideoOn,
  participantsForShareRibbonDisplay,
  readActiveSharer,
  shareRibbonDensity,
  type ZoomEmbeddedClient,
  type ZoomParticipant,
} from "@/components/live/zoomMeetingClient";

type Props = {
  client: ZoomEmbeddedClient;
  participantCount: number;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
  avatarByUserId?: Record<number, string>;
  activeSpeakerId?: number | null;
  ensureHostVisible?: boolean;
};

/** Google Meet / Zoom style floating filmstrip during screen share. */
export function MeetingShareRibbon({
  client,
  participantCount,
  hostAvatarUrl,
  hostDisplayName,
  avatarByUserId,
  activeSpeakerId = null,
  ensureHostVisible = false,
}: Props) {
  const [ribbon, setRibbon] = useState(() =>
    participantsForShareRibbonDisplay(client, {
      hostDisplayName,
      ensureHostVisible,
      activeSpeakerId,
      participantCount,
    }),
  );
  const [sharerId, setSharerId] = useState<number | null>(() => readActiveSharer(client)?.userId ?? null);

  useEffect(() => {
    const refresh = () => {
      setRibbon(
        participantsForShareRibbonDisplay(client, {
          hostDisplayName,
          ensureHostVisible,
          activeSpeakerId,
          participantCount,
        }),
      );
      const sharer = readActiveSharer(client);
      setSharerId(sharer?.userId ?? null);
    };

    refresh();
    const timer = window.setInterval(refresh, 2000);
    client.on?.("user-added", refresh);
    client.on?.("user-removed", refresh);
    client.on?.("user-updated", refresh);
    client.on?.("peer-share-state-change", refresh);
    return () => {
      window.clearInterval(timer);
      client.off?.("user-added", refresh);
      client.off?.("user-removed", refresh);
      client.off?.("user-updated", refresh);
      client.off?.("peer-share-state-change", refresh);
    };
  }, [client, hostDisplayName, ensureHostVisible, activeSpeakerId, participantCount]);

  const density = shareRibbonDensity(participantCount);
  if (density === "none" || ribbon.visible.length === 0) return null;

  return (
    <aside
      className={`zoom-share-filmstrip zoom-share-filmstrip--${density}`}
      aria-label="Participants during screen share"
    >
      <div className="zoom-share-filmstrip-track">
        {ribbon.visible.map((participant) => (
          <ShareFilmstripTile
            key={participant.userId}
            participant={participant}
            hostAvatarUrl={hostAvatarUrl}
            hostDisplayName={hostDisplayName}
            avatarByUserId={avatarByUserId}
            isSharer={participant.userId === sharerId || Boolean(participant.sharerOn)}
            isSpeaking={participant.userId === activeSpeakerId}
            compact={density !== "normal"}
          />
        ))}
        {ribbon.overflowCount > 0 && (
          <div className="zoom-share-filmstrip-overflow" title={`${ribbon.totalCount} in meeting`}>
            <span className="text-sm font-bold tabular-nums text-white">+{ribbon.overflowCount}</span>
          </div>
        )}
      </div>
    </aside>
  );
}

function ShareFilmstripTile({
  participant,
  hostAvatarUrl,
  hostDisplayName,
  avatarByUserId,
  isSharer,
  isSpeaking,
  compact,
}: {
  participant: ZoomParticipant;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
  avatarByUserId?: Record<number, string>;
  isSharer: boolean;
  isSpeaking: boolean;
  compact: boolean;
}) {
  const name = participantDisplayName(participant, { hostName: hostDisplayName });
  const avatar = resolveParticipantAvatar(participant, name, { hostAvatarUrl, avatarByUserId });
  const videoOn = participantVideoOn(participant);
  const highlight = isSharer || isSpeaking;

  return (
    <div
      className={`zoom-share-filmstrip-tile ${highlight ? "zoom-share-filmstrip-tile--active" : ""} ${
        compact ? "zoom-share-filmstrip-tile--compact" : ""
      }`}
      title={name}
    >
      <div className="zoom-share-filmstrip-avatar-wrap">
        <MeetingProfileAvatar
          name={name}
          avatarUrl={avatar}
          className="h-full w-full rounded-lg object-cover"
        />
        {participant.isHost && <span className="zoom-share-filmstrip-host-badge">Host</span>}
        {isSharer && <span className="zoom-share-filmstrip-share-badge">Live</span>}
      </div>
      {!compact && (
        <div className="zoom-share-filmstrip-meta">
          <p className="truncate text-[11px] font-medium text-white">{name}</p>
          <p className="truncate text-[10px] text-zinc-400">
            {isSharer ? "Presenting" : videoOn ? "Video on" : "Camera off"}
          </p>
        </div>
      )}
    </div>
  );
}

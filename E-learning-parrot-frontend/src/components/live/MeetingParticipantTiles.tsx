import { MeetingProfileAvatar } from "@/components/live/MeetingProfileAvatar";
import { resolveParticipantAvatar } from "@/lib/zoomAvatars";
import {
  participantDisplayName,
  participantsForDisplayTiles,
  readZoomParticipants,
  type ZoomEmbeddedClient,
} from "@/components/live/zoomMeetingClient";

type Props = {
  client: ZoomEmbeddedClient;
  activeSpeakerId?: number | null;
  showTiles: boolean;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
  avatarByUserId?: Record<number, string>;
  ensureHostVisible?: boolean;
};

export function MeetingParticipantTiles({
  client,
  activeSpeakerId = null,
  showTiles,
  hostAvatarUrl,
  hostDisplayName,
  avatarByUserId,
  ensureHostVisible = false,
}: Props) {
  if (!showTiles) return null;

  const participants = participantsForDisplayTiles(client, {
    hostDisplayName,
    ensureHostVisible,
  });
  if (participants.length === 0) return null;

  const gridClass =
    participants.length === 1
      ? "grid-cols-1 max-w-3xl mx-auto"
      : participants.length === 2
        ? "grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto"
        : "grid-cols-2 lg:grid-cols-3";

  return (
    <div className="zoom-meeting-participant-tiles pointer-events-none absolute inset-0 z-[10] flex items-center justify-center p-3 sm:p-5">
      <div className={`grid w-full gap-3 sm:gap-4 ${gridClass}`}>
        {participants.map((p) => (
          <ParticipantTile
            key={p.userId}
            participant={p}
            speaking={activeSpeakerId === p.userId}
            large={participants.length <= 2}
            hostAvatarUrl={hostAvatarUrl}
            hostDisplayName={hostDisplayName}
            avatarByUserId={avatarByUserId}
          />
        ))}
      </div>
    </div>
  );
}

function ParticipantTile({
  participant,
  speaking,
  large,
  hostAvatarUrl,
  hostDisplayName,
  avatarByUserId,
}: {
  participant: ReturnType<typeof readZoomParticipants>[number];
  speaking: boolean;
  large: boolean;
  hostAvatarUrl?: string | null;
  hostDisplayName?: string | null;
  avatarByUserId?: Record<number, string>;
}) {
  const name = participantDisplayName(participant, { hostName: hostDisplayName });
  const avatar = resolveParticipantAvatar(participant, name, { hostAvatarUrl, avatarByUserId });

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#2d2d2d] shadow-lg ${
        large ? "aspect-video min-h-[min(300px,48vh)] max-h-[min(480px,62vh)]" : "aspect-video min-h-[140px]"
      } ${speaking ? "ring-2 ring-emerald-400" : "ring-1 ring-white/15"}`}
    >
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-[#2a2a2a] to-[#1f1f1f] px-3">
        <div
          className={`overflow-hidden rounded-full bg-[#3a3a3a] ring-2 ring-white/10 ${
            large ? "h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36" : "h-16 w-16 sm:h-20 sm:w-20"
          }`}
        >
          <MeetingProfileAvatar
            name={name}
            avatarUrl={avatar}
            className="h-full w-full object-cover"
          />
        </div>
        <p className={`max-w-full text-center text-sm font-semibold text-white sm:text-base ${large ? "break-words px-2" : "truncate"}`}>
          {name}
        </p>
        <span className="rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] text-zinc-300">
          Camera off
          {participant.muted ? " · Muted" : " · Unmuted"}
        </span>
      </div>
      {participant.isHost && (
        <span className="absolute left-2 top-2 rounded bg-[#0e72ed]/90 px-2 py-0.5 text-[10px] font-medium text-white">
          Host
        </span>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";

import { Crown, Loader2, Mic, MicOff, UserCheck, UserMinus, Users, Video, VideoOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { MeetingProfileAvatar } from "@/components/live/MeetingProfileAvatar";

import type { LiveClassLobbyEntry } from "@/components/live/HostLiveLobbyBar";

import { findWaitingParticipantForLearner } from "@/lib/liveClassLobby";

import { resolveParticipantAvatar } from "@/lib/zoomAvatars";

import {

  admitWaitingParticipant,

  participantDisplayName,

  participantVideoOn,

  readInMeetingParticipants,

  readWaitingRoomParticipants,

  type ZoomEmbeddedClient,

  type ZoomParticipant,

} from "@/components/live/zoomMeetingClient";

import { mergeWaitingParticipants } from "@/lib/zoomWaitingRoomTracker";



type Props = {

  open: boolean;

  onClose: () => void;

  client: ZoomEmbeddedClient;

  isHost?: boolean;

  hostAvatarUrl?: string | null;

  hostDisplayName?: string | null;

  avatarByUserId?: Record<number, string>;

  onParticipantRemoved?: (participant: ZoomParticipant) => void;

  eventTrackedWaiting?: ZoomParticipant[];

  checkedInLearners?: LiveClassLobbyEntry[];

  onAdmitLobbyLearner?: (learner: LiveClassLobbyEntry) => Promise<void>;

};



export function MeetingParticipantsPanel({

  open,

  onClose,

  client,

  isHost = false,

  hostAvatarUrl,

  hostDisplayName,

  avatarByUserId,

  onParticipantRemoved,

  eventTrackedWaiting = [],

  checkedInLearners = [],

  onAdmitLobbyLearner,

}: Props) {

  const [inMeeting, setInMeeting] = useState<ZoomParticipant[]>([]);

  const [waitingRoom, setWaitingRoom] = useState<ZoomParticipant[]>([]);

  const [actionUserId, setActionUserId] = useState<number | null>(null);

  const [admittingStudentId, setAdmittingStudentId] = useState<number | null>(null);



  const refresh = useCallback(() => {

    const sdkWaiting = readWaitingRoomParticipants(client);

    setWaitingRoom(mergeWaitingParticipants(sdkWaiting, eventTrackedWaiting));

    setInMeeting(readInMeetingParticipants(client));

  }, [client, eventTrackedWaiting]);



  useEffect(() => {

    if (!open) return;

    refresh();

    const timer = window.setInterval(refresh, 1200);

    return () => window.clearInterval(timer);

  }, [open, refresh]);



  useEffect(() => {

    const onChange = () => refresh();

    client.on?.("user-added", onChange);

    client.on?.("user-removed", onChange);

    client.on?.("user-updated", onChange);

    return () => {

      client.off?.("user-added", onChange);

      client.off?.("user-removed", onChange);

      client.off?.("user-updated", onChange);

    };

  }, [client, refresh]);



  const handleMute = async (participant: ZoomParticipant) => {

    if (!isHost || participant.isHost) return;

    setActionUserId(participant.userId);

    try {

      await client.mute?.(!participant.muted, participant.userId);

      refresh();

    } finally {

      setActionUserId(null);

    }

  };



  const handleRemove = async (participant: ZoomParticipant) => {

    if (!isHost || participant.isHost) return;

    setActionUserId(participant.userId);

    try {

      await client.expel?.(participant.userId);

      onParticipantRemoved?.(participant);

      refresh();

    } finally {

      setActionUserId(null);

    }

  };



  const handleAdmit = async (participant: ZoomParticipant) => {

    if (!isHost) return;

    setActionUserId(participant.userId);

    try {

      await admitWaitingParticipant(client, participant.userId);

      refresh();

    } finally {

      setActionUserId(null);

    }

  };



  const handleAdmitCheckedIn = async (learner: LiveClassLobbyEntry) => {

    if (!isHost || !onAdmitLobbyLearner) return;

    setAdmittingStudentId(learner.student_id);

    try {

      await onAdmitLobbyLearner(learner);

      refresh();

    } finally {

      setAdmittingStudentId(null);

    }

  };



  if (!open) return null;



  const totalCount = inMeeting.length + waitingRoom.length + checkedInLearners.length;



  return (

    <>

      <button

        type="button"

        className="absolute inset-0 z-40 bg-black/30 lg:hidden"

        aria-label="Close participants"

        onClick={onClose}

      />



      <aside className="absolute bottom-0 right-0 top-0 z-50 flex w-[min(100vw,360px)] flex-col border-l border-white/10 bg-[#232323] shadow-2xl">

        <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 px-4">

          <div>

            <h2 className="text-sm font-semibold text-white">Participants</h2>

            <p className="text-[10px] text-zinc-500">

              {inMeeting.length} in meeting

              {waitingRoom.length > 0 ? ` · ${waitingRoom.length} in Zoom waiting room` : ""}

              {checkedInLearners.length > 0 ? ` · ${checkedInLearners.length} pending` : ""}

              {isHost ? " · Host controls" : ""}

            </p>

          </div>

          <button

            type="button"

            onClick={onClose}

            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"

            aria-label="Close participants panel"

          >

            <X className="h-4 w-4" />

          </button>

        </div>



        <div className="min-h-0 flex-1 overflow-y-auto p-3">

          {isHost && checkedInLearners.length > 0 && (

            <section className="mb-4 space-y-2">

              <div className="rounded-lg border border-sky-500/30 bg-sky-950/20 px-3 py-2">

                <p className="text-xs font-semibold text-sky-100">Learners waiting to enter</p>

                <p className="text-[10px] text-sky-200/80">

                  Admit each learner below when they are ready to join the class.

                </p>

              </div>

              {checkedInLearners.map((learner) => {

                const zoomMatch = findWaitingParticipantForLearner(

                  waitingRoom,

                  learner,

                  hostDisplayName,

                );

                const busy = admittingStudentId === learner.student_id;



                return (

                  <div

                    key={`checkin-${learner.student_id}`}

                    className="flex items-center gap-3 rounded-lg border border-sky-500/20 bg-[#2d2d2d] p-3"

                  >

                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#1a1a1a] ring-2 ring-sky-500/30">

                      <MeetingProfileAvatar name={learner.display_name} />

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="truncate text-sm font-medium text-white">{learner.display_name}</p>

                      {learner.email ? (

                        <p className="truncate text-[10px] text-zinc-500">{learner.email}</p>

                      ) : null}

                    </div>

                    <Button

                      size="sm"

                      className="h-8 shrink-0 bg-emerald-600 text-xs hover:bg-emerald-500"

                      disabled={busy || !onAdmitLobbyLearner}

                      onClick={() => void handleAdmitCheckedIn(learner)}

                    >

                      {busy ? (

                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />

                      ) : (

                        <UserCheck className="mr-1 h-3.5 w-3.5" />

                      )}

                      {zoomMatch ? "Admit" : "Allow in"}

                    </Button>

                  </div>

                );

              })}

            </section>

          )}



          {isHost && waitingRoom.length > 0 && (

            <section className="mb-4 space-y-2">

              <div className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2">

                <div className="flex items-center gap-2 text-amber-200">

                  <Users className="h-4 w-4 shrink-0" />

                  <div>

                    <p className="text-xs font-semibold">Zoom waiting room</p>

                    <p className="text-[10px] text-amber-200/80">

                      {waitingRoom.length} in Zoom waiting room

                    </p>

                  </div>

                </div>

              </div>



              {waitingRoom.map((participant) => (

                <WaitingRow

                  key={`wait-${participant.userId}`}

                  participant={participant}

                  hostDisplayName={hostDisplayName}

                  avatarByUserId={avatarByUserId}

                  busy={actionUserId === participant.userId}

                  onAdmit={() => void handleAdmit(participant)}

                />

              ))}

            </section>

          )}



          {totalCount === 0 ? (

            <p className="rounded-lg border border-dashed border-white/10 py-10 text-center text-xs text-zinc-500">

              Waiting for participants…

            </p>

          ) : inMeeting.length === 0 ? (

            <p className="rounded-lg border border-dashed border-white/10 py-6 text-center text-xs text-zinc-500">

              No one in the meeting yet. Admit learners from the list above.

            </p>

          ) : (

            <div className="space-y-2">

              {inMeeting.map((participant) => (

                <ParticipantRow

                  key={participant.userId}

                  participant={participant}

                  isHost={isHost}

                  hostAvatarUrl={hostAvatarUrl}

                  hostDisplayName={hostDisplayName}

                  avatarByUserId={avatarByUserId}

                  busy={actionUserId === participant.userId}

                  onMute={() => void handleMute(participant)}

                  onRemove={() => void handleRemove(participant)}

                />

              ))}

            </div>

          )}

        </div>

      </aside>

    </>

  );

}



function WaitingRow({

  participant,

  hostDisplayName,

  avatarByUserId,

  busy,

  onAdmit,

}: {

  participant: ZoomParticipant;

  hostDisplayName?: string | null;

  avatarByUserId?: Record<number, string>;

  busy: boolean;

  onAdmit: () => void;

}) {

  const name = participantDisplayName(participant, { hostName: hostDisplayName });

  const avatar = resolveParticipantAvatar(participant, name, { avatarByUserId });



  return (

    <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-[#2d2d2d] p-3">

      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#1a1a1a] ring-2 ring-amber-500/30">

        <MeetingProfileAvatar name={name} avatarUrl={avatar} className="h-full w-full object-cover" />

      </div>

      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-medium text-white">{name}</p>

        <p className="text-[10px] text-amber-300/90">Waiting to be admitted</p>

      </div>

      <Button

        size="sm"

        className="h-8 shrink-0 bg-emerald-600 text-xs hover:bg-emerald-500"

        disabled={busy}

        onClick={onAdmit}

      >

        <UserCheck className="mr-1 h-3.5 w-3.5" />

        Admit

      </Button>

    </div>

  );

}



function ParticipantRow({

  participant,

  isHost,

  hostAvatarUrl,

  hostDisplayName,

  avatarByUserId,

  busy,

  onMute,

  onRemove,

}: {

  participant: ZoomParticipant;

  isHost: boolean;

  hostAvatarUrl?: string | null;

  hostDisplayName?: string | null;

  avatarByUserId?: Record<number, string>;

  busy: boolean;

  onMute: () => void;

  onRemove: () => void;

}) {

  const name = participantDisplayName(participant, { hostName: hostDisplayName });

  const avatar = resolveParticipantAvatar(participant, name, { hostAvatarUrl, avatarByUserId });

  const videoOn = participantVideoOn(participant);



  return (

    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#2d2d2d] p-3">

      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#1a1a1a] ring-2 ring-white/10">

        <MeetingProfileAvatar

          name={name}

          avatarUrl={avatar}

          className="h-full w-full object-cover"

        />

        {participant.isHost && (

          <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-amber-500 p-0.5 text-black">

            <Crown className="h-2.5 w-2.5" />

          </span>

        )}

      </div>



      <div className="min-w-0 flex-1">

        <p className="truncate text-sm font-medium text-white">{name}</p>

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-500">

          {participant.isHost && <span className="text-amber-400">Host</span>}

          {participant.isCoHost && <span className="text-sky-400">Co-host</span>}

          {participant.isGuest && <span>Guest</span>}

          {participant.muted ? (

            <span className="inline-flex items-center gap-0.5 text-red-400">

              <MicOff className="h-3 w-3" /> Muted

            </span>

          ) : (

            <span className="inline-flex items-center gap-0.5 text-emerald-400">

              <Mic className="h-3 w-3" /> Live

            </span>

          )}

          {videoOn ? (

            <span className="inline-flex items-center gap-0.5">

              <Video className="h-3 w-3" /> Video on

            </span>

          ) : (

            <span className="inline-flex items-center gap-0.5">

              <VideoOff className="h-3 w-3" /> Video off

            </span>

          )}

          {participant.sharerOn && <span className="text-[#6db3ff]">Sharing</span>}

        </div>

      </div>



      {isHost && !participant.isHost && (

        <div className="flex shrink-0 flex-col gap-1">

          <Button

            size="sm"

            variant="outline"

            className="h-7 border-white/15 px-2 text-[10px] text-zinc-200 hover:bg-white/10"

            disabled={busy}

            onClick={onMute}

          >

            {participant.muted ? "Unmute" : "Mute"}

          </Button>

          <Button

            size="sm"

            variant="outline"

            className="h-7 border-red-500/40 px-2 text-[10px] text-red-300 hover:bg-red-950/40"

            disabled={busy}

            onClick={onRemove}

          >

            <UserMinus className="mr-1 h-3 w-3" />

            Remove

          </Button>

        </div>

      )}

    </div>

  );

}


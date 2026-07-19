import type { LiveClassLobbyEntry } from "@/components/live/HostLiveLobbyBar";
import { participantDisplayName, type ZoomParticipant } from "@/components/live/zoomMeetingClient";

export function normalizeParticipantName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function participantMatchesLearner(
  participant: ZoomParticipant,
  learner: LiveClassLobbyEntry,
  hostDisplayName?: string | null,
): boolean {
  if (participant.isHost) return false;

  const participantName = normalizeParticipantName(
    participantDisplayName(participant, { hostName: hostDisplayName }),
  );
  const learnerName = normalizeParticipantName(learner.display_name);
  if (!participantName || !learnerName) return false;

  return (
    participantName === learnerName ||
    participantName.includes(learnerName) ||
    learnerName.includes(participantName)
  );
}

export function filterPendingLobbyLearners(
  learners: LiveClassLobbyEntry[],
  inMeeting: ZoomParticipant[],
  hostDisplayName?: string | null,
): LiveClassLobbyEntry[] {
  return learners.filter(
    (learner) => !inMeeting.some((p) => participantMatchesLearner(p, learner, hostDisplayName)),
  );
}

export function findWaitingParticipantForLearner(
  waitingRoom: ZoomParticipant[],
  learner: LiveClassLobbyEntry,
  hostDisplayName?: string | null,
): ZoomParticipant | undefined {
  return waitingRoom.find((p) => participantMatchesLearner(p, learner, hostDisplayName));
}

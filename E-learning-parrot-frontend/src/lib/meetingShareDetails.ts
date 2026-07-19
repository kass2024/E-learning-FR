import { absoluteAppUrl, materialEmbedRoom } from "@/lib/zoomEmbedRoutes";

export type MeetingShareDetails = {
  title: string;
  courseTitle?: string | null;
  meetingId: string;
  passcode?: string;
  learnerPortalUrl: string;
  learnerJoinUrl?: string | null;
  shareText: string;
};

export function formatZoomMeetingId(meetingNumber: string): string {
  const digits = String(meetingNumber).replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return digits || meetingNumber;
}

export function buildLiveClassMeetingShare(input: {
  title: string;
  courseTitle?: string | null;
  meetingNumber: string;
  passcode?: string | null;
  materialId?: number;
}): MeetingShareDetails {
  const learnerPortalUrl = absoluteAppUrl("/dashboard/learner/live-classes");
  const learnerJoinPath = input.materialId ? materialEmbedRoom(input.materialId, 0) : null;
  const learnerJoinUrl = learnerJoinPath ? absoluteAppUrl(learnerJoinPath) : null;
  const meetingId = formatZoomMeetingId(input.meetingNumber);
  const passcode = input.passcode?.trim() || undefined;

  const lines = [
    input.title,
    input.courseTitle ? `Course: ${input.courseTitle}` : "",
    `Meeting ID: ${meetingId}`,
    passcode ? `Passcode: ${passcode}` : "",
    "",
    "Learners: sign in to the learning portal, open Live Classes, and join when the instructor starts the session.",
    learnerJoinUrl ? `In-app join link: ${learnerJoinUrl}` : "",
    `Learner portal: ${learnerPortalUrl}`,
  ].filter((line) => line !== "");

  return {
    title: input.title,
    courseTitle: input.courseTitle,
    meetingId,
    passcode,
    learnerPortalUrl,
    learnerJoinUrl,
    shareText: lines.join("\n"),
  };
}

export async function copyMeetingText(
  value: string,
  label: string,
  toast: (opts: { title: string; description?: string; variant?: "destructive" }) => void,
) {
  try {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  } catch {
    toast({ variant: "destructive", title: "Copy failed", description: `Could not copy ${label.toLowerCase()}.` });
  }
}

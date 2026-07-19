import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Monitor, Share2, Users, Video } from "lucide-react";
import type { LiveZoomCohortZoomDetails } from "@/api/axios";
import { resolvePublicJoinUrl } from "@/lib/publicJoinUrl";
import { cohortHostStudio, cohortPublicJoin, openZoomMeetingInNewTab } from "@/lib/zoomEmbedRoutes";

type Props = {
  zoom: LiveZoomCohortZoomDetails;
  cohortId?: number;
};

async function copyText(value: string, label: string, toast: ReturnType<typeof useToast>["toast"]) {
  try {
    await navigator.clipboard.writeText(value);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  } catch {
    toast({ variant: "destructive", title: "Copy failed", description: `Could not copy ${label.toLowerCase()}.` });
  }
}

export function ZoomSessionSharePanel({ zoom, cohortId }: Props) {
  const { toast } = useToast();
  const [sharing, setSharing] = useState(false);
  const isDaily = (zoom.provider ?? "").toLowerCase() === "daily";
  const shareText = zoom.share_text || zoom.description || "";
  const publicJoinUrl = resolvePublicJoinUrl(zoom.public_join_url || (cohortId ? cohortPublicJoin(cohortId) : null));
  const registrationUrl = resolvePublicJoinUrl(zoom.registration_url);
  const participantRoomPath = zoom.participant_room_path || null;
  const participantRoomUrl =
    zoom.participant_room_url ||
    (participantRoomPath ? `${window.location.origin}${participantRoomPath}` : null);
  const hostStudioPath = zoom.host_studio_path || (cohortId ? cohortHostStudio(cohortId) : null);
  const hostStudioUrl = zoom.host_studio_url || (hostStudioPath ? `${window.location.origin}${hostStudioPath}` : null);
  const meetingIdLabel = isDaily ? "Room name" : "Meeting ID";
  const meetingIdValue = zoom.meeting_id || zoom.room_name || "";

  const handleShare = async () => {
    if (!shareText && !publicJoinUrl) return;
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: zoom.topic || (isDaily ? "Live Cohort" : "Live Zoom Cohort"),
          text: shareText || "Join our live cohort session.",
          url: publicJoinUrl || undefined,
        });
      } else {
        await copyText(publicJoinUrl || shareText, "Share link", toast);
      }
    } catch {
      // User cancelled share dialog — ignore.
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`rounded-lg border p-3 text-sm space-y-1 ${
          isDaily ? "bg-sky-50/70 dark:bg-sky-950/20" : "bg-emerald-50/60 dark:bg-emerald-950/20"
        }`}
      >
        <p className="font-medium flex items-center gap-2">
          <Monitor className="h-4 w-4" />
          {isDaily ? "In-app Daily (cloud video)" : "In-app Zoom (Meeting SDK)"}
        </p>
        <p className="text-muted-foreground text-xs">
          {isDaily
            ? "Hosts and learners join inside the web app with Daily — share the public join page, not daily.co links."
            : "Hosts and learners join inside the web app — no Zoom desktop client required. Same SDK auth endpoints power Android later."}
        </p>
      </div>

      <div className="rounded-lg border bg-muted/20 p-3 text-sm space-y-1">
        <p className="font-medium">{zoom.topic}</p>
        {zoom.schedule?.day && (
          <p className="text-muted-foreground">
            {zoom.schedule.day} · {String(zoom.schedule.start_time).slice(0, 5)} –{" "}
            {String(zoom.schedule.end_time).slice(0, 5)}
            {zoom.schedule.timezone ? ` (${zoom.schedule.timezone})` : ""}
          </p>
        )}
      </div>

      {hostStudioPath && (
        <div className="space-y-2">
          <Label>Host studio (in-app)</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => {
                if (!hostStudioPath) return;
                openZoomMeetingInNewTab(hostStudioPath, {
                  beginLaunch: false,
                  launchTitle: zoom.share_text || zoom.description || "Live cohort",
                  isHost: true,
                });
              }}
            >
              <Video className="mr-2 h-4 w-4" />
              {cohortId ? "Start Live cohort" : "Open host studio"}
            </Button>
            {hostStudioUrl && (
              <Button type="button" variant="outline" onClick={() => void copyText(hostStudioUrl, "Host studio link", toast)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </Button>
            )}
          </div>
        </div>
      )}

      {meetingIdValue && (
        <div className="space-y-2">
          <Label>{meetingIdLabel}</Label>
          <div className="flex gap-2">
            <Input readOnly value={meetingIdValue} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void copyText(meetingIdValue, meetingIdLabel, toast)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {!isDaily && zoom.password && (
        <div className="space-y-2">
          <Label>Passcode</Label>
          <div className="flex gap-2">
            <Input readOnly value={zoom.password} />
            <Button type="button" variant="outline" size="icon" onClick={() => void copyText(zoom.password || "", "Passcode", toast)}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {registrationUrl && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Registration page
          </Label>
          <div className="flex gap-2">
            <Input readOnly value={registrationUrl} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void copyText(registrationUrl, "Registration link", toast)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link so new participants can register for the meeting.
          </p>
        </div>
      )}

      {participantRoomUrl && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Join in app (approved participants)
          </Label>
          <div className="flex gap-2">
            <Input readOnly value={participantRoomUrl} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void copyText(participantRoomUrl, "In-app join link", toast)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {isDaily
              ? "Approved registrants should use the personal join link from their email (or Copy join link on each row). That opens under their registered name."
              : "Approved registrants should use the personal join link from their email (or Copy join link on each row). That opens under their registered name."}
          </p>
        </div>
      )}

      {publicJoinUrl && !registrationUrl && (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Public join page (queue — no account required)
          </Label>
          <div className="flex gap-2">
            <Input readOnly value={publicJoinUrl} />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => void copyText(publicJoinUrl, "Public join link", toast)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this link with anyone — name, email, and phone required to join the queue. When admitted, they enter the
            in-app meeting room.
          </p>
        </div>
      )}

      {shareText && (
        <div className="space-y-2">
          <Label>Description / share text</Label>
          <Textarea readOnly value={shareText} rows={6} className="text-sm" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void copyText(shareText, "Description", toast)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy all details
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => void handleShare()} disabled={sharing}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

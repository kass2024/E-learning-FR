import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Link2, Share2 } from "lucide-react";
import type { MeetingShareDetails } from "@/lib/meetingShareDetails";
import { copyMeetingText } from "@/lib/meetingShareDetails";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: MeetingShareDetails | null;
};

export function MeetingHostInviteSheet({ open, onOpenChange, details }: Props) {
  const { toast } = useToast();

  if (!details) return null;

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: details.title,
          text: details.shareText,
          url: details.learnerJoinUrl || details.learnerPortalUrl,
        });
      } else {
        await copyMeetingText(details.shareText, "Meeting details", toast);
      }
    } catch {
      // User cancelled native share.
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Invite learners
          </SheetTitle>
          <SheetDescription>
            Copy meeting details and share the in-app join link after you have joined as host.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <p className="font-medium">{details.title}</p>
            {details.courseTitle ? (
              <p className="mt-1 text-xs text-muted-foreground">{details.courseTitle}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Meeting ID</Label>
            <div className="flex gap-2">
              <Input readOnly value={details.meetingId} className="font-mono text-sm" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copyMeetingText(details.meetingId.replace(/\s/g, ""), "Meeting ID", toast)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {details.passcode ? (
            <div className="space-y-2">
              <Label>Passcode</Label>
              <div className="flex gap-2">
                <Input readOnly value={details.passcode} className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void copyMeetingText(details.passcode!, "Passcode", toast)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          {details.learnerJoinUrl ? (
            <div className="space-y-2">
              <Label>In-app learner join link</Label>
              <div className="flex gap-2">
                <Input readOnly value={details.learnerJoinUrl} className="text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => void copyMeetingText(details.learnerJoinUrl!, "Learner join link", toast)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Learners must be signed in and enrolled. They complete join from Live Classes in the dashboard.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>Learner portal</Label>
            <div className="flex gap-2">
              <Input readOnly value={details.learnerPortalUrl} className="text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void copyMeetingText(details.learnerPortalUrl, "Learner portal link", toast)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Full invite text</Label>
            <Textarea readOnly value={details.shareText} rows={8} className="text-xs" />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copyMeetingText(details.shareText, "All meeting details", toast)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy all details
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleShare()}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

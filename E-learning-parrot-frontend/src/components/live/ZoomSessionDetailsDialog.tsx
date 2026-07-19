import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ZoomSessionSharePanel } from "@/components/live/ZoomSessionSharePanel";
import type { LiveZoomCohortZoomDetails } from "@/api/axios";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zoom: LiveZoomCohortZoomDetails | null;
  title?: string;
  description?: string;
  cohortId?: number;
};

export function ZoomSessionDetailsDialog({
  open,
  onOpenChange,
  zoom,
  title,
  description,
  cohortId,
}: Props) {
  const isDaily = (zoom?.provider ?? "").toLowerCase() === "daily";
  const resolvedTitle =
    title ?? (isDaily ? "Live cohort Daily details" : "Live cohort Zoom details");
  const resolvedDescription =
    description ??
    (isDaily
      ? "Share the public join page and open the in-app host studio — no external Daily links."
      : "Share the public join page and open the in-app host studio — no external Zoom links.");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{resolvedTitle}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        {zoom ? <ZoomSessionSharePanel zoom={zoom} cohortId={cohortId} /> : null}
      </DialogContent>
    </Dialog>
  );
}

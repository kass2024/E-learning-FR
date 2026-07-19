import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Mail, Video } from "lucide-react";

type BookingConfirmedDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  sessionLabel: string;
  timezoneLabel?: string | null;
};

export function BookingConfirmedDialog({
  open,
  onOpenChange,
  email,
  sessionLabel,
  timezoneLabel,
}: BookingConfirmedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden gap-0 border-slate-200">
        <div className="px-6 pt-8 pb-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0070D0]/10">
            <CheckCircle2 className="h-8 w-8 text-[#0070D0]" />
          </div>
          <DialogHeader className="space-y-2 text-center sm:text-center">
            <DialogTitle className="text-2xl font-bold text-[#0070D0]">Booking confirmed</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              <span className="inline-flex items-center justify-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                Email sent to <strong className="text-[#0070D0]">{email}</strong>
              </span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="mx-6 mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex gap-3">
            <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-2 text-center min-w-[52px]">
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#0070D0]">Booked</div>
              <div className="text-lg font-bold text-[#0070D0] leading-none mt-1">&#10003;</div>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#0070D0]">Online consultation</p>
              <p className="text-sm text-slate-700 mt-1 leading-snug">{sessionLabel}</p>
              {timezoneLabel && (
                <p className="text-xs text-slate-500 mt-1">{timezoneLabel}</p>
              )}
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <Video className="h-3.5 w-3.5 text-[#0070D0]" />
                Zoom (online) — join link in your email
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 px-6 py-4 sm:justify-center">
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-full bg-[#0070D0] hover:bg-[#0058A8] px-8"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

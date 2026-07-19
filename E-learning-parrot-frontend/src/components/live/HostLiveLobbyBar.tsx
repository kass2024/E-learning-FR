import { Users } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Switch } from "@/components/ui/switch";

import { Label } from "@/components/ui/label";



export type LiveClassLobbyEntry = {

  student_id: number;

  display_name: string;

  email?: string | null;

  checked_in_at?: string;

};



type Props = {

  waiting: LiveClassLobbyEntry[];

  zoomWaitingCount: number;

  autoAdmitEnabled?: boolean;

  autoAdmitBusy?: boolean;

  onToggleAutoAdmit?: (enabled: boolean) => void;

  onOpenPeople: () => void;

};



export function HostLiveLobbyBar({

  waiting,

  zoomWaitingCount,

  autoAdmitEnabled = false,

  autoAdmitBusy = false,

  onToggleAutoAdmit,

  onOpenPeople,

}: Props) {

  const total = Math.max(waiting.length, zoomWaitingCount);

  const showBar = total > 0 || autoAdmitEnabled;



  if (!showBar) return null;



  return (

    <div className="absolute left-0 right-0 top-0 z-[35] border-b border-amber-500/40 bg-amber-950/90 px-3 py-2 backdrop-blur-sm">

      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">

        <div className="flex min-w-0 items-center gap-2 text-amber-100">

          <Users className="h-4 w-4 shrink-0 text-amber-300" />

          <div className="min-w-0">

            <p className="text-xs font-semibold">

              {total > 0

                ? `${total} learner${total === 1 ? "" : "s"} waiting to join`

                : "Auto-admit is on — learners join without manual approval"}

            </p>

            <p className="truncate text-[10px] text-amber-200/80">

              {waiting.length > 0

                ? `${waiting

                    .slice(0, 3)

                    .map((w) => w.display_name)

                    .join(", ")}${waiting.length > 3 ? "…" : ""} — open People to admit`

                : zoomWaitingCount > 0

                  ? "Open People to admit learners from the waiting room"

                  : "New learners enter directly when auto-admit is enabled"}

            </p>

          </div>

        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-3">

          {onToggleAutoAdmit ? (

            <div className="flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-900/30 px-2 py-1">

              <Switch

                id="live-auto-admit"

                checked={autoAdmitEnabled}

                disabled={autoAdmitBusy}

                onCheckedChange={onToggleAutoAdmit}

              />

              <Label htmlFor="live-auto-admit" className="cursor-pointer text-[10px] text-amber-100">

                Auto-enter

              </Label>

            </div>

          ) : null}

          <Button

            size="sm"

            variant="outline"

            className="h-8 border-amber-400/40 bg-transparent text-xs text-amber-100 hover:bg-amber-900/50"

            onClick={onOpenPeople}

          >

            People

          </Button>

        </div>

      </div>

    </div>

  );

}


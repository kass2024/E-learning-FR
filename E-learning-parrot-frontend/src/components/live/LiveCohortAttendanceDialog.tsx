import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Loader2 } from "lucide-react";
import {
  getLiveZoomCohortAttendance,
  type AvailableScheduleRow,
  type LiveZoomCohortAttendanceEntry,
} from "@/api/axios";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cohort: AvailableScheduleRow | null;
};

export function LiveCohortAttendanceDialog({ open, onOpenChange, cohort }: Props) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<LiveZoomCohortAttendanceEntry[]>([]);
  const [attendedCount, setAttendedCount] = useState(0);
  const [total, setTotal] = useState(0);

  const loadAttendance = useCallback(async () => {
    if (!cohort?.id) return;
    setLoading(true);
    try {
      const data = await getLiveZoomCohortAttendance(cohort.id);
      setEntries(data.entries ?? []);
      setAttendedCount(data.attended_count ?? 0);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [cohort?.id]);

  useEffect(() => {
    if (!open || !cohort?.id) return;
    void loadAttendance();
  }, [open, cohort?.id, loadAttendance]);

  const exportCsv = () => {
    const header = ["Name", "Email", "Phone", "Type", "Status", "Joined", "Attended"];
    const rows = entries.map((entry) => [
      entry.display_name,
      entry.email ?? "",
      entry.phone ?? "",
      entry.is_guest ? "Guest" : "Learner",
      entry.status,
      entry.joined_at ?? "",
      entry.attended ? "Yes" : "No",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cohort-${cohort?.id ?? "attendance"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Attendance — {cohort?.notes || "Live cohort"}</DialogTitle>
          <DialogDescription>
            Everyone who joined the queue for this session. Attended = opened Zoom when it was their turn.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Badge variant="outline">{total} registered</Badge>
            <Badge className="bg-emerald-600 hover:bg-emerald-600">{attendedCount} attended</Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No attendance records yet.</p>
          ) : (
            <div className="border rounded-lg overflow-auto max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Name</th>
                    <th className="text-left px-3 py-2 font-medium">Email</th>
                    <th className="text-left px-3 py-2 font-medium">Phone</th>
                    <th className="text-left px-3 py-2 font-medium">Type</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-left px-3 py-2 font-medium">Attended</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-t">
                      <td className="px-3 py-2">{entry.display_name}</td>
                      <td className="px-3 py-2">{entry.email || "—"}</td>
                      <td className="px-3 py-2">{entry.phone || "—"}</td>
                      <td className="px-3 py-2">{entry.is_guest ? "Guest" : "Learner"}</td>
                      <td className="px-3 py-2 capitalize">{entry.status.replace("_", " ")}</td>
                      <td className="px-3 py-2">
                        {entry.attended ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-600">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="outline" onClick={() => void loadAttendance()} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={exportCsv} disabled={entries.length === 0}>
            <ClipboardList className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

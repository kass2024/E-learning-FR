import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AdminImpersonationState } from "@/lib/adminImpersonation";

interface AdminViewAsBannerProps {
  state: AdminImpersonationState;
  onExit: () => void;
}

const AdminViewAsBanner = ({ state, onExit }: AdminViewAsBannerProps) => {
  const roleLabel =
    state.viewAsRole === "instructor"
      ? "instructor"
      : state.viewAsRole === "partner_company"
        ? "partner institution"
        : "student";

  const actorLabel =
    state.adminRole.toLowerCase() === "partner_company" ? "Partner preview" : "Admin preview";

  const backLabel =
    state.adminRole.toLowerCase() === "partner_company"
      ? "Back to dashboard"
      : "Back to admin dashboard";

  return (
    <div className="sticky top-16 z-40 -mx-4 sm:-mx-6 mb-4 border-b border-amber-200/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 px-4 py-2.5 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-amber-950 sm:items-center">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 sm:mt-0" />
          <p>
            <span className="font-semibold">{actorLabel}</span>
            <span className="text-amber-900/80">
              {" "}
              — viewing as {roleLabel}{" "}
              <span className="font-medium text-amber-950">{state.viewAsName}</span>
            </span>
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 bg-white/90 text-amber-950 hover:bg-amber-100 hover:text-amber-950"
          onClick={onExit}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          {backLabel}
        </Button>
      </div>
    </div>
  );
};

export default AdminViewAsBanner;

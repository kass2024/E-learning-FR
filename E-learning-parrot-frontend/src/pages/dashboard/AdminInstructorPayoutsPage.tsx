import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import InstructorPayoutApprovalsPanel from "@/components/admin/InstructorPayoutApprovalsPanel";

const AdminInstructorPayoutsPage = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Instructor Payout Approvals"
        description="Review and approve instructor withdrawal requests before funds are sent."
      >
        <Button
          onClick={() => setRefreshKey((k) => k + 1)}
          className="bg-[#FCC400] hover:bg-[#E79A4D] text-slate-900"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </AdminPageHeader>

      <InstructorPayoutApprovalsPanel key={refreshKey} />
    </div>
  );
};

export default AdminInstructorPayoutsPage;

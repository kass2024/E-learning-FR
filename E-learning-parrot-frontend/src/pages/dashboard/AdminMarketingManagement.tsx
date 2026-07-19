import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPromoBannerSettings } from "@/components/admin/AdminPromoBannerSettings";
import { AdminStarPromoBannerSettings } from "@/components/admin/AdminStarPromoBannerSettings";

const AdminMarketingManagement = () => {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Marketing Management"
        description="Customize and publish advert banners on the public site — top strip and homepage star promo."
      />

      <AdminPromoBannerSettings />
      <AdminStarPromoBannerSettings />
    </div>
  );
};

export default AdminMarketingManagement;

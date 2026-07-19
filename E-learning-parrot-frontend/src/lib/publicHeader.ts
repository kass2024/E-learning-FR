/** Routes that show the public marketing header (navbar + promo banner). */
export function shouldShowPublicNavbar(pathname: string): boolean {
  const path = pathname.toLowerCase();

  if (path.startsWith("/dashboard")) return false;
  if (path.startsWith("/login/")) return false;
  if (path.startsWith("/join/")) return false;
  if (path.startsWith("/i/")) return false;
  if (path.startsWith("/live-cohort")) return false;
  if (path.startsWith("/meeting/")) return false;
  if (path.startsWith("/meeting-ended")) return false;
  if (path.startsWith("/payment/")) return false;
  if (path.startsWith("/verify/")) return false;

  return true;
}

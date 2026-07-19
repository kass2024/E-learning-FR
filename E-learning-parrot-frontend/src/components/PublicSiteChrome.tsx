import { useLocation } from "react-router-dom";
import { shouldShowPublicNavbar } from "@/lib/publicHeader";
import Navbar from "@/components/Navbar";

/** Persistent public header — stays mounted across public route changes. */
export function PublicSiteChrome() {
  const { pathname } = useLocation();
  if (!shouldShowPublicNavbar(pathname)) return null;
  return <Navbar />;
}

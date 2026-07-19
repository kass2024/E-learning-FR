import { NavLink } from "@/components/NavLink";

import { Button } from "@/components/ui/button";

import type { PlatformInstitutionInfo } from "@/api/axios";

import { resolveInstitutionLogoUrl } from "@/lib/institutionContext";

import { cn } from "@/lib/utils";

import { Building2, Globe, MapPin, LogIn, UserPlus } from "lucide-react";



type PortalMode = "join" | "login";



type Props = {

  institution: PlatformInstitutionInfo;

  mode?: PortalMode;

  className?: string;

};



const InstitutionJoinLayout = ({ institution, mode = "join", className }: Props) => {

  const logo = resolveInstitutionLogoUrl(institution);

  const slug = institution.slug?.trim().toLowerCase() || "";

  const isLogin = mode === "login";



  return (

    <header

      className={cn(

        "border-b border-white/10 bg-gradient-to-r from-[#0070D0] via-[#1A8AD8] to-[#0070D0] text-white shadow-lg",

        className,

      )}

    >

      <div className="container mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5 sm:py-6">

        <div className="flex min-w-0 items-center gap-3 sm:gap-4">

          {logo ? (

            <img

              src={logo}

              alt=""

              className="h-12 w-12 shrink-0 rounded-xl border border-white/20 bg-white object-cover shadow-md sm:h-14 sm:w-14"

            />

          ) : (

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-lg font-bold shadow-md sm:h-14 sm:w-14">

              {institution.name.charAt(0).toUpperCase()}

            </div>

          )}

          <div className="min-w-0">

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-xs">

              {isLogin ? "Institution sign in" : "Learner registration"}

            </p>

            <h1 className="truncate text-lg font-bold sm:text-2xl">{institution.name}</h1>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/75">

              {institution.website && (

                <span className="inline-flex max-w-[200px] items-center gap-1 truncate">

                  <Globe className="h-3 w-3 shrink-0" />

                  {institution.website.replace(/^https?:\/\//, "")}

                </span>

              )}

              {institution.address && (

                <span className="inline-flex max-w-[220px] items-center gap-1 truncate">

                  <MapPin className="h-3 w-3 shrink-0" />

                  {institution.address}

                </span>

              )}

              {!institution.website && !institution.address && (

                <span className="inline-flex items-center gap-1">

                  <Building2 className="h-3 w-3 shrink-0" />

                  Partner institution

                </span>

              )}

            </div>

          </div>

        </div>

        {slug && (

          <Button

            asChild

            variant="secondary"

            size="sm"

            className="shrink-0 rounded-full bg-white/95 text-[#0070D0] hover:bg-white"

          >

            <NavLink to={isLogin ? `/join/${slug}` : `/login/${slug}`}>

              {isLogin ? (

                <>

                  <UserPlus className="mr-1.5 h-4 w-4" />

                  Register

                </>

              ) : (

                <>

                  <LogIn className="mr-1.5 h-4 w-4" />

                  Log in

                </>

              )}

            </NavLink>

          </Button>

        )}

      </div>

    </header>

  );

};



export default InstitutionJoinLayout;



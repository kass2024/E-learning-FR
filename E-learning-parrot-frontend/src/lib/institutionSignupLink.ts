/** Public institution portal homepage URL. */

export function buildInstitutionPortalUrl(slug: string, origin = window.location.origin): string {

  const clean = slug.trim().toLowerCase();

  return `${origin.replace(/\/$/, "")}/i/${encodeURIComponent(clean)}`;

}



/** Public learner signup URL locked to one partner institution. */

export function buildInstitutionLearnerSignupUrl(slug: string, origin = window.location.origin): string {

  const clean = slug.trim().toLowerCase();

  return `${origin.replace(/\/$/, "")}/join/${encodeURIComponent(clean)}`;

}



/** Public learner login URL locked to one partner institution. */

export function buildInstitutionLearnerLoginUrl(slug: string, origin = window.location.origin): string {

  const clean = slug.trim().toLowerCase();

  return `${origin.replace(/\/$/, "")}/login/${encodeURIComponent(clean)}`;

}



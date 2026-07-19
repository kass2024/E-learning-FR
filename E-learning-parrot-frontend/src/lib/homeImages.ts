/**
 * Unique homepage images — each URL used exactly once on the landing page.
 * Topic-related Unsplash photos with stable IDs.
 */
export const HOME_UNIQUE_IMAGES = {
  heroMain:
    "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1400&q=80",
  heroSecondary:
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80",
  mission:
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
  liveClass: "/images/live-class.png",
  instructor:
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
  ctaBg:
    "https://images.unsplash.com/photo-1434030216411-0b7934c83407?auto=format&fit=crop&w=1600&q=80",

  examIelts: "/images/exams/ielts.png",
  examToefl: "/images/exams/toefl.png",
  examDuolingo: "/images/exams/duolingo.png",
  examPte: "/images/exams/pte.png",
  examSat: "/images/exams/sat.png",
  examCambridge: "/images/exams/cambridge.png",

  langEnglish:
    "https://images.unsplash.com/photo-1546410531-bb4ca6896d23?auto=format&fit=crop&w=600&q=80",
  langFrench:
    "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80",
  langGerman:
    "https://images.unsplash.com/photo-1467269209834-ffafee928ee4?auto=format&fit=crop&w=600&q=80",
  langKorean:
    "https://images.unsplash.com/photo-1534008897995-27a23e859048?auto=format&fit=crop&w=600&q=80",
  langChinese:
    "https://images.unsplash.com/photo-1528164344705-475426bed735?auto=format&fit=crop&w=600&q=80",
  langJapanese:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",

  featDashboard:
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=400&q=80",
  featEnroll:
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=400&q=80",
  featPayment:
    "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=400&q=80",
  featLive: "/images/student-live-classes.png",
  featVideo:
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80",
  featCert:
    "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80",

  avatarSandrine:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
  avatarEric:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  avatarIgnace:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",

  courseFallback1:
    "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80",
  courseFallback2:
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
  courseFallback3:
    "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
} as const;

/** Course card images — unique per slot, not used elsewhere on homepage */
export function getFeaturedCourseImage(index: number, title: string, apiImage?: string | null): string {
  if (apiImage?.trim()) return apiImage.trim();
  const t = title.toLowerCase();
  if (t.includes("ielts") || t.includes("toefl")) return HOME_UNIQUE_IMAGES.courseFallback1;
  if (t.includes("french")) return HOME_UNIQUE_IMAGES.courseFallback2;
  const fallbacks = [
    HOME_UNIQUE_IMAGES.courseFallback1,
    HOME_UNIQUE_IMAGES.courseFallback2,
    HOME_UNIQUE_IMAGES.courseFallback3,
  ];
  return fallbacks[index % fallbacks.length];
}

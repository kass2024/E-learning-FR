import { HUB } from "./hubConfig";
import { HOME_UNIQUE_IMAGES } from "./homeImages";

export const HOME_IMAGES = {
  heroMain: HOME_UNIQUE_IMAGES.heroMain,
  heroSecondary: HOME_UNIQUE_IMAGES.heroSecondary,
  marketplace: HOME_UNIQUE_IMAGES.mission,
  liveClass: HOME_UNIQUE_IMAGES.liveClass,
  certificate: HOME_UNIQUE_IMAGES.instructor,
  ctaBg: HOME_UNIQUE_IMAGES.ctaBg,
} as const;

export const HOME_MISSION = {
  vision:
    "F&R Rwanda Ltd — School of Fluency and Proficiency — helping learners master English, French, and Kinyarwanda through interactive online classes.",
  mission:
    "To deliver quality language education at affordable prices with experienced instructors, flexible schedules, and personalized feedback.",
} as const;

/** Flyer languages — Busuu-style picker (SVG flags work on all platforms) */
export const LANGUAGE_PROGRAMS = [
  {
    title: "English",
    subtitle: "Academic · Business · Everyday",
    flagCode: "gb",
    flagSrc: "/flags/gb.svg",
    search: "English",
    image: HOME_UNIQUE_IMAGES.langEnglish,
  },
  {
    title: "French",
    subtitle: "Conversation · DELF / DALF ready",
    flagCode: "fr",
    flagSrc: "/flags/fr.svg",
    search: "French",
    image: HOME_UNIQUE_IMAGES.langFrench,
  },
  {
    title: "Kinyarwanda",
    subtitle: "Communication · Culture · Confidence",
    flagCode: "rw",
    flagSrc: "/flags/rw.svg",
    search: "Kinyarwanda",
    image: HOME_UNIQUE_IMAGES.langKorean,
  },
] as const;

/** Busuu-style alternating feature posts */
export const FEATURE_POSTS = [
  {
    overline: "An interactive community",
    title: "Learn more together",
    body: "Go beyond the textbook. Practise pronunciation, gain cultural insights, and exchange language tips with instructors and fellow learners in live online classes.",
    image: HOME_UNIQUE_IMAGES.featEnroll,
    accent: "green" as const,
    mock: {
      title: "Live feedback",
      line: "Your instructor corrected your exercise.",
      badge: "Well done!",
    },
  },
  {
    overline: "Courses created by experts",
    title: "Learn with confidence",
    body: "Make real improvements with solid foundations in speaking, listening, reading, and writing — prepared for school, work, and everyday life.",
    image: HOME_UNIQUE_IMAGES.featDashboard,
    accent: "yellow" as const,
    mock: {
      title: "Checkpoint completed!",
      line: "You scored 100% on Chapter 1.",
      badge: "+20",
    },
  },
  {
    overline: "Immersive speaking practice",
    title: "Learn for real life",
    body: "Get instant feedback for lasting confidence. Live speaking practice helps you beat speaking anxiety with personalized guidance from qualified instructors.",
    image: HOME_UNIQUE_IMAGES.liveClass,
    accent: "sky" as const,
    mock: {
      title: "Speaking practice",
      line: "Original · You — pronunciation match",
      badge: "Perfect!",
    },
  },
  {
    overline: "Self-led learning",
    title: "Learn your way",
    body: "Whatever your reason for learning a language, you’re in control. Choose monthly, termly, or VIP one-on-one plans that fit your schedule.",
    image: HOME_UNIQUE_IMAGES.featVideo,
    accent: "green" as const,
    mock: {
      title: "Your study plan",
      line: "English · French · Kinyarwanda",
      badge: "Flexible",
    },
  },
] as const;

export const WHY_LEARN = [
  {
    title: "Experienced instructors",
    desc: "Learn with qualified teachers who give personalized feedback.",
  },
  {
    title: "Interactive online classes",
    desc: "Engaging live sessions that keep you speaking and progressing.",
  },
  {
    title: "Flexible schedules",
    desc: "Study at your pace with monthly, termly, or VIP options.",
  },
  {
    title: "Real-life confidence",
    desc: "Build communication skills for school, career, and daily life.",
  },
] as const;

export const STUDENT_FEATURES = [
  {
    title: "Student Dashboard",
    desc: "Track enrollments, classes, and progress in one place.",
    image: HOME_UNIQUE_IMAGES.featDashboard,
  },
  {
    title: "Course Enrollment",
    desc: "Browse language programs and apply online in minutes.",
    image: HOME_UNIQUE_IMAGES.featEnroll,
  },
  {
    title: "Secure Payments",
    desc: "Pay safely online for your language course.",
    image: HOME_UNIQUE_IMAGES.featPayment,
  },
  {
    title: "Live Classes",
    desc: "Join live sessions with expert language instructors.",
    image: HOME_UNIQUE_IMAGES.featLive,
  },
  {
    title: "HD Video Lessons",
    desc: "Watch lessons and download study resources anytime.",
    image: HOME_UNIQUE_IMAGES.featVideo,
  },
  {
    title: "Certificates",
    desc: "Earn a digital certificate when you complete your course.",
    image: HOME_UNIQUE_IMAGES.featCert,
  },
] as const;

export const LIVE_FEATURES = [
  "Live online language classes",
  "Recorded session playback",
  "Live Q&A with instructors",
  "Speaking practice & feedback",
] as const;

export const FEATURED_PROGRAM_FALLBACK = [
  {
    id: -1,
    title: "English Course",
    description:
      "Online English for fluency and proficiency. Monthly, termly, or VIP one-on-one options.",
    price: 100000 as number | string | null,
    duration: "Flexible",
    status: "Active",
    image: HOME_UNIQUE_IMAGES.langEnglish,
  },
  {
    id: -2,
    title: "French Course",
    description: "Online French for conversation and confidence — flexible schedules and interactive classes.",
    price: 100000,
    duration: "Flexible",
    status: "Active",
    image: HOME_UNIQUE_IMAGES.langFrench,
  },
  {
    id: -3,
    title: "Kinyarwanda Course",
    description: "Online Kinyarwanda for communication, culture, and everyday confidence.",
    price: 100000,
    duration: "Flexible",
    status: "Active",
    image: HOME_UNIQUE_IMAGES.langKorean,
  },
] as const;

export const STATS = [
  { value: "3", label: "Languages" },
  { value: "Live", label: "Online classes" },
  { value: "VIP", label: "One-on-one option" },
  { value: "RWF", label: "Affordable plans" },
] as const;

export const TESTIMONIALS = [
  {
    name: "Sandrine U.",
    role: "English learner",
    text: "The live classes and clear materials helped me speak with more confidence every week.",
    image: HOME_UNIQUE_IMAGES.avatarSandrine,
  },
  {
    name: "Eric N.",
    role: "French learner",
    text: "Friendly instructors, flexible scheduling, and real conversation practice — exactly what I needed.",
    image: HOME_UNIQUE_IMAGES.avatarEric,
  },
  {
    name: "Ignace M.",
    role: "Kinyarwanda learner",
    text: "F&R Rwanda made language learning practical and motivating. I use what I learn every day.",
    image: HOME_UNIQUE_IMAGES.avatarIgnace,
  },
] as const;

export const EXAM_PROGRAMS = [] as const;

export { HUB };

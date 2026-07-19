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
    "F&R Rwanda Ltd — School of Fluency and Proficiency — helping learners build language skills in English, French, and Kinyarwanda, succeed globally, and open doors to academic and career growth.",
  mission:
    "To deliver quality language education at affordable prices through interactive online classes, flexible schedules, and experienced instructors.",
} as const;

export const EXAM_PROGRAMS = [
  {
    title: "IELTS Preparation",
    desc: "Academic & general training with mock tests and speaking practice.",
    image: HOME_UNIQUE_IMAGES.examIelts,
  },
  {
    title: "TOEFL Preparation",
    desc: "Reading, listening, speaking, and writing for university admissions.",
    image: HOME_UNIQUE_IMAGES.examToefl,
  },
  {
    title: "Duolingo (DET)",
    desc: "Adaptive English test strategies and timed practice sessions.",
    image: HOME_UNIQUE_IMAGES.examDuolingo,
  },
  {
    title: "PTE Academic",
    desc: "Computer-based English proficiency for global study pathways.",
    image: HOME_UNIQUE_IMAGES.examPte,
  },
  {
    title: "SAT / GRE / GMAT",
    desc: "Structured prep for undergraduate and graduate admissions abroad.",
    image: HOME_UNIQUE_IMAGES.examSat,
  },
  {
    title: "Cambridge English",
    desc: "FCE, CAE, and CPE pathways with skills-based modules.",
    image: HOME_UNIQUE_IMAGES.examCambridge,
  },
] as const;

export const LANGUAGE_PROGRAMS = [
  {
    title: "English",
    subtitle: "Academic · Business · General",
    image: HOME_UNIQUE_IMAGES.langEnglish,
  },
  {
    title: "French",
    subtitle: "DELF / DALF Preparation",
    image: HOME_UNIQUE_IMAGES.langFrench,
  },
  {
    title: "German",
    subtitle: "Goethe · TestDaF",
    image: HOME_UNIQUE_IMAGES.langGerman,
  },
  {
    title: "Korean",
    subtitle: "TOPIK Preparation",
    image: HOME_UNIQUE_IMAGES.langKorean,
  },
  {
    title: "Chinese",
    subtitle: "HSK Preparation",
    image: HOME_UNIQUE_IMAGES.langChinese,
  },
  {
    title: "Japanese & More",
    subtitle: "JLPT · Spanish · Arabic",
    image: HOME_UNIQUE_IMAGES.langJapanese,
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
    desc: "Browse programs and apply online in minutes.",
    image: HOME_UNIQUE_IMAGES.featEnroll,
  },
  {
    title: "Secure Payments",
    desc: "Pay safely with Stripe for paid courses.",
    image: HOME_UNIQUE_IMAGES.featPayment,
  },
  {
    title: "Live Classes",
    desc: "Join Zoom sessions with expert instructors.",
    image: HOME_UNIQUE_IMAGES.featLive,
  },
  {
    title: "HD Video Lessons",
    desc: "Watch lessons and download study resources.",
    image: HOME_UNIQUE_IMAGES.featVideo,
  },
  {
    title: "Certificates",
    desc: "Earn digital certificates upon completion.",
    image: HOME_UNIQUE_IMAGES.featCert,
  },
] as const;

export const LIVE_FEATURES = [
  "Zoom live classes & webinars",
  "Recorded session playback",
  "Live Q&A with instructors",
  "Mock exams & assessments",
] as const;

/** Shown on homepage when the courses API is empty or unreachable */
export const FEATURED_PROGRAM_FALLBACK = [
  {
    id: -1,
    title: "Xander Class — IELTS & TOEFL Preparation",
    description:
      "Expert-led preparation for international English exams with mock tests and live speaking practice.",
    price: null as number | string | null,
    duration: "12 weeks",
    status: "Active",
    image: HOME_UNIQUE_IMAGES.examIelts,
  },
  {
    id: -2,
    title: "Xander French Class — TCF & TEF Preparation",
    description: "Structured French pathways for DELF, DALF, TCF, and TEF certification goals.",
    price: null,
    duration: "10 weeks",
    status: "Active",
    image: HOME_UNIQUE_IMAGES.examCambridge,
  },
  {
    id: -3,
    title: "Xander AI Mastery Class",
    description:
      "Master modern AI tools including ChatGPT and advanced workflows for study and career growth.",
    price: "300.00",
    duration: "6 weeks",
    status: "Active",
    image: HOME_UNIQUE_IMAGES.courseFallback1,
  },
] as const;

export const STATS = [
  { value: "10+", label: "Exam programs" },
  { value: "8+", label: "Languages" },
  { value: "Live", label: "Zoom classes" },
  { value: "Stripe", label: "Secure pay" },
] as const;

export const TESTIMONIALS = [
  {
    name: "Sandrine U.",
    role: "IELTS Candidate",
    text: "The live classes and structured materials helped me feel confident before my exam.",
    image: HOME_UNIQUE_IMAGES.avatarSandrine,
  },
  {
    name: "Eric N.",
    role: "French DELF Student",
    text: "Clear lessons, friendly instructors, and flexible scheduling — exactly what I needed.",
    image: HOME_UNIQUE_IMAGES.avatarEric,
  },
  {
    name: "Ignace M.",
    role: "Study Abroad Applicant",
    text: "F&R Rwanda connected me to the right program for my international goals.",
    image: HOME_UNIQUE_IMAGES.avatarIgnace,
  },
] as const;

export { HUB };

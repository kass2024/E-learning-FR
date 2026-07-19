import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { LanguageProvider } from "./context/LanguageContext";
import { PromoBannerProvider } from "./context/PromoBannerContext";
import { StarPromoBannerProvider } from "./context/StarPromoBannerContext";
import { PublicSiteChrome } from "./components/PublicSiteChrome";
import Index from "./pages/Index";
import Courses from "./pages/Courses";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import InstitutionPortalHome from "./pages/InstitutionPortalHome";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

const PaymentSuccess = lazyWithRetry(() => import("./pages/PaymentSuccess"));
const PaymentCancel = lazyWithRetry(() => import("./pages/PaymentCancel"));
const CertificateVerify = lazyWithRetry(() => import("./pages/CertificateVerify"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const PublicCohortJoin = lazyWithRetry(() => import("./pages/PublicCohortJoin"));
const MeetingRegistration = lazyWithRetry(() => import("./pages/MeetingRegistration"));
const InstitutionSignup = lazyWithRetry(() => import("./pages/InstitutionSignup"));
const InstitutionSignupSuccess = lazyWithRetry(() => import("./pages/InstitutionSignupSuccess"));
/** Meeting rooms — lazy so Zoom/Daily SDKs are not downloaded on login/home. */
const ZoomEmbedMeetingRoom = lazyWithRetry(() => import("./pages/ZoomEmbedMeetingRoom"));
const LiveCohortMeetingRoom = lazyWithRetry(() => import("./pages/LiveCohortMeetingRoom"));
const LiveCohortHostStudio = lazyWithRetry(() => import("./pages/LiveCohortHostStudio"));
const MeetingEnded = lazyWithRetry(() => import("./pages/MeetingEnded"));
const DailyReturn = lazyWithRetry(() => import("./pages/DailyReturn"));

import { ZoomLaunchBridge } from "@/components/live/ZoomLaunchBridge";

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <LanguageProvider>
        <BrowserRouter>
          <PromoBannerProvider>
            <StarPromoBannerProvider>
            <PublicSiteChrome />
            <ZoomLaunchBridge />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/about" element={<About />} />
              <Route path="/meeting-registration" element={<MeetingRegistration />} />
              <Route path="/live-cohort/:cohortId/join" element={<PublicCohortJoin />} />
              <Route path="/live-cohort/:cohortId/room" element={<LiveCohortMeetingRoom />} />
              <Route path="/live-cohort/:cohortId/host" element={<LiveCohortHostStudio />} />
              <Route path="/meeting/room" element={<ZoomEmbedMeetingRoom />} />
              <Route path="/meeting-ended" element={<MeetingEnded />} />
              <Route path="/daily/return" element={<DailyReturn />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login/:slug" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/join/:slug" element={<Signup />} />
              <Route path="/i/:slug" element={<InstitutionPortalHome />} />
              <Route path="/institution-signup" element={<InstitutionSignup />} />
              <Route path="/institution-signup/success" element={<InstitutionSignupSuccess />} />
              {/* Single layout route — keeps sidebar/shell mounted across sidebar navigation */}
              <Route path="/dashboard/*" element={<Dashboard />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/cancel" element={<PaymentCancel />} />
              <Route path="/verify/certificate/:courseId/:studentId" element={<CertificateVerify />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
            </StarPromoBannerProvider>
          </PromoBannerProvider>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { ZoomSdkStartingSpinner } from "@/components/live/ZoomSdkStartingSpinner";

import {
  getInstructorLiveClassPreviewSdkAuth,
  getInstructorLiveClassSdkAuth,
  getLearnerLiveClassSdkAuth,
  getWebinarHostSdkAuth,
  getZoomEmbedAuth,
  type ZoomMeetingBranding,
  type ZoomMeetingSdkAuth,
} from "@/api/axios";

import { LiveMeetingExperience } from "@/components/live/LiveMeetingExperience";
import type { DailyMeetingSdkAuth } from "@/components/live/DailyMeetingRoom";

import { ParticipantWaitingStage, type ParticipantBranding } from "@/components/live/ParticipantWaitingStage";

import type { HostBranding } from "@/components/live/HostWaitingStage";

import { HUB } from "@/lib/hubConfig";

import { buildZoomMeetingBranding } from "@/lib/zoomMeetingBranding";
import type { ZoomClientBranding } from "@/lib/zoomClientBranding";
import {
  institutionBrandingName,
  institutionLogoUrl,
  isStoredMainAdmin,
  prepareMainAdminZoomSession,
  refreshInstitutionBrandingFromApi,
  showsPlatformHubBranding,
} from "@/lib/institutionContext";
import { clearZoomLaunchPending } from "@/lib/zoomLaunchPending";
import { resolveZoomSdkJoinUserName } from "@/lib/zoomJoinDisplayName";
import { getAppDisplayName } from "@/lib/brandSanitize";
import { loadZoomClientSdk } from "@/lib/zoomClientLoader";

import { resolveLearnerEmail, resolveLearnerStudentId } from "@/lib/dashboardUser";

import { startHostRecordingAfterJoin } from "@/lib/hostRecordingAfterJoin";

import { useToast } from "@/components/ui/use-toast";

import "@/components/live/zoomClientMeeting.css";



type LiveClassMaterialMeta = {

  id: number;

  title?: string | null;

  course_title?: string | null;

  recording_enabled?: boolean;

};



type LiveClassSdkAuthResponse = {

  provider?: "zoom" | "daily";

  sdk: ZoomMeetingSdkAuth | DailyMeetingSdkAuth;

  material?: LiveClassMaterialMeta;

  preview?: boolean;

} & ZoomMeetingBranding & {
  session_title?: string | null;
  meeting_mode?: "meeting" | "webinar" | null;
};



const ZoomEmbedMeetingRoom = () => {

  const { toast } = useToast();

  const [searchParams] = useSearchParams();

  const navigate = useNavigate();



  const materialId = searchParams.get("material_id") ? Number(searchParams.get("material_id")) : undefined;

  const meetingNumber = searchParams.get("meeting_number") || undefined;

  const role = Number(searchParams.get("role") || "0") === 1 ? 1 : 0;

  const studentId = searchParams.get("student_id") ? Number(searchParams.get("student_id")) : undefined;

  const password = searchParams.get("password") || undefined;

  const webinarHost = searchParams.get("webinar_host") === "1";

  const preview = searchParams.get("preview") === "1";

  const userName = searchParams.get("user_name") || undefined;

  const userEmail = searchParams.get("user_email") || undefined;

  const useComponentView =

    searchParams.get("view") === "component" || searchParams.get("view") === "embed";



  const instructorEmail = useMemo(

    () => (typeof window !== "undefined" ? localStorage.getItem("parrot_user_email") ?? "" : ""),

    [],

  );

  const learnerEmail = useMemo(() => resolveLearnerEmail(), []);

  const storedStudentId = useMemo(() => resolveLearnerStudentId() || undefined, []);

  const storedUserName = useMemo(

    () => localStorage.getItem("parrot_user_name")?.trim() || undefined,

    [],

  );



  const isHost = (role === 1 && !preview) || webinarHost;



  const [loading, setLoading] = useState(true);

  const [sdk, setSdk] = useState<ZoomMeetingSdkAuth | DailyMeetingSdkAuth | null>(null);
  const [meetingProvider, setMeetingProvider] = useState<"zoom" | "daily">("daily");

  const [materialMeta, setMaterialMeta] = useState<LiveClassMaterialMeta | null>(null);

  const [hostBranding, setHostBranding] = useState<HostBranding | null>(null);

  const [participantBranding, setParticipantBranding] = useState<ParticipantBranding | null>(null);

  const [clientBranding, setClientBranding] = useState<ZoomClientBranding | null>(null);

  const [prejoinAvatarUrl, setPrejoinAvatarUrl] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [waitingForHost, setWaitingForHost] = useState(false);

  const [recordingRequested, setRecordingRequested] = useState(false);

  const [adminSessionTitle, setAdminSessionTitle] = useState<string | null>(null);
  const [adminMeetingMode, setAdminMeetingMode] = useState<"meeting" | "webinar" | null>(null);

  const guestInviteDisplayName = useMemo(() => {
    const fromUrlName = String(userName || "").trim();
    const fromUrlEmail = String(userEmail || "").trim();
    if (fromUrlName && fromUrlName.toLowerCase() !== "guest") return fromUrlName;
    if (fromUrlEmail) return fromUrlEmail;
    return fromUrlName || "";
  }, [userName, userEmail]);

  const isHubAdminRoom =
    Boolean(meetingNumber?.includes("-main-")) ||
    meetingNumber?.startsWith("admin-meet-main-") ||
    meetingNumber?.startsWith("admin-webinar-main-");

  // Preparing spinner runs before auth — never show a leftover partner institution
  // (e.g. Prime Gateway) when joining a main-platform admin meeting/webinar.
  const preparingUsesHubBrand =
    isHubAdminRoom || isStoredMainAdmin() || showsPlatformHubBranding();

  const preparingInstitutionName = preparingUsesHubBrand
    ? getAppDisplayName()
    : (clientBranding?.companyName ??
      hostBranding?.companyName ??
      participantBranding?.companyName ??
      institutionBrandingName() ??
      HUB.company);

  const preparingLogoUrl = preparingUsesHubBrand
    ? (clientBranding?.logoUrl ?? hostBranding?.avatarUrl ?? null)
    : (clientBranding?.logoUrl ??
      hostBranding?.avatarUrl ??
      participantBranding?.hostAvatarUrl ??
      institutionLogoUrl());

  const defaultAdminRoomTitle = useMemo(() => {
    if (materialId || webinarHost) return null;
    const mode =
      adminMeetingMode ||
      (meetingNumber?.includes("webinar") ? "webinar" : "meeting");
    const label = mode === "webinar" ? "Webinar" : "Meeting";
    return isHost ? `Host ${label.toLowerCase()}` : label;
  }, [adminMeetingMode, meetingNumber, materialId, webinarHost, isHost]);

  const meetingTitle =
    materialMeta?.title ||
    adminSessionTitle ||
    (webinarHost
      ? "Meeting Registration"
      : materialId
        ? isHost
          ? "Host live class"
          : "Live class"
        : defaultAdminRoomTitle || "Meeting");

  const backPath = webinarHost

    ? "/dashboard/appointments"

    : isHost

      ? "/dashboard/classes"

      : "/dashboard/learner/live-classes";



  const applyMeetingBranding = (

    auth: ZoomMeetingBranding | null | undefined,

    opts: { sessionTitle?: string | null; courseTitle?: string | null; fallbackName: string },

  ) => {

    const built = buildZoomMeetingBranding(auth, {

      isHost,

      fallbackName: opts.fallbackName,

      sessionTitle: opts.sessionTitle,

      courseTitle: opts.courseTitle,

    });

    setPrejoinAvatarUrl(built.avatarUrl);

    setHostBranding(built.hostBranding ?? null);

    setParticipantBranding(built.participantBranding ?? null);

    setClientBranding(built.clientBranding);

  };



  const applyAuthResponse = (auth: LiveClassSdkAuthResponse) => {
    const rawDaily = (auth.sdk ?? {}) as DailyMeetingSdkAuth;
    const resolvedMode = (rawDaily.meeting_mode || auth.meeting_mode || null) as
      | "meeting"
      | "webinar"
      | null;
    const resolvedSessionTitle = auth.session_title?.trim() || null;
    setAdminSessionTitle(resolvedSessionTitle);
    setAdminMeetingMode(resolvedMode);
    const looksDaily =
      auth.provider === "daily" ||
      (Boolean(String(rawDaily.join_url || rawDaily.room_url || "").trim()) &&
        Boolean(String(rawDaily.token || "").trim()));
    const provider = looksDaily ? "daily" : "zoom";
    setMeetingProvider(provider);

    if (provider === "daily") {
      const joinUrl = String(rawDaily.join_url || rawDaily.room_url || "").trim();
      const token = String(rawDaily.token || "").trim();
      if (!joinUrl || !token) {
        setError("Daily room was not prepared correctly. Refresh and try again.");
        setSdk(null);
        setLoading(false);
        return;
      }
      // Prefer explicit URL name/email (registrant personal invite). Do not reuse the
      // logged-in admin's localStorage name for participant joins.
      const dailyFallback =
        guestInviteDisplayName ||
        String(rawDaily.user_name || "").trim() ||
        (isHost ? String(storedUserName || "").trim() || "Instructor" : "Guest");
      const dailyDisplayName = isHost
        ? resolveZoomSdkJoinUserName(auth, { isHost: true, fallbackName: dailyFallback })
        : dailyFallback;
      setSdk({
        join_url: joinUrl,
        token,
        room_name: rawDaily.room_name || undefined,
        user_name: dailyDisplayName,
        role: isHost ? 1 : 0,
        meeting_mode: rawDaily.meeting_mode || resolvedMode || undefined,
      });
      if (auth.material) setMaterialMeta(auth.material);
      else if (webinarHost) setMaterialMeta(null);
      applyMeetingBranding(auth, {
        sessionTitle: webinarHost ? "Meeting Registration" : resolvedSessionTitle || auth.material?.title,
        courseTitle: auth.material?.course_title,
        fallbackName: dailyDisplayName,
      });
      return;
    }

    const zoomSdk = auth.sdk as ZoomMeetingSdkAuth;
    const fallbackName =
      guestInviteDisplayName ||
      zoomSdk.user_name ||
      (isHost ? storedUserName || "Instructor" : "Guest");
    const nextSdk = {
      ...zoomSdk,
      user_name: resolveZoomSdkJoinUserName(auth, { isHost, fallbackName }),
    };

    setSdk(nextSdk);

    if (auth.material) setMaterialMeta(auth.material);
    else if (webinarHost) setMaterialMeta(null);

    applyMeetingBranding(auth, {
      sessionTitle: webinarHost ? "Meeting Registration" : resolvedSessionTitle || auth.material?.title,
      courseTitle: auth.material?.course_title,
      fallbackName: nextSdk.user_name || (isHost ? storedUserName || "Instructor" : "Guest"),
    });
  };



  const loadSdk = useCallback(async () => {

    setLoading(true);

    setError(null);

    setWaitingForHost(false);



    try {

      void loadZoomClientSdk().catch(() => undefined);
      prepareMainAdminZoomSession();
      if (!isStoredMainAdmin() && !isHubAdminRoom) {
        await refreshInstitutionBrandingFromApi(instructorEmail || learnerEmail || undefined).catch(() => undefined);
      }

      if (webinarHost) {
        // Host joins as institution / main admin — never as a registrant.
        const auth = await getWebinarHostSdkAuth(userName || storedUserName || undefined);
        applyAuthResponse(auth as LiveClassSdkAuthResponse);
        return;
      }

      if (materialId) {

        if (preview && instructorEmail) {

          const auth = await getInstructorLiveClassPreviewSdkAuth(materialId, instructorEmail);

          applyAuthResponse(auth);

          return;

        }



        if (role === 1) {

          if (!instructorEmail) {

            setError("Sign in as an instructor to host this class.");

            setSdk(null);

            return;

          }

          const auth = await getInstructorLiveClassSdkAuth(materialId, instructorEmail);

          applyAuthResponse(auth);

          return;

        }



        const effectiveStudentId = resolveLearnerStudentId(studentId);

        if (!effectiveStudentId && !learnerEmail) {

          setError("Sign in as a learner to join this class.");

          setSdk(null);

          return;

        }



        try {

          const auth = await getLearnerLiveClassSdkAuth(

            materialId,

            effectiveStudentId,

            learnerEmail || undefined,

          );

          applyAuthResponse(auth);

        } catch (err: unknown) {

          const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;

          if (/not live yet|wait for the instructor/i.test(message || "")) {

            setWaitingForHost(true);

            setSdk(null);

            setMaterialMeta((prev) => prev ?? { id: materialId, title: "Live class" });

            return;

          }

          throw err;

        }

        return;

      }



      if (meetingNumber) {
        const auth = await getZoomEmbedAuth({
          meeting_number: meetingNumber,
          role,
          password,
          user_name:
            userName ||
            (role === 1
              ? storedUserName || "Host"
              : guestInviteDisplayName || userEmail || "Guest"),
          user_email: userEmail,
          instructor_email: role === 1 ? instructorEmail || undefined : undefined,
        });
        applyAuthResponse(auth as LiveClassSdkAuthResponse);
        return;
      }



      setError("Invalid meeting link.");

      setSdk(null);

    } catch (err: unknown) {

      const ax = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const message = ax?.response?.data?.message;
      const status = ax?.response?.status;
      setError(
        message && message !== "Server Error"
          ? message
          : status
            ? `Unable to start in-app meeting (HTTP ${status}).`
            : ax?.message || "Unable to start in-app meeting.",
      );

      setSdk(null);

    } finally {

      setLoading(false);

    }

  }, [

    webinarHost,

    materialId,

    preview,

    role,

    instructorEmail,

    studentId,

    storedStudentId,

    learnerEmail,

    meetingNumber,

    password,

    userName,

    userEmail,

    guestInviteDisplayName,

    isHubAdminRoom,

  ]);



  useEffect(() => {

    void loadSdk();

  }, [loadSdk]);



  useLayoutEffect(() => {
    clearZoomLaunchPending();
    return () => clearZoomLaunchPending();
  }, []);



  useEffect(() => {

    if (!waitingForHost) return;

    const timer = window.setInterval(() => void loadSdk(), 5000);

    return () => window.clearInterval(timer);

  }, [waitingForHost, loadSdk]);



  const handleHostJoined = useCallback(() => {

    if (!isHost || preview || !materialId || !instructorEmail) return;

    if (recordingRequested) return;



    const wantsRecording =

      materialMeta?.recording_enabled === true ||

      searchParams.get("record") === "1";



    if (!wantsRecording) return;



    setRecordingRequested(true);

    void startHostRecordingAfterJoin(materialId, instructorEmail).then((ok) => {

      if (ok) {

        toast({

          title: "Cloud recording started",

          description: "Recording is active for this live class.",

        });

      } else {

        toast({

          variant: "destructive",

          title: "Recording not started yet",

          description: "Use the Record control in the Zoom toolbar if needed.",

        });

      }

    });

  }, [

    instructorEmail,

    isHost,

    materialId,

    materialMeta?.recording_enabled,

    preview,

    recordingRequested,

    searchParams,

    toast,

  ]);



  return (

    <div
      className={`zoom-client-meeting-page${
        meetingProvider === "daily" || Boolean(error) || waitingForHost
          ? " zoom-client-meeting-page--interactive"
          : ""
      }`}
    >

      {loading && !waitingForHost && !sdk ? (

        <ZoomSdkStartingSpinner
          active
          phase="preparing"
          isHost={isHost}
          meetingTitle={meetingTitle}
          institutionName={preparingInstitutionName}
          logoUrl={preparingLogoUrl}
          fullscreen
        />

      ) : waitingForHost && materialId ? (

        <div className="zoom-client-meeting-loading">

          <ParticipantWaitingStage

            branding={

              participantBranding ?? {

                name: storedUserName || "Learner",

                companyName: materialMeta?.course_title || HUB.name,

                cohortTitle: materialMeta?.title || undefined,

              }

            }

            mode="host_waiting"

          />

        </div>

      ) : error && !sdk ? (

        <div className="zoom-client-meeting-loading zoom-client-meeting-loading--interactive px-6">

          <div className="w-full max-w-md space-y-4 rounded-xl border border-red-900/50 bg-[#232323] p-8 text-center">

            <p className="text-red-300">{error}</p>

            <div className="flex flex-wrap justify-center gap-2">

              <Button type="button" className="bg-[#0e72ed] hover:bg-[#0b5fc7]" onClick={() => void loadSdk()}>

                Try again

              </Button>

              <Button type="button" variant="ghost" className="text-zinc-300 hover:bg-white/10" onClick={() => navigate(backPath)}>

                Go back

              </Button>

            </div>

          </div>

        </div>

      ) : sdk ? (

        <LiveMeetingExperience
          key={`${meetingProvider}-${"meeting_number" in sdk ? sdk.meeting_number : sdk.room_name}-${preview ? "preview" : role}-${useComponentView ? "component" : "client"}`}
          provider={meetingProvider}
          sdk={sdk}
          sdkView={useComponentView ? "component" : "client"}
          meetingTitle={meetingTitle}
          userName={
            "user_name" in sdk && sdk.user_name
              ? sdk.user_name
              : isHost
                ? storedUserName || "Instructor"
                : guestInviteDisplayName || "Guest"
          }
          avatarUrl={isHost ? prejoinAvatarUrl : null}
          isHost={isHost}
          shareUrl={
            typeof window !== "undefined"
              ? webinarHost
                ? `${window.location.origin}/meeting-registration`
                : meetingNumber
                ? `${window.location.origin}/meeting/room?meeting_number=${encodeURIComponent(
                    String(
                      ("room_name" in sdk && sdk.room_name) ||
                        meetingNumber ||
                        "",
                    ),
                  )}&role=0`
                : materialId
                  ? `${window.location.origin}/meeting/room?material_id=${materialId}&role=0`
                  : undefined
              : undefined
          }
          hostBranding={hostBranding ?? undefined}
          participantBranding={participantBranding ?? undefined}
          clientBranding={clientBranding}
          onJoined={handleHostJoined}
          onLeft={() => navigate(backPath)}
          onPrejoinCancel={() => navigate(backPath)}
          skipPrejoin={meetingProvider !== "daily"}
          materialId={materialId}
          hostEmail={instructorEmail}
          leaveDashboardLabel={webinarHost ? "Back to registrations" : "Back to dashboard"}
        />

      ) : null}

    </div>

  );

};



export default ZoomEmbedMeetingRoom;



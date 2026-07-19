import axios from "axios";
import type { StudentPayload } from "@/lib/models";
import type { PCloudDirectUploadConfig } from "@/lib/pcloudDirectUpload";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { getStoredInstitution } from "@/lib/institutionContext";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  const url = String(config.url ?? "");
  const isAuthRequest = /\/auth\/(login|register-student|register-instructor)(?:\?|$)/.test(url);

  const email = localStorage.getItem("parrot_user_email")?.trim();
  const role = (localStorage.getItem("parrot_user_role") ?? "").toLowerCase();
  const institution = getStoredInstitution();

  if (email && !isAuthRequest) {
    config.params = { ...(config.params ?? {}), user_email: email };
  }

  if (!isAuthRequest && role === "partner_company" && institution?.id) {
    config.params = {
      ...(config.params ?? {}),
      platform_institution_id: institution.id,
    };
  }

  const data = config.data;
  if (data && typeof data === "object" && !isAuthRequest) {
    if (data instanceof FormData) {
      if (email && !data.has("user_email")) data.append("user_email", email);
      if (role === "partner_company" && institution?.id && !data.has("platform_institution_id")) {
        data.append("platform_institution_id", String(institution.id));
      }
    } else {
      if (email && !("user_email" in data)) {
        (data as Record<string, unknown>).user_email = email;
      }
      if (role === "partner_company" && institution?.id && !("platform_institution_id" in data)) {
        (data as Record<string, unknown>).platform_institution_id = institution.id;
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ------------------- DESTINATIONS -------------------
export const getDestinations = async () => {
  const response = await api.get("/destinations");
  return response.data;
};

export const createDestination = async (data: { name: string; description?: string }) => {
  const response = await api.post("/destinations", data);
  return response.data;
};

export const updateDestination = async (id: number, data: { name: string; description?: string }) => {
  const response = await api.put(`/destinations/${id}`, data);
  return response.data;
};

export const deleteDestination = async (id: number) => {
  const response = await api.delete(`/destinations/${id}`);
  return response.data;
};

// ------------------- INSTITUTIONS -------------------
export const getInstitutions = async () => {
  const response = await api.get("/institutions");
  return response.data;
};

export const createInstitution = async (data: any) => {
  // support FormData for multipart (logo upload)
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await api.post("/institutions", data, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
  return response.data;
};

export const updateInstitution = async (id: number, data: any) => {
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await api.post(`/institutions/${id}?_method=PUT`, data, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
  return response.data;
};

export const deleteInstitution = async (id: number) => {
  const response = await api.delete(`/institutions/${id}`);
  return response.data;
};

export const assignProgramLevelsToInstitution = async (institutionId: number, programLevelIds: number[]) => {
  const response = await api.put(`/institutions/${institutionId}/program-levels`, {
    program_level_ids: programLevelIds,
  });
  return response.data;
};

// Institution + Program Level specific fields of study
export const getFieldsForInstitutionProgramLevel = async (institutionId: number, programLevelId: number) => {
  const response = await api.get(`/institutions/${institutionId}/program-levels/${programLevelId}/fields`);
  return response.data; // { fields: number[] }
};

export const assignFieldsForInstitutionProgramLevel = async (
  institutionId: number,
  programLevelId: number,
  fieldIds: number[]
) => {
  const response = await api.put(
    `/institutions/${institutionId}/program-levels/${programLevelId}/fields`,
    { field_ids: fieldIds }
  );
  return response.data;
};

// ------------------- PROGRAM LEVELS -------------------
export const getProgramLevels = async () => {
  const response = await api.get("/program-levels");
  return response.data;
};

export const createProgramLevel = async (data: { name: string; institution_ids?: number[]; field_ids?: number[]; category_ids?: number[]; intake_ids?: number[] }) => {
  const response = await api.post("/program-levels", data);
  return response.data;
};

export const updateProgramLevel = async (id: number, data: { name: string; institution_ids?: number[]; field_ids?: number[]; category_ids?: number[]; intake_ids?: number[] }) => {
  const response = await api.put(`/program-levels/${id}`, data);
  return response.data;
};

export const deleteProgramLevel = async (id: number) => {
  const response = await api.delete(`/program-levels/${id}`);
  return response.data;
};

// ------------------- PROGRAM LEVEL CATEGORIES -------------------
export const getProgramLevelCategories = async () => {
  const response = await api.get("/categories");
  return response.data;
};

export const createProgramLevelCategory = async (data: { name: string }) => {
  const response = await api.post("/categories", data);
  return response.data;
};

export const updateProgramLevelCategory = async (id: number, data: { name: string }) => {
  const response = await api.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteProgramLevelCategory = async (id: number) => {
  const response = await api.delete(`/categories/${id}`);
  return response.data;
};

// ------------------- FIELDS OF STUDY -------------------
export const getFields = async () => {
  const response = await api.get("/fields");
  return response.data;
};

export const createField = async (data: { name: string }) => {
  const response = await api.post("/fields", data);
  return response.data;
};

export const updateField = async (id: number, data: { name: string }) => {
  const response = await api.put(`/fields/${id}`, data);
  return response.data;
};

export const deleteField = async (id: number) => {
  const response = await api.delete(`/fields/${id}`);
  return response.data;
};

// ------------------- INTAKES -------------------
export const getIntakes = async () => {
  const response = await api.get("/intakes");
  return response.data;
};

export const createIntake = async (data: { name: string }) => {
  const response = await api.post("/intakes", data);
  return response.data;
};

export const updateIntake = async (id: number, data: { name: string }) => {
  const response = await api.put(`/intakes/${id}`, data);
  return response.data;
};

export const deleteIntake = async (id: number) => {
  const response = await api.delete(`/intakes/${id}`);
  return response.data;
};

// ------------------- INTAKES for Institution + Program Level + Field -------------------
export const getIntakesForInstitutionProgramLevelField = async (
  institutionId: number,
  programLevelId: number,
  fieldId: number
) => {
  const response = await api.get(
    `/institutions/${institutionId}/program-levels/${programLevelId}/fields/${fieldId}/intakes`
  );
  return response.data; // { intakes: number[] }
};

export const assignIntakesForInstitutionProgramLevelField = async (
  institutionId: number,
  programLevelId: number,
  fieldId: number,
  intakeIds: number[]
) => {
  const response = await api.put(
    `/institutions/${institutionId}/program-levels/${programLevelId}/fields/${fieldId}/intakes`,
    { intake_ids: intakeIds }
  );
  return response.data;
};

// ------------------- AGENTS -------------------
export type AgentPayload = { name: string; email: string; phone?: string; status?: string; students?: number; password?: string };

export const getAgents = async () => {
  const response = await api.get("/agents");
  return response.data;
};

export const createAgent = async (data: AgentPayload) => {
  const response = await api.post("/agents", data);
  return response.data;
};

export const updateAgent = async (id: number, data: AgentPayload) => {
  const response = await api.put(`/agents/${id}`, data);
  return response.data;
};

export const deleteAgent = async (id: number) => {
  const response = await api.delete(`/agents/${id}`);
  return response.data;
};

export const loginAgent = async (email: string, password: string) => {
  const response = await api.post(`/agents/login`, { email, password });
  return response.data; // { message, agent }
};

// ------------------- AUTH (Unified) -------------------
export const loginUnified = async (
  username: string,
  password: string,
  opts?: { platformInstitutionId?: number | null; institutionSlug?: string | null },
) => {
  const body: Record<string, string | number> = { username, password };
  if (opts?.platformInstitutionId) {
    body.platform_institution_id = opts.platformInstitutionId;
  }
  if (opts?.institutionSlug?.trim()) {
    body.institution_slug = opts.institutionSlug.trim().toLowerCase();
  }
  const response = await api.post(`/auth/login`, body);
  return response.data as { message: string; role: 'admin' | 'instructor' | 'learner'; user: any };
};

export type MeetingRegistrationPayload = {
  full_name: string;
  email: string;
  phone?: string;
  country?: string;
  learner_timezone?: string;
  notes?: string;
  available_schedule_id?: number | null;
  meeting_at?: string | null;
  schedule_label?: string | null;
  destination_countries?: string;
};

export const submitMeetingRegistration = async (payload: MeetingRegistrationPayload) => {
  const response = await api.post(`/meeting-registrations`, payload);
  return response.data;
};

export type MeetingRegistrationRow = {
  id: number;
  user_id?: number | null;
  available_schedule_id?: number | null;
  full_name: string;
  email: string;
  phone?: string | null;
  country?: string | null;
  notes?: string | null;
  status?: string | null;
  rejected_reason?: string | null;
  zoom_meeting_id?: string | null;
  zoom_join_url?: string | null;
  zoom_start_time?: string | null;
  schedule_label?: string | null;
  availableSchedule?: {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    meeting_duration_minutes?: number | null;
    timezone?: string | null;
    is_active?: boolean;
    notes?: string | null;
  } | null;
  created_at?: string;
  updated_at?: string;
};

export const getMeetingRegistrations = async () => {
  const response = await api.get(`/meeting-registrations`, { params: { with_schedule: true } });
  return response.data as MeetingRegistrationRow[];
};

export const updateMeetingRegistration = async (
  id: number,
  payload: Partial<MeetingRegistrationPayload> & { status?: string }
) => {
  const response = await api.put(`/meeting-registrations/${id}`, payload);
  return response.data;
};

export const approveMeetingRegistration = async (id: number) => {
  const response = await api.post(`/meeting-registrations/${id}/approve`);
  return response.data;
};

export const rejectMeetingRegistration = async (id: number, reason: string) => {
  const response = await api.post(`/meeting-registrations/${id}/reject`, { reason });
  return response.data;
};

export const rescheduleMeetingRegistration = async (
  id: number,
  payload: { available_schedule_id?: number | null; message?: string | null }
) => {
  const response = await api.post(`/meeting-registrations/${id}/reschedule`, {
    available_schedule_id: payload.available_schedule_id ?? null,
    message: payload.message ?? null,
  });
  return response.data;
};

export const remindMeetingRegistration = async (id: number, message?: string) => {
  const response = await api.post(`/meeting-registrations/${id}/remind`, {
    message: message ?? null,
  });
  return response.data;
};

export const resendMeetingRegistrationJoinLink = async (id: number) => {
  const response = await api.post(`/meeting-registrations/${id}/resend-join-link`);
  return response.data;
};

export const deleteMeetingRegistration = async (id: number) => {
  const response = await api.delete(`/meeting-registrations/${id}`);
  return response.data;
};

export type WebinarStatus = {
  approved_participants: number;
  can_start: boolean;
  recording_enabled: boolean;
  join_url?: string | null;
  start_url?: string | null;
  zoom_meeting_id?: string | null;
  session_started_at?: string | null;
  zoom_scheduled_at?: string | null;
  session_active?: boolean;
  topic?: string;
  share_text?: string | null;
  password?: string | null;
  registration_url?: string;
  app_host_room_url?: string;
  app_participant_join_url?: string | null;
  app_host_room_path?: string;
  app_participant_join_path?: string | null;
};

export const getWebinarStatus = async () => {
  const response = await api.get(`/meeting-registrations/webinar/status`);
  return response.data as WebinarStatus;
};

export const startWebinar = async () => {
  const response = await api.post(`/meeting-registrations/webinar/start`);
  return response.data as WebinarStatus & {
    message?: string;
    start_url?: string;
    join_url?: string;
    zoom_meeting_id?: string | null;
  };
};

export const setWebinarRecording = async (enabled: boolean) => {
  const response = await api.post(`/meeting-registrations/webinar/recording`, { enabled });
  return response.data as { message?: string; recording_enabled: boolean };
};

export const getWebinarRecordings = async () => {
  const response = await api.get(`/meeting-registrations/webinar/recordings`);
  return response.data as { recordings: LearnerRecording[] };
};

// ------------------- AVAILABLE SCHEDULES -------------------

export type AvailableScheduleRow = {
  id: number;
  day_of_week: number; // 0=Sunday...6=Saturday
  available_on_date?: string | null;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  meeting_duration_minutes?: number | null;
  timezone?: string | null;
  is_active?: boolean;
  notes?: string | null;
  meeting_provider?: "zoom" | "daily" | null;
  zoom_link?: string | null;
  zoom_meeting_id?: string | null;
  zoom_start_url?: string | null;
  zoom_password?: string | null;
  zoom_description?: string | null;
  daily_room_name?: string | null;
  daily_room_url?: string | null;
  session_status?: "idle" | "live" | "ended" | null;
  session_started_at?: string | null;
  session_ended_at?: string | null;
  created_by?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type AvailableSchedulePayload = {
  day_of_week?: number;
  available_on_date: string;
  start_time: string;
  end_time: string;
  meeting_duration_minutes?: number;
  timezone?: string;
  is_active?: boolean;
  notes?: string;
  zoom_link?: string;
  meeting_provider?: "zoom" | "daily";
};

export type LiveZoomCohortQueueEntry = {
  id: number;
  student_id?: number | null;
  guest_token?: string | null;
  guest_email?: string | null;
  guest_phone?: string | null;
  is_guest?: boolean;
  display_name: string;
  status: string;
  queue_position: number;
  ahead_count: number;
  is_waiting: boolean;
  is_admitted: boolean;
  can_join: boolean;
  in_app_room_path?: string | null;
  joined_at?: string | null;
  admitted_at?: string | null;
  message?: string;
};

export type LiveZoomCohortAttendanceEntry = {
  id: number;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  is_guest: boolean;
  student_id?: number | null;
  status: string;
  attended: boolean;
  joined_at?: string | null;
  admitted_at?: string | null;
  attended_at?: string | null;
  released_at?: string | null;
};

export type CohortQueueParticipantParams = {
  student_id?: number;
  guest_token?: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
};

export type LiveZoomCohortSessionInfo = {
  cohort_id: number;
  session_status: "idle" | "live" | "ended";
  session_started_at?: string | null;
  session_ended_at?: string | null;
  is_live: boolean;
  waiting_count: number;
  in_session_count?: number;
  has_active_participant: boolean;
  current_participant?: string | null;
  host_in_meeting?: boolean;
  queue_enabled?: boolean;
  waiting_room_mode?: string;
  my_entry?: LiveZoomCohortQueueEntry | null;
};

export type LiveZoomCohortZoomDetails = {
  provider?: "zoom" | "daily" | string | null;
  topic?: string;
  meeting_id?: string | null;
  room_name?: string | null;
  join_url?: string | null;
  start_url?: string | null;
  password?: string | null;
  description?: string | null;
  share_text?: string | null;
  public_join_url?: string | null;
  embed_enabled?: boolean;
  host_studio_url?: string | null;
  host_studio_path?: string | null;
  participant_room_path?: string | null;
  participant_room_url?: string | null;
  registration_url?: string | null;
  schedule?: {
    day?: string;
    start_time?: string;
    end_time?: string;
    timezone?: string | null;
  };
};

export type MeetingCalendarConfig = {
  blocked_months: string[];
  blocked_dates: string[];
};

export type AvailableSchedulesResponse = {
  schedules: AvailableScheduleRow[];
  calendar: MeetingCalendarConfig;
};

export const getAvailableSchedules = async () => {
  const response = await api.get(`/available-schedules`);
  return response.data as AvailableScheduleRow[] | AvailableSchedulesResponse;
};

export const updateMeetingCalendar = async (payload: MeetingCalendarConfig) => {
  const response = await api.put(`/available-schedules/calendar`, payload);
  return response.data as { message: string; calendar: MeetingCalendarConfig };
};

// ------------------- PROMO BANNER -------------------
export type PromoBannerConfig = {
  published: boolean;
  headline: string | null;
  offer_text: string | null;
  coupon_code: string | null;
  link_url: string | null;
  background_color: string;
  countdown_ends_at: string | null;
  show_countdown: boolean;
  show_coupon: boolean;
  revision: number;
};

export const getPromoBanner = async () => {
  const response = await api.get(`/site-settings/promo-banner`);
  return response.data.banner as PromoBannerConfig;
};

export const updatePromoBanner = async (payload: {
  published?: boolean;
  headline?: string | null;
  offer_text?: string | null;
  coupon_code?: string | null;
  link_url?: string | null;
  background_color?: string;
  countdown_ends_at?: string | null;
  show_countdown?: boolean;
  show_coupon?: boolean;
}) => {
  const response = await api.put(`/site-settings/promo-banner`, payload);
  return response.data as { message: string; banner: PromoBannerConfig };
};

// ------------------- STAR PROMO BANNER -------------------
export type StarPromoBannerConfig = {
  published: boolean;
  line1: string | null;
  line2: string | null;
  link_url: string | null;
  background_color: string;
  text_color: string;
  expires_at: string | null;
  revision: number;
};

export const getStarPromoBanner = async () => {
  const response = await api.get(`/site-settings/star-promo-banner`);
  return response.data.banner as StarPromoBannerConfig;
};

export const updateStarPromoBanner = async (payload: {
  published?: boolean;
  line1?: string | null;
  line2?: string | null;
  link_url?: string | null;
  background_color?: string;
  text_color?: string;
  expires_at?: string | null;
}) => {
  const response = await api.put(`/site-settings/star-promo-banner`, payload);
  return response.data as { message: string; banner: StarPromoBannerConfig };
};

export const createAvailableSchedule = async (payload: AvailableSchedulePayload) => {
  const response = await api.post(`/available-schedules`, payload);
  return response.data;
};

export const bulkUpsertAvailableSchedules = async (payload: {
  dates: string[];
  start_time: string;
  end_time: string;
  meeting_duration_minutes?: number;
  timezone?: string;
  notes?: string;
  is_active?: boolean;
}) => {
  const response = await api.post(`/available-schedules/bulk`, payload);
  return response.data as { message: string; created: number; updated: number };
};

export const updateAvailableSchedule = async (id: number, payload: Partial<AvailableSchedulePayload>) => {
  const response = await api.put(`/available-schedules/${id}`, payload);
  return response.data;
};

export const deleteAvailableSchedule = async (id: number) => {
  const response = await api.delete(`/available-schedules/${id}`);
  return response.data;
};

// ------------------- STUDY SHIFTS -------------------

export type StudyShiftRow = {
  id: number;
  course_id: number | null;
  course_ids?: number[];
  courses?: Array<{ id: number; title?: string | null }>;
  course_title?: string | null;
  course_titles?: string[];
  name: string;
  day_of_week: number;
  day_label: string;
  start_time: string;
  end_time: string;
  timezone: string;
  max_students: number | null;
  enrolled_count: number;
  seats_available: number | null;
  is_full: boolean;
  is_active: boolean;
  notes?: string | null;
  label: string;
  created_by?: number | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  can_manage?: boolean;
};

export type StudyShiftDayGroup = {
  day_of_week: number;
  day_label: string;
  shifts: StudyShiftRow[];
};

export type StudyShiftTimeSlotPayload = {
  name: string;
  start_time: string;
  end_time: string;
};

export type StudyShiftPayload = {
  course_id?: number | null;
  course_ids?: number[];
  name: string;
  day_of_week?: number;
  days_of_week?: number[];
  time_slots?: StudyShiftTimeSlotPayload[];
  start_time: string;
  end_time: string;
  timezone: string;
  max_students?: number | null;
  is_active?: boolean;
  notes?: string | null;
  email?: string;
};

export const getStudyShifts = async (params?: {
  course_id?: number;
  active_only?: boolean;
  group_by_day?: boolean;
  manage?: boolean;
  email?: string;
  platform_institution_id?: number | null;
  ensure_defaults?: boolean;
}) => {
  const response = await api.get(`/study-shifts`, {
    params: {
      ...params,
      platform_institution_id: params?.platform_institution_id ?? undefined,
      ensure_defaults: params?.ensure_defaults ? 1 : undefined,
    },
    timeout: 10000,
  });
  const data = response.data;
  if (Array.isArray(data)) {
    return { study_shifts: data as StudyShiftRow[] };
  }
  return {
    study_shifts: Array.isArray(data?.study_shifts) ? data.study_shifts : [],
    by_day: Array.isArray(data?.by_day) ? data.by_day : undefined,
  };
};

export const createStudyShift = async (payload: StudyShiftPayload) => {
  const response = await api.post(`/study-shifts`, payload);
  return response.data as {
    message: string;
    study_shift: StudyShiftRow;
    study_shifts?: StudyShiftRow[];
  };
};

export const updateStudyShift = async (id: number, payload: Partial<StudyShiftPayload>) => {
  const response = await api.put(`/study-shifts/${id}`, payload);
  return response.data as { message: string; study_shift: StudyShiftRow };
};

export const deleteStudyShift = async (id: number, email?: string) => {
  const response = await api.delete(`/study-shifts/${id}`, { params: email ? { email } : undefined });
  return response.data;
};

// ------------------- LIVE ZOOM COHORT (separate table) -------------------

export const getLiveZoomCohorts = async () => {
  const response = await api.get(`/livezoom-cohort`);
  return response.data as AvailableScheduleRow[];
};

export const bulkUpsertLiveZoomCohorts = async (payload: {
  dates: string[];
  start_time: string;
  end_time: string;
  timezone?: string;
  notes?: string;
  is_active?: boolean;
}) => {
  const response = await api.post(`/livezoom-cohort/bulk`, payload);
  return response.data as { message: string; created: number; updated: number };
};

export const createLiveZoomCohort = async (payload: AvailableSchedulePayload) => {
  const response = await api.post(`/livezoom-cohort`, payload);
  return response.data;
};

export const updateLiveZoomCohort = async (id: number, payload: Partial<AvailableSchedulePayload>) => {
  const response = await api.put(`/livezoom-cohort/${id}`, payload);
  return response.data;
};

export const deleteLiveZoomCohort = async (id: number) => {
  const response = await api.delete(`/livezoom-cohort/${id}`);
  return response.data;
};

export const startLiveZoomCohortSession = async (id: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/start`);
  return response.data as {
    message: string;
    provider?: "zoom" | "daily";
    zoom?: LiveZoomCohortZoomDetails;
    daily?: LiveZoomCohortZoomDetails;
    session: LiveZoomCohortSessionInfo;
    slot: AvailableScheduleRow;
  };
};

export const getLiveZoomCohortZoomDetails = async (id: number) => {
  const response = await api.get(`/livezoom-cohort/${id}/zoom`);
  return response.data as { zoom: LiveZoomCohortZoomDetails; slot: AvailableScheduleRow };
};

export const endLiveZoomCohortSession = async (id: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/end`);
  return response.data as { message: string; session: LiveZoomCohortSessionInfo; slot: AvailableScheduleRow };
};

export const getLiveZoomCohortQueue = async (id: number) => {
  const response = await api.get(`/livezoom-cohort/${id}/queue`);
  return response.data as {
    session: LiveZoomCohortSessionInfo;
    current: LiveZoomCohortQueueEntry | null;
    in_session?: LiveZoomCohortQueueEntry[];
    in_session_count?: number;
    waiting: LiveZoomCohortQueueEntry[];
    waiting_count: number;
    admitted_ready?: LiveZoomCohortQueueEntry[];
    admitted_ready_count?: number;
  };
};

export const getLiveZoomCohortAttendance = async (id: number) => {
  const response = await api.get(`/livezoom-cohort/${id}/attendance`);
  return response.data as {
    cohort_id: number;
    cohort_title: string;
    session_status: string;
    session_started_at?: string | null;
    session_ended_at?: string | null;
    total: number;
    attended_count: number;
    entries: LiveZoomCohortAttendanceEntry[];
  };
};

export const releaseLiveZoomCohortParticipant = async (id: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/release`);
  return response.data;
};

export const releaseLiveZoomCohortQueueEntry = async (id: number, entryId: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/release/${entryId}`);
  return response.data as {
    message: string;
    released?: LiveZoomCohortQueueEntry;
    queue?: {
      session: LiveZoomCohortSessionInfo;
      current: LiveZoomCohortQueueEntry | null;
      in_session?: LiveZoomCohortQueueEntry[];
      waiting: LiveZoomCohortQueueEntry[];
      waiting_count: number;
      admitted_ready?: LiveZoomCohortQueueEntry[];
    };
  };
};

export const admitNextLiveZoomCohortWaiting = async (id: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/admit-next`);
  return response.data as {
    message: string;
    admitted: LiveZoomCohortQueueEntry | null;
    session: LiveZoomCohortSessionInfo;
    queue: {
      session: LiveZoomCohortSessionInfo;
      current: LiveZoomCohortQueueEntry | null;
      waiting: LiveZoomCohortQueueEntry[];
      waiting_count: number;
      admitted_ready?: LiveZoomCohortQueueEntry[];
    };
  };
};

export const admitAllLiveZoomCohortWaiting = async (id: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/admit-all`);
  return response.data as {
    message: string;
    admitted: LiveZoomCohortQueueEntry[];
    count: number;
    queue: {
      session: LiveZoomCohortSessionInfo;
      current: LiveZoomCohortQueueEntry | null;
      waiting: LiveZoomCohortQueueEntry[];
      waiting_count: number;
      admitted_ready?: LiveZoomCohortQueueEntry[];
    };
  };
};

export const admitLiveZoomCohortEntry = async (id: number, entryId: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/admit/${entryId}`);
  return response.data as {
    message: string;
    admitted: LiveZoomCohortQueueEntry;
    queue: {
      session: LiveZoomCohortSessionInfo;
      current: LiveZoomCohortQueueEntry | null;
      waiting: LiveZoomCohortQueueEntry[];
      waiting_count: number;
    };
  };
};

export const joinLiveZoomCohortQueue = async (id: number, participant: CohortQueueParticipantParams) => {
  const response = await api.post(`/livezoom-cohort/${id}/join`, participant);
  return response.data as { message: string; entry: LiveZoomCohortQueueEntry; session: LiveZoomCohortSessionInfo };
};

export type ZoomMeetingSdkAuth = {
  signature: string;
  sdk_key: string;
  meeting_number: string;
  password: string;
  password_candidates?: string[];
  user_name: string;
  user_email?: string | null;
  role: number;
  zak?: string | null;
};

export type LiveCohortPublicQueueSnapshot = {
  session_status: string;
  is_live: boolean;
  waiting_count: number;
  waiting: Array<{ id: number; display_name: string; queue_position: number; joined_at?: string | null }>;
  current_participant?: string | null;
  has_active_participant: boolean;
};

export const getPublicLiveCohortQueue = async (id: number) => {
  const response = await api.get(`/livezoom-cohort/${id}/queue/public`);
  return response.data as LiveCohortPublicQueueSnapshot;
};

export const getLiveZoomCohortParticipantSdkAuth = async (id: number, participant: CohortQueueParticipantParams) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/sdk-auth`, participant);
  return response.data as {
    provider?: "zoom" | "daily";
    sdk: ZoomMeetingSdkAuth | {
      provider?: string;
      join_url: string;
      token: string;
      room_name?: string;
      role?: number;
      user_name?: string;
    };
    entry: LiveZoomCohortQueueEntry;
    participant?: {
      name: string;
      avatar_url?: string | null;
    };
    cohort_title?: string;
  } & ZoomMeetingBranding;
};

export type LiveCohortHostBranding = ZoomMeetingBranding & {
  cohort_title?: string;
};

export const getLiveZoomCohortHostSdkAuth = async (
  id: number,
  options?: {
    hostName?: string;
    hostEmail?: string;
    forceRefresh?: boolean;
    meetingStale?: boolean;
    refreshHostProfile?: boolean;
  },
) => {
  const response = await api.post(`/livezoom-cohort/${id}/host/sdk-auth`, {
    host_name: options?.hostName,
    host_email: options?.hostEmail,
    force_refresh: options?.forceRefresh ?? false,
    meeting_stale: options?.meetingStale ?? false,
    refresh_host_profile: options?.refreshHostProfile ?? true,
  });
  return response.data as {
    provider?: "zoom" | "daily";
    sdk: ZoomMeetingSdkAuth | {
      provider?: string;
      join_url: string;
      token: string;
      room_name?: string;
      role?: number;
      user_name?: string;
    };
    queue: {
      session: LiveZoomCohortSessionInfo;
      current: LiveZoomCohortQueueEntry | null;
      waiting: LiveZoomCohortQueueEntry[];
      waiting_count: number;
      admitted_ready?: LiveZoomCohortQueueEntry[];
    };
    meeting_id?: string | null;
    meeting_refreshed?: boolean;
    zoom?: {
      api_ready?: boolean;
      embed_ready?: boolean;
    };
    daily?: {
      room_name?: string | null;
      room_url?: string | null;
    };
    backend_app?: string;
    host?: {
      name: string;
      email?: string;
      avatar_url?: string | null;
    };
    company?: { name?: string };
    cohort_title?: string;
  } & ZoomMeetingBranding;
};

export const markLiveCohortHostInMeeting = async (id: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/host/mark-in-meeting`);
  return response.data as {
    host_in_meeting: boolean;
    auto_admitted?: LiveZoomCohortQueueEntry | null;
    session: LiveZoomCohortSessionInfo;
    queue: {
      session: LiveZoomCohortSessionInfo;
      current: LiveZoomCohortQueueEntry | null;
      waiting: LiveZoomCohortQueueEntry[];
      waiting_count: number;
      admitted_ready?: LiveZoomCohortQueueEntry[];
    };
  };
};

export const markLiveCohortHostLeft = async (id: number) => {
  const response = await api.post(`/livezoom-cohort/${id}/host/mark-left`);
  return response.data as { message: string };
};

export const toggleLiveCohortRecording = async (id: number, action: "start" | "stop" | "pause" | "resume") => {
  const response = await api.post(`/livezoom-cohort/${id}/recording`, { action });
  return response.data;
};

export type ZoomEmbedConfig = {
  embed_enabled: boolean;
  sdk_key?: string | null;
  frontend_base?: string;
  platforms?: string[];
};

export const getZoomEmbedConfig = async () => {
  const response = await api.get(`/zoom/embed/config`);
  return response.data as ZoomEmbedConfig;
};

export type ZoomEmbedAuthParams = {
  material_id?: number;
  meeting_number?: string;
  user_name?: string;
  role?: 0 | 1;
  password?: string;
  instructor_email?: string;
  user_email?: string;
  platform_institution_id?: number;
  student_id?: number;
  webinar_host?: boolean;
};

export type PlatformInstitutionInfo = {
  id: number;
  name: string;
  slug: string;
  contact_email: string;
  contact_phone?: string | null;
  website?: string | null;
  address?: string | null;
  logo_url?: string | null;
  logo_path?: string | null;
  meeting_provider?: "zoom" | "daily" | string | null;
  status: string;
  payment_status: string;
  approved_at?: string | null;
  mail_use_custom?: boolean;
  mail_host?: string | null;
  mail_port?: number | null;
  mail_username?: string | null;
  mail_encryption?: string | null;
  mail_from_address?: string | null;
  mail_from_name?: string | null;
  mail_ehlo_domain?: string | null;
  mail_password_set?: boolean;
  admin_notes?: string | null;
  portal?: {
    tagline: string;
    hero_title: string;
    hero_subtitle: string;
    about: string;
    primary_color: string | null;
    accent_color?: string | null;
    hero_bg_color?: string | null;
    button_bg_color?: string | null;
    button_text_color?: string | null;
    features: Array<{ title: string; description: string }>;
    hero_image_url: string | null;
    cta_label: string;
  };
};

export type ZoomMeetingBranding = {
  host?: {
    name: string;
    email?: string | null;
    avatar_url?: string | null;
  };
  participant?: {
    name: string;
    avatar_url?: string | null;
  };
  company?: {
    name: string;
  };
  institution?: PlatformInstitutionInfo;
  use_institution_logo?: boolean;
  /** Backend: actor is platform admin/staff — use ZOOM_HOST_USER_ID profile, not institution logo. */
  is_main_platform_host?: boolean;
  session_title?: string;
};

export const getZoomEmbedAuth = async (params: ZoomEmbedAuthParams) => {
  const { zoomAuthInstitutionParams } = await import("@/lib/institutionContext");
  const response = await api.post(`/zoom/embed/auth`, { ...zoomAuthInstitutionParams(), ...params });
  return response.data as { sdk: ZoomMeetingSdkAuth } & ZoomMeetingBranding;
};

export const getInstructorLiveClassSdkAuth = async (materialId: number, instructorEmail: string) => {
  const { zoomAuthInstitutionParams } = await import("@/lib/institutionContext");
  const response = await api.post(`/instructor/live-classes/${materialId}/sdk-auth`, {
    instructor_email: instructorEmail,
    ...zoomAuthInstitutionParams(instructorEmail),
  });
  return response.data as {
    sdk: ZoomMeetingSdkAuth;
    material?: { id: number; title?: string | null; course_title?: string | null };
  } & ZoomMeetingBranding;
};

export const getInstructorLiveClassPreviewSdkAuth = async (materialId: number, instructorEmail: string) => {
  const { zoomAuthInstitutionParams } = await import("@/lib/institutionContext");
  const response = await api.post(`/instructor/live-classes/${materialId}/preview-sdk-auth`, {
    instructor_email: instructorEmail,
    ...zoomAuthInstitutionParams(instructorEmail),
  });
  return response.data as {
    sdk: ZoomMeetingSdkAuth;
    material?: { id: number; title?: string | null; course_title?: string | null };
    preview?: boolean;
  } & ZoomMeetingBranding;
};

export const getLearnerLiveClassSdkAuth = async (
  materialId: number,
  studentId: number,
  learnerEmail?: string,
) => {
  const { zoomAuthInstitutionParams } = await import("@/lib/institutionContext");
  const response = await api.post(`/learner/live-classes/${materialId}/sdk-auth`, {
    student_id: studentId > 0 ? studentId : undefined,
    learner_email: learnerEmail || undefined,
    ...zoomAuthInstitutionParams(),
  });
  return response.data as {
    sdk: ZoomMeetingSdkAuth;
    material?: {
      id: number;
      title?: string | null;
      course_title?: string | null;
      recording_enabled?: boolean;
    };
  } & ZoomMeetingBranding;
};

export const getWebinarHostSdkAuth = async (userName?: string, options?: { refreshHostProfile?: boolean }) => {
  const { zoomAuthInstitutionParams } = await import("@/lib/institutionContext");
  const response = await api.post(`/meeting-registrations/webinar/sdk-auth`, {
    user_name: userName,
    refresh_host_profile: options?.refreshHostProfile ?? true,
    ...zoomAuthInstitutionParams(),
  });
  return response.data as {
    provider?: "zoom" | "daily";
    sdk: ZoomMeetingSdkAuth | {
      join_url?: string;
      room_url?: string;
      token?: string;
      room_name?: string;
      user_name?: string;
      role?: number;
    };
  } & ZoomMeetingBranding;
};

export const getPublicLiveCohortSession = async (id: number) => {
  const response = await api.get(`/livezoom-cohort/${id}/public`);
  return response.data as {
    cohort: {
      id: number;
      title: string;
      session_status: string;
      is_live: boolean;
      day?: string;
      start_time?: string;
      end_time?: string;
      timezone?: string | null;
    };
    session: LiveZoomCohortSessionInfo;
    queue?: LiveCohortPublicQueueSnapshot;
    public_join_url: string;
    guest_join_allowed: boolean;
    embedded_meeting_enabled?: boolean;
  };
};

export const getLiveZoomCohortQueueStatus = async (id: number, participant: CohortQueueParticipantParams) => {
  const response = await api.get(`/livezoom-cohort/${id}/queue/status`, { params: participant });
  return response.data as LiveZoomCohortSessionInfo;
};

export const leaveLiveZoomCohortQueue = async (id: number, participant: CohortQueueParticipantParams) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/leave`, participant);
  return response.data;
};

export const markLiveZoomCohortJoined = async (id: number, participant: CohortQueueParticipantParams) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/joined`, participant);
  return response.data as { entry: LiveZoomCohortQueueEntry };
};

export const finishLiveZoomCohortTurn = async (id: number, participant: CohortQueueParticipantParams) => {
  const response = await api.post(`/livezoom-cohort/${id}/queue/done`, participant);
  return response.data;
};

// ------------------- AUTH: STUDENT REGISTRATION -------------------

export type StudentSignupEnrollment = {
  course_id: number;
  level?: string;
  study_shift_ids?: number[];
};

export const registerStudent = async (
  firstName: string,
  lastName: string,
  email: string,
  options?: {
    country?: string;
    phone?: string;
    primaryGoal?: string;
    selectedCourseTitles?: string[];
    platformInstitutionId?: number | null;
    enrollments?: StudentSignupEnrollment[];
  }
) => {
  const response = await api.post(`/auth/register-student`, {
    first_name: firstName,
    last_name: lastName,
    email,
    country: options?.country,
    phone: options?.phone,
    primary_goal: options?.primaryGoal,
    selected_courses: options?.selectedCourseTitles,
    platform_institution_id: options?.platformInstitutionId ?? undefined,
    enrollments: options?.enrollments,
  });
  return response.data as {
    message: string;
    role: 'learner';
    user: { id: number };
    institution?: PlatformInstitutionInfo | null;
    email_sent?: boolean;
    pending_approval?: boolean;
    enrollments_created?: number;
  };
};

export const registerInstructor = async (
  name: string,
  email: string,
  password: string,
  phone?: string,
  country?: string,
  primaryGoal?: string
) => {
  const response = await api.post(`/auth/register-instructor`, {
    name,
    email,
    password,
    phone,
    country,
    primary_goal: primaryGoal,
  });
  return response.data as {
    message: string;
    role: 'instructor';
    user: Record<string, unknown>;
    pending_approval?: boolean;
  };
};

// ------------------- STUDENTS -------------------

export const getStudents = async () => {
  const response = await api.get(`/students`);
  return response.data;
};

export const createStudent = async (data: StudentPayload) => {
  const response = await api.post(`/students`, data);
  return response.data;
};

export const updateStudent = async (id: number, data: StudentPayload) => {
  const response = await api.put(`/students/${id}`, data);
  return response.data;
};

export const moveStudentInstitution = async (id: number, platformInstitutionId: number | null) => {
  const response = await api.post(`/students/${id}/move-institution`, {
    platform_institution_id: platformInstitutionId,
  });
  return response.data;
};

export const getPublicInstitutionChoices = async () => {
  const response = await api.get(`/institution-signup/choices`);
  const data = response.data;
  if (Array.isArray(data)) return data as PlatformInstitutionInfo[];
  if (data && Array.isArray((data as { institutions?: unknown }).institutions)) {
    return (data as { institutions: PlatformInstitutionInfo[] }).institutions;
  }
  return [];
};

export const getInstitutionBySignupSlug = async (slug: string) => {
  const normalized = slug.trim().toLowerCase();
  try {
    const response = await api.get(`/institution-signup/by-slug/${encodeURIComponent(normalized)}`);
    return response.data as { institution: PlatformInstitutionInfo };
  } catch {
    const choices = await getPublicInstitutionChoices();
    const institution = choices.find((item) => item.slug?.trim().toLowerCase() === normalized);
    if (!institution || institution.status !== 'active') {
      throw new Error('Institution not found or not accepting registrations');
    }
    return { institution };
  }
};

export const getInstitutionPortalBySlug = async (slug: string) => {
  const normalized = slug.trim().toLowerCase();
  try {
    const response = await api.get(`/institution-signup/portal/${encodeURIComponent(normalized)}`);
    return response.data as import("@/lib/institutionPortal").InstitutionPortalPayload;
  } catch {
    const { institution } = await getInstitutionBySignupSlug(normalized);
    let programs: import("@/lib/institutionPortal").InstitutionPortalProgram[] = [];
    try {
      programs = await getLearningPrograms({
        withCourses: true,
        activeOnly: true,
        platformInstitutionId: institution.id,
      });
    } catch {
      programs = [];
    }
    const courseCount = programs.reduce((sum, program) => sum + (program.courses?.length ?? 0), 0);
    return {
      institution,
      programs,
      stats: {
        programs_count: programs.length,
        courses_count: courseCount,
      },
    };
  }
};

export const deleteStudent = async (id: number) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

// ------------------- STUDENT DOCUMENT UPLOAD -------------------
export const uploadStudentDocument = async (file: File, studentId?: number) => {
  const form = new FormData();
  form.append('document', file);
  if (studentId) form.append('student_id', String(studentId));
  const response = await api.post(`/students/upload-document`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as { message: string; path: string; url: string };
};

// ------------------- ADMIN PROFILE -------------------
export const updateAdminPassword = async (userId: number, password: string) => {
  const response = await api.post(`/users/${userId}/password`, { password });
  return response.data as { message: string; user: any };
};

export const uploadAdminAvatar = async (userId: number, file: File) => {
  const form = new FormData();
  form.append('avatar', file);
  const response = await api.post(`/users/${userId}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as { message: string; url: string };
};

// ------------------- USERS (ADMIN) -------------------

export type UserPayload = {
  name: string;
  email: string;
  password?: string;
  role?: string;
  status?: string;
  phone?: string;
  platform_institution_id?: number;
};

// ------------------- PLATFORM INSTITUTIONS -------------------

export const getInstitutionSignupConfig = async () => {
  const response = await api.get(`/institution-signup/config`);
  return response.data as { signup_fee_cents: number; currency: string; product_name: string };
};

export const validateInstitutionPromoCode = async (code: string) => {
  const response = await api.post(`/institution-signup/validate-promo`, { code });
  return response.data as { valid: boolean; message?: string; label?: string };
};

export const registerInstitutionSignup = async (form: FormData) => {
  const response = await api.post(`/institution-signup/register`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as {
    message: string;
    institution: PlatformInstitutionInfo;
    requires_payment: boolean;
    checkout_url?: string;
  };
};

export const completeInstitutionSignupPayment = async (sessionId: string) => {
  const response = await api.post(`/institution-signup/complete-payment`, { session_id: sessionId });
  return response.data;
};

export const getPlatformInstitutions = async () => {
  const response = await api.get(`/platform-institutions`);
  return response.data as Array<
    PlatformInstitutionInfo & {
      owner?: { id: number; name: string; email: string; status: string } | null;
      total_paid_cents?: number;
      payments_count?: number;
    }
  >;
};

export const getPlatformInstitutionContext = async (email: string) => {
  const response = await api.get(`/platform-institutions/context`, { params: { email } });
  return response.data as {
    institution: PlatformInstitutionInfo | null;
    is_main_admin: boolean;
    role?: string;
  };
};

export const approvePlatformInstitution = async (id: number) => {
  const response = await api.post(`/platform-institutions/${id}/approve`);
  return response.data;
};

export const disablePlatformInstitution = async (id: number) => {
  const response = await api.post(`/platform-institutions/${id}/disable`);
  return response.data;
};

export const enablePlatformInstitution = async (id: number) => {
  const response = await api.post(`/platform-institutions/${id}/enable`);
  return response.data;
};

export const resendInstitutionCredentials = async (id: number) => {
  const response = await api.post(`/platform-institutions/${id}/resend-credentials`);
  return response.data as {
    message: string;
    login_url?: string;
    owner_email?: string;
    password?: string;
  };
};

export const resetInstitutionOwnerPassword = async (
  id: number,
  opts?: { password?: string; sendEmail?: boolean },
) => {
  const response = await api.post(`/platform-institutions/${id}/reset-owner-password`, {
    password: opts?.password?.trim() || undefined,
    send_email: opts?.sendEmail ?? false,
  });
  return response.data as {
    message: string;
    login_url?: string;
    owner_email?: string;
    password?: string;
  };
};

export const deletePlatformInstitution = async (id: number) => {
  const response = await api.delete(`/platform-institutions/${id}`);
  return response.data;
};

export const sendInstitutionPaymentReminder = async (id: number) => {
  const response = await api.post(`/platform-institutions/${id}/payment-reminder`);
  return response.data;
};

export const getPlatformInstitution = async (id: number) => {
  const response = await api.get(`/platform-institutions/${id}`);
  return response.data as PlatformInstitutionInfo;
};

export const createPlatformInstitution = async (data: {
  name: string;
  contact_email: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  admin_notes?: string;
  owner_name?: string;
  password?: string;
  auto_approve?: boolean;
  send_credentials?: boolean;
}) => {
  const response = await api.post(`/platform-institutions`, data);
  return response.data as {
    message: string;
    institution: PlatformInstitutionInfo;
    password?: string | null;
    login_url?: string;
  };
};

export const assignInstitutionZoomHost = async (id: number, force = false) => {
  const response = await api.post(`/platform-institutions/${id}/assign-zoom-host`, { force });
  return response.data as { message: string; zoom_host_user_id: string; institution: PlatformInstitutionInfo };
};

export const backfillInstitutionZoomHosts = async (dryRun = false) => {
  const response = await api.post(`/platform-institutions/backfill-zoom-hosts`, { dry_run: dryRun });
  return response.data as {
    message: string;
    dry_run: boolean;
    results: Array<{ id: number; name: string; assigned?: string | null; would_assign?: string | null }>;
  };
};

export const updatePlatformInstitution = async (id: number, data: Record<string, unknown>) => {
  const response = await api.put(`/platform-institutions/${id}`, data);
  return response.data as { message: string; institution: PlatformInstitutionInfo };
};

export const uploadPlatformInstitutionLogo = async (id: number, file: File) => {
  const form = new FormData();
  form.append("logo", file);
  const response = await api.post(`/platform-institutions/${id}/logo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as { logo_url: string };
};

export const sendInstitutionTestMail = async (id: number, to?: string) => {
  const response = await api.post(`/platform-institutions/${id}/test-mail`, { to });
  return response.data as { ok: boolean; message: string };
};

export const getMyInstitutionSettings = async (email: string) => {
  const response = await api.get(`/platform-institutions/my-settings`, { params: { email } });
  return response.data as { institution: PlatformInstitutionInfo };
};

export const updateMyInstitutionBranding = async (form: FormData) => {
  const response = await api.post(`/platform-institutions/my-branding`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as { message: string; institution: PlatformInstitutionInfo };
};

export const getInstitutionPromoCodes = async () => {
  const response = await api.get(`/institution-promo-codes`);
  return response.data;
};

export const createInstitutionPromoCode = async (data: {
  code: string;
  label?: string;
  max_uses?: number;
  expires_at?: string;
}) => {
  const response = await api.post(`/institution-promo-codes`, data);
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get(`/users`);
  return response.data;
};

export const createUser = async (data: UserPayload) => {
  const response = await api.post(`/users`, data);
  return response.data;
};

export const updateUser = async (id: number, data: Partial<UserPayload>) => {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id: number) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

// ------------------- AGENT PROFILE -------------------
export const uploadAgentAvatar = async (agentId: number, file: File) => {
  const form = new FormData();
  form.append('avatar', file);
  const response = await api.post(`/agents/${agentId}/avatar`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data as { message: string; url: string };
};

// ------------------- APPLICATIONS -------------------
export type ApplicationPayload = {
  student_id: number;
  institution_id: number;
  program_level_id?: number | null;
  field_id?: number | null;
  intake_id?: number | null;
  program_title?: string | null;
  status?: string;
  notes?: string;
};

export type ApplicationFilters = {
  first_name?: string;
  last_name?: string;
  student_id?: string | number;
  status?: string;
  apply_date_from?: string;
  apply_date_to?: string;
};

export const getApplications = async (filters?: ApplicationFilters) => {
  const response = await api.get(`/applications`, {
    params: filters ?? {},
  });
  return response.data;
};

export const createApplication = async (data: ApplicationPayload) => {
  const response = await api.post(`/applications`, data);
  return response.data;
};

export const updateApplication = async (id: number, data: Partial<ApplicationPayload>) => {
  const response = await api.put(`/applications/${id}`, data);
  return response.data;
};

export const deleteApplication = async (id: number) => {
  const response = await api.delete(`/applications/${id}`);
  return response.data;
};

// ------------------- DASHBOARD -------------------
export type DashboardMetrics = {
  totalAgents: number;
  totalAgentsChange: string;
  totalAgentsTrend: 'up' | 'down';
  totalStudents: number;
  totalStudentsChange: string;
  totalStudentsTrend: 'up' | 'down';
  activeApplications: number;
  activeApplicationsChange: string;
  activeApplicationsTrend: 'up' | 'down';
  totalPrograms: number;
  totalProgramsChange: string;
  totalProgramsTrend: 'up' | 'down';
  meetingRegistrations: number;
  meetingRegistrationsChange: string;
  meetingRegistrationsTrend: 'up' | 'down';
};

export const getDashboardMetrics = async () => {
  const response = await api.get(`/dashboard/metrics`);
  return response.data as DashboardMetrics;
};

export type AdminAnalytics = {
  summary: {
    totalStudents: number;
    totalCourses: number;
    activeCourses: number;
    totalInstructors: number;
    totalEnrollments: number;
    paidEnrollments: number;
    totalRevenue: number;
    stripeRevenue: number;
    manualRevenue?: number;
    instructorEarnings?: number;
    platformEarnings?: number;
    instructorSharePercent?: number;
    platformSharePercent?: number;
    pendingInstructors: number;
    pendingCourses: number;
    pendingPayments: number;
    pendingPayoutRequests?: number;
    pendingPayoutAmount?: number;
    paymentProvider: string;
  };
  enrollmentsByMonth: Array<{ month: string; count: number }>;
  revenueByMonth: Array<{ month: string; amount: number }>;
  revenueByMonthSplit?: Array<{
    month: string;
    amount: number;
    instructor_earnings: number;
    platform_earnings: number;
  }>;
  instructorPerformance: Array<{
    id: number;
    name: string;
    email?: string;
    status?: string;
    courses_assigned: number;
    total_enrollments: number;
    unique_students: number;
    total_revenue?: number;
    instructor_earnings?: number;
    platform_earnings?: number;
    paid_out?: number;
    pending_payout?: number;
    available_balance?: number;
  }>;
  coursePerformance: Array<{
    id: number;
    title: string;
    status?: string;
    price: number;
    total_enrollments: number;
    paid_enrollments: number;
    revenue: number;
    instructor_earnings?: number;
    platform_earnings?: number;
    instructor_names?: string[];
    instructor_label?: string;
  }>;
  studentsByCountry: Array<{ country: string; count: number }>;
  marketing: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

export const getAdminAnalytics = async () => {
  const response = await api.get(`/dashboard/analytics`, { timeout: 15000 });
  return response.data as AdminAnalytics;
};

export type AdminPayoutRequest = {
  id: number;
  instructor_id: number;
  instructor_name?: string | null;
  instructor_email?: string | null;
  amount: number;
  status: string;
  payment_method?: string | null;
  payment_method_label?: string | null;
  payment_details?: string | null;
  notes?: string | null;
  created_at?: string | null;
  processed_at?: string | null;
};

export const getAdminInstructorPayouts = async (status?: string) => {
  const response = await api.get(`/instructor-payouts`, {
    params: status ? { status } : undefined,
    timeout: 15000,
  });
  return response.data as {
    payoutRequests: AdminPayoutRequest[];
    pendingCount: number;
    pendingAmount: number;
  };
};

export const approveInstructorPayout = async (id: number) => {
  const response = await api.post(`/instructor-payouts/${id}/approve`);
  return response.data as { message?: string; payoutRequest: AdminPayoutRequest };
};

export const rejectInstructorPayout = async (id: number, reason?: string) => {
  const response = await api.post(`/instructor-payouts/${id}/reject`, { reason });
  return response.data as { message?: string; payoutRequest: AdminPayoutRequest };
};

export type AdminPaymentRow = {
  id: number;
  course_id: number;
  course_title?: string | null;
  student_id: number;
  student_name?: string | null;
  student_email?: string | null;
  student_country?: string | null;
  amount: number;
  currency: string;
  provider: string;
  status: string;
  paid_at?: string | null;
  created_at?: string | null;
};

export const getAdminPayments = async () => {
  const response = await api.get(`/payments`, { timeout: 15000 });
  return (Array.isArray(response.data) ? response.data : []) as AdminPaymentRow[];
};

export const updateAdminPaymentStatus = async (id: number, status: string) => {
  const response = await api.patch(`/payments/${id}`, { status });
  return response.data;
};

// ------------------- E-LEARNING PROGRAMS -------------------

export type LearningProgramPayload = {
  id?: number;
  name: string;
  description?: string | null;
  image?: string | null;
  status?: string | null;
  sort_order?: number | null;
  courses?: CoursePayload[];
};

export const getLearningPrograms = async (opts?: {
  withCourses?: boolean;
  activeOnly?: boolean;
  platformInstitutionId?: number | null;
}) => {
  const response = await api.get(`/learning-programs`, {
    params: {
      with_courses: opts?.withCourses ? 1 : undefined,
      active_only: opts?.activeOnly ? 1 : undefined,
      platform_institution_id: opts?.platformInstitutionId ?? undefined,
    },
    timeout: 8000,
  });
  return (Array.isArray(response.data) ? response.data : []) as LearningProgramPayload[];
};

export const getLearningProgram = async (id: number) => {
  const response = await api.get(`/learning-programs/${id}`);
  return response.data as LearningProgramPayload;
};

export const createLearningProgram = async (data: FormData | Record<string, unknown>) => {
  const isForm = typeof FormData !== "undefined" && data instanceof FormData;
  const response = await api.post(`/learning-programs`, data, isForm ? { headers: { "Content-Type": "multipart/form-data" } } : undefined);
  return response.data;
};

export const updateLearningProgram = async (id: number, data: FormData | Record<string, unknown>) => {
  const isForm = typeof FormData !== "undefined" && data instanceof FormData;
  const url = isForm ? `/learning-programs/${id}?_method=PUT` : `/learning-programs/${id}`;
  const method = isForm ? api.post : api.put;
  const config = isForm ? { headers: { "Content-Type": "multipart/form-data" } } : undefined;
  const response = await method(url, data, config as any);
  return response.data;
};

export const deleteLearningProgram = async (id: number) => {
  const response = await api.delete(`/learning-programs/${id}`);
  return response.data;
};

export const assignCoursesToProgram = async (programId: number, courseIds: number[]) => {
  const response = await api.post(`/learning-programs/${programId}/assign-courses`, {
    course_ids: courseIds,
  });
  return response.data as {
    message: string;
    moved: number;
    program: LearningProgramPayload;
  };
};

export const autoAssignCoursesToPrograms = async (opts?: { createMissing?: boolean; force?: boolean }) => {
  const response = await api.post(`/learning-programs/auto-assign-courses`, {
    create_missing: opts?.createMissing ?? true,
    force: opts?.force ?? false,
  });
  return response.data as {
    message: string;
    assigned: number;
    summary: Record<string, number>;
    details: Array<{ course_id: number; title: string; from: string | null; to: string }>;
  };
};

export const moveCourseToProgram = async (courseId: number, programId: number) => {
  const response = await api.put(`/courses/${courseId}`, { program_id: programId });
  return response.data;
};

// ------------------- COURSES -------------------

export type CoursePayload = {
  id?: number;
  program_id?: number | null;
  program?: { id: number; name: string } | null;
  title: string;
  course_code?: string | null;
  description?: string | null;
  general_information?: string | null;
  important_information?: string | null;
  guidelines?: string[] | null;
  how_to_use?: Array<{ title: string; description?: string }> | null;
  attendance_policy?: string | null;
  assessment_policy?: string | null;
  price?: number | null;
  duration?: string | null;
  requirements?: string | null;
  image?: string | null;
  status?: string | null;
  instructors?: Array<{
    id: number;
    name?: string | null;
    email?: string | null;
    role?: string | null;
  }> | null;
};

export const suggestCourseCode = async (title?: string, prefix?: string) => {
  const response = await api.get(`/courses/suggest-code`, { params: { title, prefix } });
  return response.data as { course_code: string; prefixes: string[] };
};

function normalizeCourseList(payload: unknown): CoursePayload[] {
  if (Array.isArray(payload)) return payload as CoursePayload[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as CoursePayload[];
    if (Array.isArray(obj.courses)) return obj.courses as CoursePayload[];
  }
  return [];
}

export const getCourses = async (programId?: number) => {
  const response = await api.get(`/courses`, {
    timeout: 8000,
    params: programId ? { program_id: programId } : undefined,
  });
  return normalizeCourseList(response.data);
};

export const createCourse = async (data: any) => {
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  const response = await api.post(`/courses`, data, isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined);
  return response.data;
};

export const updateCourse = async (id: number, data: any) => {
  const isForm = typeof FormData !== 'undefined' && data instanceof FormData;
  // Use method spoofing for multipart payloads
  const url = isForm ? `/courses/${id}?_method=PUT` : `/courses/${id}`;
  const method = isForm ? api.post : api.put;
  const config = isForm ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined;
  const response = await method(url, data, config as any);
  return response.data;
};

export const deleteCourse = async (id: number) => {
  const response = await api.delete(`/courses/${id}`);
  return response.data;
};

export const assignCourseToUser = async (courseId: number, userId: number) => {
  const response = await api.post(`/courses/${courseId}/assign`, { user_id: userId });
  return response.data;
};

export const unassignCourseFromUser = async (courseId: number, userId: number) => {
  const response = await api.post(`/courses/${courseId}/unassign`, { user_id: userId });
  return response.data;
};

export const enrollInCourse = async (
  courseId: number,
  studentId: number,
  level?: string,
  studyShiftIds?: number[],
  autoApprove?: boolean
) => {
  const payload: Record<string, unknown> = {
    student_id: studentId,
    level,
  };
  if (studyShiftIds?.length) {
    payload.study_shift_ids = studyShiftIds;
    payload.study_shift_id = studyShiftIds[0];
  }
  if (autoApprove) {
    payload.auto_approve = true;
  }
  const response = await api.post(`/courses/${courseId}/enroll`, payload);
  return response.data as { message: string; enrollment: any };
};

export const markCourseEnrollmentPaid = async (courseId: number, studentId: number, email?: string) => {
  const response = await api.post(`/courses/${courseId}/mark-paid`, {
    student_id: studentId,
    ...(email ? { email } : {}),
  });
  return response.data as { message: string; enrollment: any };
};

export const approveCourseEnrollment = async (courseId: number, studentId: number, email?: string) => {
  const response = await api.post(`/courses/${courseId}/approve-enrollment`, {
    student_id: studentId,
    ...(email ? { email } : {}),
  });
  return response.data as { message: string; enrollment: any };
};

export const confirmPaymentCheckout = async (sessionId: string) => {
  const response = await api.post(`/payments/confirm-checkout`, { session_id: sessionId });
  return response.data as { message: string };
};

export const rejectCourseEnrollment = async (
  courseId: number,
  studentId: number,
  reason?: string,
  email?: string
) => {
  const response = await api.post(`/courses/${courseId}/reject-enrollment`, {
    student_id: studentId,
    reason,
    ...(email ? { email } : {}),
  });
  return response.data as { message: string; enrollment: any };
};

export const removeCourseEnrollment = async (
  courseId: number,
  studentId: number,
  reason?: string,
  email?: string
) => {
  const response = await api.post(`/courses/${courseId}/remove-enrollment`, {
    student_id: studentId,
    reason,
    ...(email ? { email } : {}),
  });
  return response.data as { message: string };
};

export const sendCoursePaymentLink = async (
  courseId: number,
  studentId: number,
  sendEmail = true,
  email?: string
) => {
  const response = await api.post(`/courses/${courseId}/send-payment-link`, {
    student_id: studentId,
    send_email: sendEmail,
    ...(email ? { email } : {}),
  });
  return response.data as { message: string; payment_url?: string };
};

export type StudentCourseEnrollment = {
  enrollment_id?: number;
  course_id: number;
  course_title?: string | null;
  course_price?: number;
  status: string;
  payment_paid?: boolean;
  has_access?: boolean;
  level?: string | null;
  study_shifts?: Array<{
    id: number;
    name?: string;
    day_label?: string;
    start_time?: string;
    end_time?: string;
    label?: string;
  }>;
};

export type StudyShiftChangeRequestRow = {
  id: number;
  course_enrollment_id: number;
  student_id: number;
  student_name?: string;
  student_email?: string;
  course_id: number;
  course_title?: string;
  status: string;
  reason?: string | null;
  review_notes?: string | null;
  created_at?: string;
  reviewed_at?: string;
  current_shifts?: Array<{ id: number; label?: string }>;
  requested_shifts?: Array<{ id: number; label?: string }>;
};

export const updateEnrollmentStudyShifts = async (
  courseId: number,
  studentId: number,
  studyShiftIds: number[],
  email?: string
) => {
  const response = await api.post(`/courses/${courseId}/enrollment-study-shifts`, {
    student_id: studentId,
    study_shift_ids: studyShiftIds,
    email,
  });
  return response.data as { message: string; study_shifts: StudentCourseEnrollment["study_shifts"] };
};

export const submitStudyShiftChangeRequest = async (payload: {
  student_id: number;
  course_id: number;
  study_shift_ids: number[];
  reason?: string;
}) => {
  const response = await api.post(`/learner/study-shift-change-requests`, payload);
  return response.data as { message: string; request: StudyShiftChangeRequestRow };
};

export const getStudyShiftChangeRequests = async (params?: {
  status?: string;
  course_id?: number;
  email?: string;
}) => {
  const response = await api.get(`/study-shift-change-requests`, { params });
  return response.data as { requests: StudyShiftChangeRequestRow[] };
};

export const approveStudyShiftChangeRequest = async (requestId: number, email?: string, reviewNotes?: string) => {
  const response = await api.post(`/study-shift-change-requests/${requestId}/approve`, {
    email,
    review_notes: reviewNotes,
  });
  return response.data as { message: string; request: StudyShiftChangeRequestRow };
};

export const rejectStudyShiftChangeRequest = async (requestId: number, email?: string, reviewNotes?: string) => {
  const response = await api.post(`/study-shift-change-requests/${requestId}/reject`, {
    email,
    review_notes: reviewNotes,
  });
  return response.data as { message: string; request: StudyShiftChangeRequestRow };
};

export const getStudentCourseEnrollments = async (studentId: number) => {
  const response = await api.get(`/students/${studentId}/course-enrollments`);
  return response.data as { enrollments: StudentCourseEnrollment[] };
};

export type CourseEnrollmentSummary = {
  total_enrollments: number;
  per_course: Array<{
    course_id: number;
    title?: string | null;
    enrollments: number;
  }>;
};

export const getCourseEnrollmentSummary = async () => {
  const response = await api.get(`/course-enrollments/summary`);
  return response.data as CourseEnrollmentSummary;
};

// ------------------- PAYMENTS -------------------

export const createPaymentCheckout = async (courseId: number, studentId: number) => {
  const response = await api.post(`/payments/create-checkout`, {
    course_id: courseId,
    student_id: studentId,
  });
  return response.data as { url: string };
};

export const createPaymentIntent = async (courseId: number, studentId: number) => {
  const response = await api.post(`/payments/create-intent`, {
    course_id: courseId,
    student_id: studentId,
  });
  return response.data as { client_secret: string };
};

export type StripeConfig = {
  configured: boolean;
  publishable_key: string | null;
  provider: string;
};

export const getStripeConfig = async () => {
  const response = await api.get(`/payments/stripe-config`);
  return response.data as StripeConfig;
};

export type LearnerDashboardStats = {
  courses_enrolled: number;
  active_courses?: number;
  hours_learned: number;
  certificates: number;
  streak_days: number;
};

export type LearnerDashboardData = {
  student: { id: number; name?: string; email?: string };
  stats: LearnerDashboardStats;
  learning_features: {
    hd_video_lessons: number;
    downloadable_resources: number;
    quizzes_assessments: number;
    mock_exams: number;
    live_classes: number;
  };
  enrolled_courses: Array<{
    id: number;
    enrollment_id?: number;
    title?: string;
    course_code?: string;
    description?: string;
    general_information?: string;
    important_information?: string;
    guidelines?: string[];
    how_to_use?: Array<{ title: string; description?: string }>;
    attendance_policy?: string;
    assessment_policy?: string;
    requirements?: string;
    duration?: string;
    status?: string;
    level?: string;
    price?: number;
    progress_percent?: number;
    materials_count?: number;
    videos_count?: number;
    documents_count?: number;
    quizzes_count?: number;
    enrolled_at?: string;
    study_shifts?: Array<{
      id: number;
      label?: string;
      name?: string;
      day_label?: string;
      start_time?: string;
      end_time?: string;
    }>;
    shift_change_request?: {
      id: number;
      status: string;
      reason?: string | null;
      created_at?: string;
      requested_shifts?: Array<{ id: number; label?: string }>;
    } | null;
  }>;
  available_courses: Array<{
    id: number;
    title?: string;
    description?: string;
    price?: number;
    duration?: string;
    status?: string;
  }>;
  enrollment_statuses: Record<number, string>;
  upcoming_classes: Array<{
    id: number;
    course_id?: number;
    title?: string;
    course_title?: string;
    join_url?: string;
    start_time?: string;
    description?: string;
    type?: string;
    is_live_now?: boolean;
    can_join?: boolean;
    is_past?: boolean;
    is_upcoming?: boolean;
    session_status?: "live" | "upcoming" | "ended" | "unknown";
    duration_minutes?: number;
  }>;
  notifications?: LearnerNotification[];
  quizzes: Array<{ id: number; title?: string; course_id: number; resource_url?: string }>;
  certificates: Array<{
    course_id: number;
    student_id?: number;
    student_name?: string;
    course_title?: string;
    status?: string;
    certificate_id?: string;
    issued_at?: string;
    verify_url?: string;
  }>;
  recent_payments: Array<{
    id: number;
    course_title?: string;
    amount: number;
    currency: string;
    status: string;
    provider: string;
    paid_at?: string;
  }>;
  stripe: StripeConfig;
};

export const getLearnerDashboard = async (studentId: number) => {
  const response = await api.get(`/learner/dashboard`, { params: { student_id: studentId } });
  return response.data as LearnerDashboardData;
};

export type VerifiedCertificate = {
  certificate_id: string;
  student_id: number;
  course_id: number;
  student_name: string;
  student_email?: string;
  course_title: string;
  course_description?: string;
  enrollment_status?: string;
  issued_at?: string;
  verify_url?: string;
  issuer: string;
  issuer_tagline?: string;
};

export type CertificateVerifyResponse = {
  valid: boolean;
  message?: string;
  certificate?: VerifiedCertificate;
};

export const verifyCertificate = async (courseId: number, studentId: number) => {
  const response = await api.get(`/certificates/verify/${courseId}/${studentId}`);
  return response.data as CertificateVerifyResponse;
};

export type LearnerNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at?: string;
  start_time?: string;
  opens_at?: string;
  course_id?: number;
  material_id?: number;
  quiz_id?: number;
  join_url?: string | null;
  embed_room_path?: string | null;
  can_join?: boolean;
  session_status?: string;
  is_past?: boolean;
  action_path?: string;
};

export type LearnerCourseMaterial = {
  id: number;
  course_id: number;
  title: string;
  description?: string | null;
  type?: string;
  kind: string;
  resource_url?: string | null;
  join_url?: string | null;
  embed_room_path?: string | null;
  host_room_path?: string | null;
  meeting_id?: string | null;
  scheduled_at?: string | null;
  sort_order?: number;
  created_at?: string;
  duration_minutes?: number | null;
  session_status?: "live" | "upcoming" | "ended" | "unknown";
  can_join?: boolean;
  is_past?: boolean;
  is_upcoming?: boolean;
  is_live_now?: boolean;
  recordings?: LearnerRecording[];
  storage?: "pcloud" | string | null;
  pcloud_file_id?: number | null;
  file_category?: "images" | "videos" | "audio" | "documents" | null;
  file_size?: number | null;
  filename?: string | null;
  topic?: string | null;
  question_count?: number;
  has_interactive_quiz?: boolean;
  is_quiz_open?: boolean;
  availability_mode?: "immediate" | "scheduled";
  assessment_kind?: "quiz" | "test" | "exam";
  passing_score?: number;
  time_limit_minutes?: number | null;
  latest_attempt?: LearnerQuizAttemptSummary | null;
};

export type LearnerQuizAttemptSummary = {
  id: number;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  feedback?: string;
  marking_provider?: string;
  pending_review?: boolean;
  marked_at?: string | null;
  created_at?: string | null;
  question_results?: QuizAttemptReviewRow[];
};

export type LearnerRecordingFile = {
  id?: string | null;
  recording_type?: string | null;
  file_type?: string | null;
  play_url?: string | null;
  download_url?: string | null;
};

export type LearnerRecording = {
  uuid?: string | null;
  id?: string | number | null;
  topic?: string;
  start_time?: string | null;
  duration?: number | null;
  files: LearnerRecordingFile[];
};

export const getLearnerNotifications = async (studentId: number) => {
  const response = await api.get(`/learner/notifications`, { params: { student_id: studentId } });
  return response.data as { notifications: LearnerNotification[] };
};

export const getLearnerCourseMaterials = async (courseId: number, studentId: number) => {
  const response = await api.get(`/learner/courses/${courseId}/materials`, {
    params: { student_id: studentId },
  });
  return response.data as {
    course: {
      id: number;
      title?: string;
      description?: string;
      course_code?: string;
      general_information?: string;
      important_information?: string;
      guidelines?: string[];
      how_to_use?: Array<{ title: string; description?: string }>;
      attendance_policy?: string;
      assessment_policy?: string;
      requirements?: string;
      duration?: string;
      price?: number;
      enrollment_status?: string;
      payment_paid?: boolean;
      has_access?: boolean;
    };
    materials: LearnerCourseMaterial[];
  };
};

export const getLearnerRecordings = async (studentId: number) => {
  const response = await api.get(`/learner/recordings`, { params: { student_id: studentId } });
  return response.data as { recordings: LearnerRecording[] };
};

export const getLearnerDashboardSummary = async (studentId: number) => {
  const response = await api.get(`/students/${studentId}/dashboard-summary`);
  return response.data as { stats: LearnerDashboardStats };
};

export type LearnerDashboardExtras = {
  upcoming_events: Array<{
    title: string;
    date: string;
    time: string;
    instructor: string;
    type: string;
  }>;
  achievements: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  payments: {
    plan: string;
    status: string;
    next_billing_date: string;
    payment_method: string;
    methods: string[];
  };
  exams: Array<{
    title: string;
    subtitle: string;
    status: string;
    kind: string;
  }>;
  messages: Array<{
    title: string;
    subtitle: string;
  }>;
};

export const getLearnerDashboardExtras = async () => {
  const response = await api.get(`/learner/dashboard-extras`);
  return response.data as LearnerDashboardExtras;
};

// ------------------- COURSE CLASS SCHEDULE -------------------
export type CourseClassSchedulePayload = {
  start_time: string;
  instructor_email?: string;
  topic?: string;
  duration?: number;
  timezone?: string;
  zoom_link?: string | null;
  notes?: string | null;
  join_before_host?: boolean;
  mute_upon_entry?: boolean;
  auto_recording?: boolean;
};

export type CourseClassScheduleResponse = {
  message: string;
  host_room_url?: string | null;
  host_room_path?: string | null;
  learner_portal_url?: string | null;
  zoom_meeting_id?: string | number | null;
  students_notified?: number;
  material?: InstructorLiveClassSession | null;
};

export const scheduleCourseClass = async (courseId: number, data: CourseClassSchedulePayload) => {
  const response = await api.post(`/courses/${courseId}/schedule-class`, data);
  return response.data as CourseClassScheduleResponse;
};

export type EnrolledStudent = {
  id: number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  enrollment_status?: string | null;
};

export const getCourseEnrolledStudents = async (courseId: number, instructorEmail?: string) => {
  if (instructorEmail) {
    const response = await api.get(`/instructor/courses/${courseId}/enrolled-students`, {
      params: { instructor_email: instructorEmail },
    });
    return response.data as { students: EnrolledStudent[]; notifyable_count?: number };
  }

  const response = await api.get(`/courses/${courseId}/enrolled-students`);
  return response.data as { students: EnrolledStudent[]; notifyable_count?: number };
};

export type LiveClassLobbyResponse = {
  material_id: number;
  course_title?: string | null;
  session_title?: string | null;
  waiting: Array<{
    student_id: number;
    display_name: string;
    email?: string | null;
    checked_in_at?: string;
  }>;
  waiting_count: number;
};

export const getLiveClassLobby = async (materialId: number, instructorEmail: string) => {
  const response = await api.get(`/instructor/live-classes/${materialId}/lobby`, {
    params: { instructor_email: instructorEmail },
  });
  return response.data as LiveClassLobbyResponse;
};

export const setLiveClassAutoAdmit = async (
  materialId: number,
  instructorEmail: string,
  enabled: boolean,
) => {
  const response = await api.post(`/instructor/live-classes/${materialId}/auto-admit`, {
    instructor_email: instructorEmail,
    enabled,
  });
  return response.data as { auto_admit: boolean; message?: string };
};

export const dismissLobbyStudent = async (
  materialId: number,
  instructorEmail: string,
  studentId: number,
) => {
  const response = await api.post(`/instructor/live-classes/${materialId}/lobby/dismiss`, {
    instructor_email: instructorEmail,
    student_id: studentId,
  });
  return response.data as { ok: boolean; student_id: number; waiting_count: number };
};

export type InstructorLiveClassSession = {
  id: number;
  title?: string;
  course_id?: number;
  course_title?: string;
  description?: string | null;
  join_url?: string | null;
  embed_room_path?: string | null;
  host_room_path?: string | null;
  meeting_id?: string | null;
  start_url?: string | null;
  scheduled_at?: string | null;
  start_time?: string | null;
  created_at?: string | null;
  share_path?: string | null;
  share_url?: string | null;
  timezone?: string | null;
  session_status?: "live" | "upcoming" | "ended" | "unknown";
  is_upcoming?: boolean;
  is_live_now?: boolean;
  duration_minutes?: number;
  can_host?: boolean;
};

export type InstructorLiveClassesData = {
  instructor: { id: number; name: string; email: string };
  zoom: { configured: boolean; host_user_id?: string };
  courses: Array<{
    id: number;
    title?: string;
    description?: string;
    status?: string;
    duration?: string;
    paid_enrollments_count?: number;
    can_host?: boolean;
    assigned_to_me?: boolean;
  }>;
  sessions: InstructorLiveClassSession[];
};

export const getInstructorLiveClasses = async (email: string, courseId?: number) => {
  const response = await api.get(`/instructor/live-classes`, {
    params: { email, course_id: courseId },
  });
  return response.data as InstructorLiveClassesData;
};

export const startInstructorLiveSession = async (
  materialId: number,
  instructorEmail: string,
  enableRecording = false
) => {
  const response = await api.post(`/instructor/live-classes/${materialId}/start`, {
    instructor_email: instructorEmail,
    enable_recording: enableRecording,
  });
  return response.data as {
    message: string;
    recording_enabled?: boolean;
    recording_warning?: string | null;
    session?: InstructorLiveClassSession;
  };
};

export const toggleInstructorLiveClassRecording = async (
  materialId: number,
  instructorEmail: string,
  action: "start" | "stop" | "pause" | "resume"
) => {
  const response = await api.post(`/instructor/live-classes/${materialId}/recording`, {
    instructor_email: instructorEmail,
    action,
  });
  return response.data as {
    message?: string;
    recording_enabled?: boolean;
    recording_active?: boolean;
  };
};

export const setZoomMeetingRecording = async (meetingId: string | number, enabled: boolean) => {
  const response = await api.post(`/zoom/meetings/${meetingId}/recording`, { enabled });
  return response.data as { message?: string; recording_enabled: boolean };
};

export const getInstructorsWithCourses = async () => {
  const response = await api.get(`/instructors-with-courses`);
  return normalizeInstructorList(response.data);
};

function normalizeInstructorList(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data as Array<Record<string, unknown>>;
    if (Array.isArray(obj.instructors)) return obj.instructors as Array<Record<string, unknown>>;
  }
  return [];
};

export const getInstructorAssignedCourses = async (email: string) => {
  const response = await api.get(`/instructor-assigned-courses`, { params: { email } });
  return response.data as { instructor: any; courses: any[] };
};

// ------------------- INSTRUCTOR DASHBOARD -------------------

export type InstructorDashboardCourse = {
  id: number;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  price?: number;
  duration?: string | null;
  students_count?: number;
  enrollments_count?: number;
  paid_enrollments_count?: number;
  materials_count?: number;
  revenue?: number;
  earnings?: number;
};

export type InstructorDashboardData = {
  instructor: { id: number; name: string; email: string; status?: string };
  summary: {
    assignedCourses: number;
    activeCourses: number;
    totalStudents: number;
    totalEnrollments: number;
    paidEnrollments: number;
    materialsCount: number;
    quizCount: number;
    upcomingClasses: number;
    totalRevenue: number;
    totalEarnings: number;
    availableBalance: number;
    pendingPayouts: number;
    paidOut: number;
    instructorSharePercent: number;
  };
  courses: InstructorDashboardCourse[];
  enrollmentsByMonth: Array<{ month: string; count: number }>;
  earningsByMonth: Array<{ month: string; revenue: number; earnings: number }>;
  recentActivity: Array<{ type: string; message: string; status?: string; at?: string }>;
  upcomingClasses: Array<{
    id: number;
    title?: string;
    course_id: number;
    course_title?: string;
    join_url?: string;
    created_at?: string;
  }>;
  payoutRequests: Array<{
    id: number;
    amount: number;
    status: string;
    notes?: string | null;
    created_at?: string;
  }>;
};

export type InstructorStudentRow = {
  enrollment_id: number;
  student_id: number;
  name?: string;
  email?: string;
  country?: string | null;
  course_id: number;
  course_title?: string;
  course_price?: number;
  status?: string;
  payment_paid?: boolean;
  has_access?: boolean;
  enrolled_at?: string;
  study_shifts?: Array<{
    id: number;
    name?: string;
    day_label?: string;
    start_time?: string;
    end_time?: string;
    label?: string;
  }>;
};

export const getInstructorDashboard = async (email: string) => {
  const response = await api.get(`/instructor/dashboard`, { params: { email } });
  return response.data as InstructorDashboardData;
};

export const getInstructorStudents = async (email: string, params?: { study_shift_id?: number }) => {
  const response = await api.get(`/instructor/students`, {
    params: { email, ...params },
  });
  return response.data as {
    courses: Array<{ id: number; title?: string }>;
    students: InstructorStudentRow[];
    study_shifts?: Array<{
      id: number;
      course_id?: number | null;
      label?: string;
      name?: string;
      day_label?: string;
      start_time?: string;
      end_time?: string;
    }>;
  };
};

export const createInstructorCourse = async (payload: {
  instructor_email: string;
  program_id: number;
  title: string;
  description?: string;
  price?: number;
  duration?: string;
  requirements?: string;
  course_code?: string;
  general_information?: string;
  important_information?: string;
  guidelines?: string[];
  how_to_use?: Array<{ title: string; description?: string }>;
  attendance_policy?: string;
  assessment_policy?: string;
  auto_generate_code?: boolean;
  code_prefix?: string;
}) => {
  const response = await api.post(`/instructor/courses`, payload);
  return response.data;
};

export const updateInstructorCourse = async (
  courseId: number,
  payload: {
    instructor_email: string;
    program_id?: number;
    title?: string;
    description?: string;
    price?: number;
    duration?: string;
    requirements?: string;
    course_code?: string;
    general_information?: string;
    important_information?: string;
    guidelines?: string[];
    how_to_use?: Array<{ title: string; description?: string }>;
    attendance_policy?: string;
    assessment_policy?: string;
    auto_generate_code?: boolean;
    code_prefix?: string;
  }
) => {
  const response = await api.put(`/instructor/courses/${courseId}`, payload);
  return response.data;
};

export const deleteInstructorCourse = async (courseId: number, instructorEmail: string) => {
  const response = await api.delete(`/instructor/courses/${courseId}`, {
    data: { instructor_email: instructorEmail },
  });
  return response.data as { message: string };
};

export type InstructorPayoutRequestRow = {
  id: number;
  amount: number;
  status: string;
  payment_method?: string | null;
  payment_method_label?: string | null;
  payment_details?: string | null;
  notes?: string | null;
  created_at?: string | null;
  processed_at?: string | null;
};

export type InstructorPayoutPaymentOption = {
  value: string;
  label: string;
};

export const getInstructorPayoutPaymentOptions = async () => {
  const response = await api.get(`/instructor/payout-payment-options`);
  return response.data as { paymentMethods: InstructorPayoutPaymentOption[] };
};

export const getInstructorPayoutRequests = async (email: string) => {
  const response = await api.get(`/instructor/payout-requests`, { params: { email } });
  return response.data as { payoutRequests: InstructorPayoutRequestRow[] };
};

export const requestInstructorPayout = async (payload: {
  instructor_email: string;
  amount: number;
  payment_method: string;
  payment_details?: string;
  notes?: string;
}) => {
  const response = await api.post(`/instructor/payout-requests`, payload);
  return response.data;
};

export type InstructorQuiz = {
  id: number;
  course_id: number;
  course_title?: string;
  title?: string;
  description?: string | null;
  topic?: string | null;
  type?: string;
  resource_url?: string | null;
  question_count?: number;
  passing_score?: number;
  time_limit_minutes?: number | null;
  status?: "draft" | "published";
  published_student_count?: number;
  published_student_ids?: number[];
  publish_to_all?: boolean;
  ai_generated?: boolean;
  assessment_kind?: "quiz" | "test" | "exam";
  created_at?: string;
  published_at?: string | null;
  availability_mode?: "immediate" | "scheduled";
  scheduled_at?: string | null;
  is_quiz_open?: boolean;
};

export type InstructorQuizDetail = InstructorQuiz & {
  questions?: QuizQuestion[];
  generation_provider?: string | null;
  source_material_id?: number | null;
};

export type QuizMaterialSummary = {
  id: number;
  title?: string;
  description?: string | null;
  type?: string;
  topic?: string | null;
  module?: string | null;
  chapter?: string | null;
  filename?: string;
  is_pdf?: boolean;
};

export type QuizTopicGroup = {
  label: string;
  material_ids: number[];
  materials: QuizMaterialSummary[];
  source?: string;
  source_material_id?: number;
};

export type QuizPdfExtractionError = {
  material_id: number;
  material_title?: string;
  code: "pdf_read_failed" | "no_topics_found" | string;
  message: string;
};

export type QuizCourseTopicsResponse = {
  course_id: number;
  course_title?: string;
  has_materials: boolean;
  materials_count: number;
  materials: QuizMaterialSummary[];
  pdf_materials: QuizMaterialSummary[];
  topic_groups: QuizTopicGroup[];
  topics: string[];
  topics_source?: "ai_pdf" | "local_pdf" | "materials" | "failed" | "gemini_pdf" | string;
  pdf_analysis?: Array<{
    material_id: number;
    material_title?: string;
    provider?: string | null;
    topics_extracted?: number;
    ai_warnings?: string[];
  }>;
  extraction_errors?: QuizPdfExtractionError[];
  extraction_ok?: boolean;
  assessment_language?: string;
  assessment_language_label?: string;
};

export type QuizQuestion = {
  id: string;
  type:
    | "multiple_choice"
    | "multiple_response"
    | "true_false"
    | "matching"
    | "fill_blank"
    | "short_answer"
    | "long_answer"
    | "essay"
    | "case_study"
    | "problem_solving"
    | "scenario"
    | "hots"
    | "oral_listen";
  question: string;
  instruction?: string | null;
  prompt_audio_url?: string | null;
  prompt_audio_filename?: string | null;
  response_format?: "text" | "audio";
  options?: string[];
  correct_answer?: string | null;
  correct_answers?: string[];
  acceptable_answers?: string[];
  model_answer?: string | null;
  marking_rubric?: string | null;
  explanation?: string | null;
  difficulty?: string;
  bloom_level?: string;
  source_section?: string;
  source_paragraph?: string;
  confidence_score?: number;
  estimated_time?: number;
  points?: number;
  pairs?: Array<{ left: string; right?: string }>;
  match_options?: string[];
};

export type QuizAiStatus = {
  configured: boolean;
  claude: boolean;
  gemini: boolean;
  generation_provider: string;
  generation_model?: string;
  fallback_provider?: string;
  fallback_model?: string;
  marking_primary: string;
  marking_secondary: string;
  quiz_modes?: Record<string, number>;
  supported_types?: string[];
  oral_response_formats?: string[];
  gemini_only?: boolean;
};

export type QuizMaterialAnalysis = {
  material_id: number;
  material_title?: string;
  word_count?: number;
  chunk_count?: number;
  analysis_provider?: string;
  analyzed_at?: string;
  knowledge_map?: Record<string, unknown>;
  topics?: string[];
  learning_outcomes?: string[];
  difficulty_level?: string;
};

export const getQuizAiStatus = async () => {
  const response = await api.get(`/instructor/quizzes/ai-status`);
  return response.data as QuizAiStatus;
};

export const getQuizCourseTopics = async (courseId: number, instructorEmail: string) => {
  const response = await api.get(`/instructor/quizzes/topics`, {
    params: { course_id: courseId, instructor_email: instructorEmail },
  });
  return response.data as QuizCourseTopicsResponse;
};

export const analyzeQuizMaterial = async (payload: {
  instructor_email: string;
  material_id: number;
  force?: boolean;
}) => {
  const response = await api.post(`/instructor/quizzes/analyze-material`, payload);
  return response.data as QuizMaterialAnalysis;
};

export const generateQuizQuestions = async (payload: {
  instructor_email: string;
  course_id: number;
  topic: string;
  question_count: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  material_id?: number;
  quiz_mode?: "quick" | "standard" | "comprehensive" | "final_exam" | "custom";
  bloom_levels?: string[];
  question_types?: string[];
}) => {
  const response = await api.post(`/instructor/quizzes/generate`, payload);
  return response.data as {
    topic: string;
    material_id?: number;
    provider: string;
    questions: QuizQuestion[];
    knowledge_map?: Record<string, unknown>;
    rejected_count?: number;
    assessment_language?: string;
    assessment_language_label?: string;
  };
};

export const createAiInstructorQuiz = async (payload: {
  instructor_email: string;
  course_id: number;
  title: string;
  topic: string;
  description?: string;
  passing_score?: number;
  time_limit_minutes?: number | null;
  questions: QuizQuestion[];
  ai_generated?: boolean;
  generation_provider?: string;
  material_id?: number;
  assessment_language?: string;
  assessment_language_label?: string;
  status?: "draft" | "published";
  published_student_ids?: number[];
  anti_cheat?: {
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
    deliver_count?: number;
    max_attempts?: number;
    detect_tab_switch?: boolean;
  };
  question_pool?: QuizQuestion[];
  assessment_kind?: "quiz" | "test" | "exam";
  availability_mode?: "immediate" | "scheduled";
  scheduled_at?: string;
}) => {
  const response = await api.post(`/instructor/quizzes/ai`, payload);
  return response.data;
};

export const publishInstructorQuiz = async (
  quizId: number,
  payload: {
    instructor_email: string;
    published_student_ids?: number[];
    availability_mode?: "immediate" | "scheduled";
    scheduled_at?: string;
  }
) => {
  const response = await api.post(`/instructor/quizzes/${quizId}/publish`, payload);
  return response.data as { message: string; quiz: InstructorQuiz };
};

export const getInstructorQuiz = async (quizId: number, instructorEmail: string) => {
  const response = await api.get(`/instructor/quizzes/${quizId}`, {
    params: { instructor_email: instructorEmail },
  });
  return response.data as { quiz: InstructorQuizDetail };
};

export const updateInstructorQuiz = async (
  quizId: number,
  payload: {
    instructor_email: string;
    title: string;
    topic: string;
    description?: string;
    passing_score?: number;
    time_limit_minutes?: number | null;
    questions: QuizQuestion[];
    ai_generated?: boolean;
    generation_provider?: string;
    material_id?: number;
    status?: "draft" | "published";
    published_student_ids?: number[];
    assessment_kind?: "quiz" | "test" | "exam";
    availability_mode?: "immediate" | "scheduled";
    scheduled_at?: string;
  }
) => {
  const response = await api.put(`/instructor/quizzes/${quizId}`, payload);
  return response.data as { message: string; quiz: InstructorQuiz };
};

export type LearnerQuizPayload = {
  quiz: {
    id: number;
    course_id: number;
    title?: string;
    description?: string | null;
    topic?: string | null;
    passing_score: number;
    time_limit_minutes?: number | null;
    question_count: number;
    max_attempts?: number;
    attempts_used?: number;
    detect_tab_switch?: boolean;
    server_now?: string;
    can_retake?: boolean;
    view_mode?: "take" | "results";
  };
  questions: QuizQuestion[];
  delivered_question_ids?: string[];
  latest_attempt?: LearnerQuizAttemptSummary | null;
  attempts: LearnerQuizAttemptSummary[];
  question_results?: QuizAttemptReviewRow[];
};

export type QuizAnalyticsPayload = {
  quiz_id: number;
  quiz_title?: string;
  attempt_count: number;
  unique_students: number;
  pass_rate: number;
  average_score: number;
  highest_score: number;
  lowest_score: number;
  question_analytics: Array<{
    question_id: string;
    question: string;
    type: string;
    success_rate: number;
    failure_rate: number;
  }>;
  integrity_summary: { avg_tab_switches: number; attempts_with_tab_switches: number };
  ai_insights: {
    learning_gaps: string[];
    strong_topics: string[];
    recommended_revisions: string[];
  };
};

export const getQuizAnalytics = async (quizId: number, instructorEmail: string) => {
  const response = await api.get(`/instructor/quizzes/${quizId}/analytics`, {
    params: { instructor_email: instructorEmail },
  });
  return response.data as QuizAnalyticsPayload;
};

export type QuizAttemptReviewRow = {
  question_id: string;
  type: string;
  question?: string | null;
  correct?: boolean | null;
  score?: number;
  max_score?: number;
  student_answer?: string;
  correct_answer?: string;
  explanation?: string | null;
  feedback?: string;
  marked_by?: string;
  pending_review?: boolean;
  response_format?: "text" | "audio";
  instruction?: string | null;
  prompt_audio_url?: string | null;
  prompt_audio_filename?: string | null;
  transcription?: string | null;
};

export type QuizAttemptSummary = {
  id: number;
  student_id: number;
  student_name: string;
  score: number;
  max_score: number;
  percentage: number;
  passed: boolean;
  marking_provider?: string | null;
  marked_at?: string | null;
  created_at?: string;
  pending_oral_count: number;
  question_results: QuizAttemptReviewRow[];
};

export const getQuizAttempts = async (quizId: number, instructorEmail: string) => {
  const response = await api.get(`/instructor/quizzes/${quizId}/attempts`, {
    params: { instructor_email: instructorEmail },
  });
  return response.data as {
    quiz_id: number;
    quiz_title?: string;
    course_id: number;
    attempts: QuizAttemptSummary[];
  };
};

export const gradeQuizAttempt = async (
  quizId: number,
  attemptId: number,
  payload: {
    instructor_email: string;
    grades: Array<{ question_id: string; score: number; feedback?: string }>;
  }
) => {
  const response = await api.post(`/instructor/quizzes/${quizId}/attempts/${attemptId}/grade`, payload);
  return response.data;
};

export const getLearnerQuiz = async (quizId: number, studentId: number) => {
  const response = await api.get(`/learner/quizzes/${quizId}`, { params: { student_id: studentId } });
  return response.data as LearnerQuizPayload;
};

export const submitLearnerQuiz = async (
  quizId: number,
  payload: {
    student_id: number;
    answers: Record<string, string>;
    started_at?: string;
    auto_submitted?: boolean;
    tab_switch_count?: number;
    focus_lost_seconds?: number;
    delivered_question_ids?: string[];
  }
) => {
  const response = await api.post(`/learner/quizzes/${quizId}/submit`, payload);
  return response.data as {
    message: string;
    attempt: { id: number };
    results: {
      score: number;
      max_score: number;
      percentage: number;
      passed: boolean;
      feedback: string;
      marking_provider: string;
      question_results: QuizAttemptReviewRow[];
      analytics?: Record<string, unknown>;
      pending_manual_review?: boolean;
    };
    analytics?: Record<string, unknown>;
  };
};

export const getQuizMarkingGuideUrl = (
  quizId: number,
  attemptId: number,
  auth: { studentId?: number; instructorEmail?: string; adminEmail?: string }
) => {
  const params = new URLSearchParams();
  if (auth.studentId) params.set("student_id", String(auth.studentId));
  if (auth.instructorEmail) params.set("instructor_email", auth.instructorEmail);
  if (auth.adminEmail) params.set("admin_email", auth.adminEmail);
  const scope = auth.studentId ? "learner" : "instructor";
  return `${getApiBaseUrl()}/${scope}/quizzes/${quizId}/attempts/${attemptId}/marking-guide?${params.toString()}`;
};

export const uploadQuizPromptAudio = async (payload: {
  instructor_email: string;
  course_id: number;
  audio: Blob;
  filename?: string;
}) => {
  const asFile =
    payload.audio instanceof File
      ? payload.audio
      : new File([payload.audio], payload.filename ?? "prompt.webm", {
          type: payload.audio.type || "audio/webm",
        });

  try {
    const configRes = await api.get(`/instructor/quizzes/pcloud-upload-config`, {
      params: {
        instructor_email: payload.instructor_email,
        course_id: payload.course_id,
      },
    });
    const config = configRes.data as PCloudDirectUploadConfig;
    if (config.upload_mode === "direct" && config.access_token) {
      const { uploadFileDirectToPCloud } = await import("@/lib/pcloudDirectUpload");
      const uploaded = await uploadFileDirectToPCloud(asFile, config);
      const reg = await api.post(`/instructor/quizzes/register-prompt-audio`, {
        instructor_email: payload.instructor_email,
        course_id: payload.course_id,
        pcloud_file_id: uploaded.fileid,
        filename: uploaded.name || asFile.name,
      });
      return reg.data as {
        path: string;
        url: string;
        pcloud_file_id?: number;
        filename?: string;
        storage?: string;
      };
    }
  } catch {
    // Fall through to API proxy (streams to pCloud, no permanent server storage).
  }

  const form = new FormData();
  form.append("instructor_email", payload.instructor_email);
  form.append("course_id", String(payload.course_id));
  form.append("audio", asFile, asFile.name);
  const response = await api.post(`/instructor/quizzes/upload-prompt-audio`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as { path: string; url: string; pcloud_file_id?: number; filename?: string; storage?: string };
};

export const uploadQuizAnswerAudio = async (
  quizId: number,
  payload: { student_id: number; question_id: string; audio: Blob; filename?: string }
) => {
  const form = new FormData();
  form.append("student_id", String(payload.student_id));
  form.append("question_id", payload.question_id);
  form.append("audio", payload.audio, payload.filename ?? "answer.webm");
  const response = await api.post(`/learner/quizzes/${quizId}/upload-answer-audio`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as { path: string; answer_value: string };
};

export const getInstructorQuizzes = async (email: string) => {
  const response = await api.get(`/instructor/quizzes`, { params: { email } });
  return response.data as { courses: Array<{ id: number; title?: string }>; quizzes: InstructorQuiz[] };
};

export const createInstructorQuiz = async (payload: {
  instructor_email: string;
  course_id: number;
  title: string;
  description?: string;
  resource_url?: string;
}) => {
  const response = await api.post(`/instructor/quizzes`, payload);
  return response.data;
};

// ------------------- COURSE MATERIALS -------------------

export type CourseMaterialPayload = {
  title: string;
  description?: string | null;
  type?: string | null;
  resource_url?: string | null;
  sort_order?: number | null;
};

export type CourseMaterialsResponse = {
  course?: { id: number; title?: string; description?: string };
  materials: LearnerCourseMaterial[];
};

export const getCourseMaterials = async (courseId: number, options?: { includeRecordings?: boolean }) => {
  const response = await api.get(`/courses/${courseId}/materials`, {
    params: options?.includeRecordings ? { include_recordings: 1 } : undefined,
  });
  const data = response.data;
  if (Array.isArray(data)) {
    return { materials: data as LearnerCourseMaterial[], course: undefined };
  }
  return data as CourseMaterialsResponse;
};

export const createCourseMaterial = async (courseId: number, data: CourseMaterialPayload) => {
  const response = await api.post(`/courses/${courseId}/materials`, data);
  return response.data;
};

export const updateCourseMaterial = async (courseId: number, materialId: number, data: Partial<CourseMaterialPayload>) => {
  const response = await api.put(`/courses/${courseId}/materials/${materialId}`, data);
  return response.data;
};

export const deleteCourseMaterial = async (courseId: number, materialId: number) => {
  const response = await api.delete(`/courses/${courseId}/materials/${materialId}`);
  return response.data;
};

export const getPCloudUploadConfig = async (courseId: number) => {
  try {
    const response = await api.get(`/courses/${courseId}/materials/pcloud-upload-config`);
    return response.data as PCloudDirectUploadConfig;
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 404) {
      throw new Error(
        "Direct pCloud upload is not available on the API yet. Pull the latest backend and run php artisan route:clear."
      );
    }
    throw e;
  }
};

export const registerPCloudMaterial = async (
  courseId: number,
  payload: {
    pcloud_file_id: number;
    filename: string;
    size?: number;
    contenttype?: string | null;
    title?: string;
    description?: string;
  }
) => {
  const response = await api.post(`/courses/${courseId}/materials/register-pcloud`, payload);
  return response.data as { message?: string; material: LearnerCourseMaterial };
};

/** Upload via Laravel API → pCloud (fallback when browser direct upload is unavailable). */
export async function uploadCourseMaterialViaApi(
  courseId: number,
  file: File,
  options?: {
    title?: string;
    description?: string;
    onProgress?: (percent: number) => void;
  }
) {
  const form = new FormData();
  form.append("file", file, file.name);
  if (options?.title) form.append("title", options.title);
  if (options?.description) form.append("description", options.description);

  const response = await api.post(`/courses/${courseId}/materials/upload-pcloud`, form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 0,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress: (event) => {
      if (!options?.onProgress || !event.total) return;
      options.onProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
    },
  });

  return response.data as { message?: string; material: LearnerCourseMaterial };
}

/** Upload to pCloud: API proxy first (reliable on production), browser direct as fallback. */
export const uploadCourseMaterialDirectPCloud = async (
  courseId: number,
  file: File,
  options?: {
    title?: string;
    description?: string;
    onProgress?: (percent: number) => void;
  }
) => {
  try {
    return await uploadCourseMaterialViaApi(courseId, file, options);
  } catch (apiError: unknown) {
    const apiMsg =
      (apiError as { response?: { data?: { message?: string } }; message?: string })?.response?.data
        ?.message || (apiError as Error)?.message;

    try {
      const config = await getPCloudUploadConfig(courseId);
      if (config.upload_mode === "direct" && config.access_token) {
        const { uploadFileDirectToPCloud } = await import("@/lib/pcloudDirectUpload");
        const uploaded = await uploadFileDirectToPCloud(file, config, options?.onProgress);
        return registerPCloudMaterial(courseId, {
          pcloud_file_id: uploaded.fileid,
          filename: uploaded.name || file.name,
          size: uploaded.size || file.size,
          contenttype: uploaded.contenttype || file.type || null,
          title: options?.title,
          description: options?.description,
        });
      }
    } catch {
      // Fall through to API error.
    }

    throw new Error(apiMsg || "Upload to pCloud failed");
  }
};

/** @deprecated Use uploadCourseMaterialDirectPCloud — files must not pass through cPanel/Vite proxy */
export const uploadCourseMaterialPCloud = uploadCourseMaterialDirectPCloud;

export const uploadCourseMaterialDocument = async (
  courseId: number,
  file: File,
  title?: string,
  description?: string
) => uploadCourseMaterialDirectPCloud(courseId, file, { title, description });

export const getMaterialStreamUrl = (
  courseId: number,
  materialId: number,
  mode: "download" | "preview" | "thumb" | "video" = "download",
  studentId?: number
) => {
  const params = new URLSearchParams({ mode });
  if (studentId) params.set("student_id", String(studentId));
  return `${getApiBaseUrl()}/courses/${courseId}/materials/${materialId}/stream?${params.toString()}`;
};

// ------------------- ZOOM -------------------

export type ZoomMeetingPayload = {
  topic: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  join_before_host?: boolean;
  mute_upon_entry?: boolean;
  auto_recording?: boolean;
  host_email?: string;
  password?: string;
  invite_emails?: string;
  host_video?: boolean;
  participant_video?: boolean;
  waiting_room?: boolean;
  meeting_authentication?: boolean;
  registrants_email_notification?: boolean;
  allow_multiple_devices?: boolean;
  audio?: string; // e.g. "both", "voip", "telephony"
  // Extended options used by ZoomManagement
  type?: string;
  require_registration?: boolean;
  recurrence?: string;
  category?: string;
  reminder?: string;
};

export type ZoomWebinarPayload = {
  topic: string;
  start_time?: string;
  duration?: number;
  timezone?: string;
  agenda?: string;
  host_video?: boolean;
  panelists_video?: boolean;
  practice_session?: boolean;
  hd_video?: boolean;
  host_email?: string;
};

export const getZoomMeetings = async (options?: { include_recordings?: boolean; platform_institution_id?: number }) => {
  const institutionId = options?.platform_institution_id ?? getStoredInstitution()?.id;
  const response = await api.get(`/zoom/meetings`, {
    params: {
      include_recordings: options?.include_recordings ? 1 : undefined,
      platform_institution_id: institutionId || undefined,
    },
  });
  return response.data;
};

export const getMeetingProviderStatus = async () => {
  const response = await api.get(`/meeting-providers/status`);
  return response.data as {
    integration_enabled?: { daily?: boolean };
    main_platform_meeting_provider?: string;
    providers: {
      zoom: { configured: boolean };
      daily: { configured: boolean; domain?: string | null };
    };
    available_meeting_providers: string[];
  };
};

export const getPlatformMeetingSettings = async () => {
  const response = await api.get(`/platform/meeting-settings`);
  return response.data as {
    main_platform_meeting_provider: "zoom" | "daily";
    can_manage_main_platform_settings?: boolean;
    meeting_provider_status: Awaited<ReturnType<typeof getMeetingProviderStatus>>;
  };
};

export const updatePlatformMeetingSettings = async (payload: {
  main_platform_meeting_provider: "zoom" | "daily";
}) => {
  const response = await api.patch(`/platform/meeting-settings`, payload);
  return response.data as {
    message: string;
    main_platform_meeting_provider: "zoom" | "daily";
    meeting_provider_status: Awaited<ReturnType<typeof getMeetingProviderStatus>>;
  };
};

export const getZoomHosts = async (platformInstitutionId?: number) => {
  const response = await api.get(`/zoom/hosts`, {
    params: platformInstitutionId ? { platform_institution_id: platformInstitutionId } : undefined,
  });
  return response.data as {
    default_host: string;
    host_pool: string[];
    platform_host_pool?: string[];
    assignable_hosts: string[];
    available_hosts?: string[];
    zoom_account_users?: Array<{
      id?: string | null;
      email: string;
      display_name?: string;
      available?: boolean;
      assigned_to?: { institution_id: number; institution_name: string } | null;
      source?: string;
    }>;
    institution_assignments?: Array<{
      institution_id: number;
      institution_name: string;
      zoom_host_user_id: string;
    }>;
    multi_host_enabled: boolean;
    zoom_api_connected?: boolean;
    zoom_users_discovered?: number;
    auto_assign_enabled?: boolean;
  };
};

export type ZoomRecordingFile = {
  id?: string;
  recording_type?: string | null;
  file_type?: string | null; // MP4, M4A etc.
  play_url?: string | null;
  download_url?: string | null;
  view_label?: string | null;
};

export type ZoomRecordingItem = {
  uuid?: string | null;
  id?: string | number | null;
  topic?: string | null;
  start_time?: string | null;
  duration?: number | null;
  source?: "webinar" | "live_class" | "other";
  source_label?: string | null;
  course_id?: number | null;
  course_title?: string | null;
  instructor_id?: number | null;
  instructor_name?: string | null;
  instructor_email?: string | null;
  files: ZoomRecordingFile[];
};

export const getRecordingStreamUrl = (downloadUrl: string) =>
  `${getApiBaseUrl()}/zoom/recordings/stream?url=${encodeURIComponent(downloadUrl)}`;

export const getRecordingDownloadUrl = (downloadUrl: string) => getRecordingStreamUrl(downloadUrl);

export const getZoomRecordings = async (options?: { refresh?: boolean }) => {
  const response = await api.get(`/zoom/recordings`, {
    params: options?.refresh ? { refresh: 1 } : undefined,
  });
  return response.data as {
    recordings: ZoomRecordingItem[];
    total?: number;
    zoom_api_configured?: boolean;
    message?: string;
    scope_hint?: string | null;
    zoom_errors?: string[];
    cached?: boolean;
  };
};

export const deleteZoomCloudRecording = async (
  meetingId: string | number,
  options?: { uuid?: string | null; recordingId?: string | null; startTime?: string | null }
) => {
  const response = await api.delete(`/zoom/recordings/${meetingId}`, {
    params: {
      uuid: options?.uuid ?? undefined,
      recording_id: options?.recordingId ?? undefined,
      start_time: options?.startTime ?? undefined,
    },
  });
  return response.data as { message?: string };
};

export const createZoomMeeting = async (data: ZoomMeetingPayload) => {
  const response = await api.post(`/zoom/meetings`, data);
  return response.data;
};

export const deleteZoomMeeting = async (meetingId: string | number) => {
  const response = await api.delete(`/zoom/meetings/${meetingId}`);
  return response.data as { message: string };
};

export const getZoomWebinars = async () => {
  const response = await api.get(`/zoom/webinars`);
  return response.data;
};

export const createZoomWebinar = async (data: ZoomWebinarPayload) => {
  const response = await api.post(`/zoom/webinars`, data);
  return response.data;
};

export default api;

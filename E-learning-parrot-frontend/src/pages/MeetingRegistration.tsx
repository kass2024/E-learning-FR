import { FormEvent, useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";

import { Checkbox } from "@/components/ui/checkbox";

import { getAvailableSchedules, submitMeetingRegistration } from "@/api/axios";

import Swal from "sweetalert2";

import {
  User,
  Mail,
  Phone,
  MessageSquare,
  Loader2,
  Video,
  CheckCircle2,
  ChevronLeft,
  CalendarDays,
} from "lucide-react";

import { MeetingSchedulePicker } from "@/components/meeting/MeetingSchedulePicker";
import { BookingConfirmedDialog } from "@/components/meeting/BookingConfirmedDialog";
import {
  DEFAULT_MEETING_CALENDAR,
  DEFAULT_MEETING_SCHEDULES,
  buildTimezoneOptions,
  formatBookingConfirmationLabel,
  formatSelectedMeeting,
  getBrowserTimezone,
  parseAvailableSchedulesResponse,
  timezoneDisplayLabel,
  type BookedMeetingSlot,
  type MeetingCalendarConfig,
  type MeetingTimeSlot,
} from "@/lib/meetingScheduleUtils";

import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";

import { cn } from "@/lib/utils";


type CommonTimezone = {
  code: string;
  name: string;
  offset: string;
  iana: string;
  label: string;
};

const COMMON_TIMEZONES: CommonTimezone[] = [
  {
    code: "UTC",
    name: "Coordinated Universal Time",
    offset: "UTC+0",
    iana: "Etc/UTC",
    label: "UTC - Coordinated Universal Time (UTC+0)",
  },
  {
    code: "GMT",
    name: "Greenwich Mean Time",
    offset: "UTC+0",
    iana: "Europe/London",
    label: "GMT - Greenwich Mean Time (UTC+0)",
  },
  {
    code: "EAT",
    name: "East Africa Time",
    offset: "UTC+3",
    iana: "Africa/Nairobi",
    label: "EAT - East Africa Time (UTC+3)",
  },
  {
    code: "CAT-RW",
    name: "Central Africa Time (Rwanda)",
    offset: "UTC+2",
    iana: "Africa/Kigali",
    label: "CAT - Central Africa Time / Rwanda (UTC+2)",
  },
  {
    code: "CAT",
    name: "Central Africa Time",
    offset: "UTC+2",
    iana: "Africa/Harare",
    label: "CAT - Central Africa Time (UTC+2)",
  },
  {
    code: "WAT",
    name: "West Africa Time",
    offset: "UTC+1",
    iana: "Africa/Lagos",
    label: "WAT - West Africa Time (UTC+1)",
  },
  {
    code: "CET",
    name: "Central European Time",
    offset: "UTC+1",
    iana: "Europe/Berlin",
    label: "CET - Central European Time (UTC+1)",
  },
  {
    code: "EET",
    name: "Eastern European Time",
    offset: "UTC+2",
    iana: "Europe/Athens",
    label: "EET - Eastern European Time (UTC+2)",
  },
  {
    code: "BST",
    name: "British Summer Time",
    offset: "UTC+1",
    iana: "Europe/London",
    label: "BST - British Summer Time (UTC+1)",
  },
  {
    code: "IST",
    name: "India Standard Time",
    offset: "UTC+5:30",
    iana: "Asia/Kolkata",
    label: "IST - India Standard Time (UTC+5:30)",
  },
  {
    code: "GST",
    name: "Gulf Standard Time",
    offset: "UTC+4",
    iana: "Asia/Dubai",
    label: "GST - Gulf Standard Time (UTC+4)",
  },
  {
    code: "MSK",
    name: "Moscow Standard Time",
    offset: "UTC+3",
    iana: "Europe/Moscow",
    label: "MSK - Moscow Standard Time (UTC+3)",
  },
  {
    code: "CST",
    name: "Central Standard Time",
    offset: "UTC-6",
    iana: "America/Chicago",
    label: "CST - Central Standard Time (UTC-6)",
  },
  {
    code: "EST",
    name: "Eastern Standard Time",
    offset: "UTC-5",
    iana: "America/New_York",
    label: "EST - Eastern Standard Time (UTC-5)",
  },
  {
    code: "MST",
    name: "Mountain Standard Time",
    offset: "UTC-7",
    iana: "America/Denver",
    label: "MST - Mountain Standard Time (UTC-7)",
  },
  {
    code: "PST",
    name: "Pacific Standard Time",
    offset: "UTC-8",
    iana: "America/Los_Angeles",
    label: "PST - Pacific Standard Time (UTC-8)",
  },
  {
    code: "JST",
    name: "Japan Standard Time",
    offset: "UTC+9",
    iana: "Asia/Tokyo",
    label: "JST - Japan Standard Time (UTC+9)",
  },
  {
    code: "KST",
    name: "Korea Standard Time",
    offset: "UTC+9",
    iana: "Asia/Seoul",
    label: "KST - Korea Standard Time (UTC+9)",
  },
  {
    code: "AEST",
    name: "Australian Eastern Standard Time",
    offset: "UTC+10",
    iana: "Australia/Sydney",
    label: "AEST - Australian Eastern Standard Time (UTC+10)",
  },
];

const BOOKING_REASONS = [
  { value: "E-Learning", label: "E-Learning" },
  { value: "School Management Solution", label: "School Management Solution" },
  { value: "other", label: "Other Tech Solutions" },
] as const;

const MeetingRegistration = () => {

  const toast = Swal.mixin({

    toast: true,

    position: "top-end",

    showConfirmButton: false,

    timer: 2500,

    timerProgressBar: true,

  });



  const [fullName, setFullName] = useState("");

  const [email, setEmail] = useState("");

  const [phone, setPhone] = useState("");

  const [learnerTimezone, setLearnerTimezone] = useState<string>(
    () => getBrowserTimezone() ?? "Africa/Nairobi"
  );
  const [timezoneManuallySet, setTimezoneManuallySet] = useState(false);

  const [reasonOption, setReasonOption] = useState<string>("");

  const [otherReason, setOtherReason] = useState("");

  const [agree, setAgree] = useState(false);

  const [submitting, setSubmitting] = useState(false);



  const [availableSchedules, setAvailableSchedules] = useState<any[]>([]);
  const [calendarConfig, setCalendarConfig] = useState<MeetingCalendarConfig>(DEFAULT_MEETING_CALENDAR);
  const [bookedSlots, setBookedSlots] = useState<BookedMeetingSlot[]>([]);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedSlot, setSelectedSlot] = useState<MeetingTimeSlot | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    email: string;
    sessionLabel: string;
    timezoneLabel: string | null;
  } | null>(null);


  const timezoneOptions = useMemo(
    () =>
      buildTimezoneOptions(
        COMMON_TIMEZONES.map((tz) => ({
          iana: tz.iana,
          label: timezoneDisplayLabel(tz.iana),
        }))
      ),
    []
  );



  const [errors, setErrors] = useState<Record<string, string>>({});

  const inputClass = (invalid?: boolean) =>
    cn(
      "h-11 rounded-xl border bg-white text-slate-900 placeholder:text-slate-400",
      "transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[#0070D0]/20 focus-visible:border-[#0070D0]",
      invalid ? "border-red-300 focus-visible:ring-red-200" : "border-slate-200 hover:border-slate-300"
    );

  const fieldError = (key: string) =>
    errors[key] ? <p className="text-xs text-red-500 mt-1">{errors[key]}</p> : null;

  const loadSchedules = async () => {
    try {
      const data = await getAvailableSchedules();
      const parsed = parseAvailableSchedulesResponse(data);
      setAvailableSchedules(parsed.schedules);
      setCalendarConfig(parsed.calendar);
      setBookedSlots(parsed.bookedSlots);
    } catch {
      setAvailableSchedules(DEFAULT_MEETING_SCHEDULES);
      setCalendarConfig(DEFAULT_MEETING_CALENDAR);
      setBookedSlots([]);
    }
  };

  useEffect(() => {
    void loadSchedules();
  }, []);

  useEffect(() => {
    if (step !== 1) return;
    void loadSchedules();
  }, [step]);



  useEffect(() => {
    if (timezoneManuallySet) return;
    const detected = getBrowserTimezone();
    if (detected) setLearnerTimezone(detected);
  }, [timezoneManuallySet]);



  useEffect(() => {

    try {

      const saved = localStorage.getItem("xander_meeting_registration_draft");

      if (!saved) return;

      const parsed = JSON.parse(saved) as Record<string, any>;

      if (parsed.fullName) setFullName(String(parsed.fullName));

      if (parsed.email) setEmail(String(parsed.email));

      if (parsed.phone) setPhone(String(parsed.phone));

      if (parsed.selectedSlot) setSelectedSlot(parsed.selectedSlot as MeetingTimeSlot);

      if (typeof parsed.step === "number" && (parsed.step === 1 || parsed.step === 2)) {
        setStep(parsed.step);
      }

      if (parsed.learnerTimezone && String(parsed.learnerTimezone).includes("/") && parsed.timezoneManuallySet) {
        setLearnerTimezone(String(parsed.learnerTimezone));
        setTimezoneManuallySet(true);
      } else if (parsed.learnerCountry && String(parsed.learnerCountry).includes("/") && parsed.timezoneManuallySet) {
        setLearnerTimezone(String(parsed.learnerCountry));
        setTimezoneManuallySet(true);
      }

      if (parsed.reasonOption) setReasonOption(String(parsed.reasonOption));

      if (parsed.otherReason) setOtherReason(String(parsed.otherReason));

      if (typeof parsed.agree === "boolean") setAgree(parsed.agree);

    } catch {

      // ignore corrupted drafts

    }

  }, []);



  useEffect(() => {

    try {

      const draft = {
        fullName,
        email,
        phone,
        selectedSlot,
        step,
        learnerTimezone,
        timezoneManuallySet,
        reasonOption,
        otherReason,
        agree,
      };

      localStorage.setItem("xander_meeting_registration_draft", JSON.stringify(draft));

    } catch {

      // ignore

    }

  }, [
    fullName,
    email,
    phone,
    selectedSlot,
    step,
    learnerTimezone,
    timezoneManuallySet,
    reasonOption,
    otherReason,
    agree,
  ]);



  const validate = () => {

    const next: Record<string, string> = {};



    if (!fullName.trim()) next.fullName = "Full name is required.";

    if (!email.trim()) next.email = "Email is required.";

    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email.";



    if (!phone.trim()) next.phone = "Phone number is required.";

    if (!reasonOption) next.reason = "Please select a reason for booking.";
    else if (reasonOption === "other" && !otherReason.trim())
      next.reason = "Please type your reason for booking.";

    if (!selectedSlot) next.selectedSlot = "Please select a date and time.";



    if (!agree) next.agree = "Please confirm.";



    setErrors(next);

    return Object.keys(next).length === 0;

  };



  const clearDraft = () => {

    try {

      localStorage.removeItem("xander_meeting_registration_draft");

    } catch {

      // ignore

    }

  };



  const handleSubmit = async (e: FormEvent) => {

    e.preventDefault();



    if (!validate()) {

      toast.fire({

        icon: "error",

        title: "Please fix the form",

        text: "Some fields are missing or invalid.",

      });

      return;

    }



    setSubmitting(true);



    try {

      const scheduleLabelText = selectedSlot
        ? formatBookingConfirmationLabel(
            selectedSlot.startsAt,
            learnerTimezone,
            selectedSlot.schedule
          )
        : "";
      const submittedEmail = email.trim();

      const bookingReason =
        reasonOption === "other" ? otherReason.trim() : reasonOption;

      await submitMeetingRegistration({
        full_name: fullName.trim(),
        email: submittedEmail,
        phone: phone.trim(),
        available_schedule_id: selectedSlot?.scheduleId ?? null,
        meeting_at: selectedSlot?.startsAt ?? null,
        schedule_label: scheduleLabelText,
        country: learnerTimezone,
        learner_timezone: learnerTimezone,
        notes: bookingReason,
      });

      clearDraft();

      setConfirmedBooking({
        email: submittedEmail,
        sessionLabel: scheduleLabelText,
        timezoneLabel: timezoneDisplayLabel(learnerTimezone),
      });

      setFullName("");
      setEmail("");
      setPhone("");
      setSelectedSlot(null);
      setStep(1);
      setReasonOption("");
      setOtherReason("");
      setAgree(false);
      setErrors({});

    } catch (err: any) {

      const message =

        err?.response?.data?.message ||

        err?.message ||

        "Failed to submit meeting registration. Please try again.";

      toast.fire({

        icon: "error",

        title: "Submission failed",

        text: message,

      });

    } finally {

      setSubmitting(false);

    }

  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <main className="public-page-offset pb-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <Badge className="mb-4 bg-[#0070D0]/8 text-[#0070D0] border-[#0070D0]/15 hover:bg-[#0070D0]/10">
              <Video className="h-3.5 w-3.5 mr-1.5" />
              Book a session
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-[#0070D0] mb-2">Book meeting with us</h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Choose a time, share your details, and we will email you a confirmation with your secure online meeting link.
            </p>

            <div className="mt-8 flex items-center justify-center gap-2 sm:gap-4">
              <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors", step === 1 ? "bg-[#0070D0] text-white shadow-md shadow-[#0070D0]/20" : "bg-white text-slate-500 border border-slate-200")}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">1</span>
                Choose time
              </div>
              <div className="h-px w-8 sm:w-12 bg-slate-200" />
              <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-colors", step === 2 ? "bg-[#0070D0] text-white shadow-md shadow-[#0070D0]/20" : "bg-white text-slate-500 border border-slate-200")}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">2</span>
                Your info
              </div>
            </div>
          </motion.div>

          {step === 1 ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <MeetingSchedulePicker
                schedules={availableSchedules}
                calendar={calendarConfig}
                bookedSlots={bookedSlots}
                learnerTimezone={learnerTimezone}
                timezoneOptions={timezoneOptions}
                onTimezoneChange={(iana) => {
                  setLearnerTimezone(iana);
                  setTimezoneManuallySet(true);
                }}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                onContinue={() => {
                  if (!selectedSlot) return;
                  setStep(2);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />

              <ul className="mt-8 grid gap-3 sm:grid-cols-3 max-w-3xl mx-auto">
                {[
                  "Select a date on the calendar",
                  "Choose a time in your timezone",
                  "Get email reminders before your session",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2 text-sm text-slate-600">
                    <CheckCircle2 className="h-4 w-4 text-[#FCC400] shrink-0 mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-[#0070D0] via-[#FCC400] to-[#0070D0]" />

                <CardHeader className="pb-4 pt-8 px-6 md:px-8">
                  <CardTitle className="text-xl font-bold text-[#0070D0]">Your information</CardTitle>
                  {selectedSlot && learnerTimezone && (
                    <div className="mt-4 rounded-2xl border border-[#0070D0]/10 bg-gradient-to-br from-[#0070D0]/5 to-white p-4">
                      <div className="flex gap-3">
                        <div className="shrink-0 rounded-xl border border-[#0070D0]/15 bg-white px-2.5 py-2 text-center min-w-[52px] shadow-sm">
                          <CalendarDays className="h-4 w-4 text-[#0070D0] mx-auto" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[#0070D0] leading-snug">
                            {formatSelectedMeeting(selectedSlot.startsAt, learnerTimezone)}
                            <button
                              type="button"
                              onClick={() => setStep(1)}
                              className="ml-2 text-[#FCC400] hover:underline font-semibold"
                            >
                              Edit
                            </button>
                          </p>
                          <p className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
                            <Video className="h-3.5 w-3.5 text-[#0070D0]" />
                            Zoom (online) · {timezoneDisplayLabel(learnerTimezone)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <CardDescription className="text-slate-500 mt-3">
                    Fields marked with <span className="text-[#FCC400]">*</span> are required.
                  </CardDescription>
                </CardHeader>

                <CardContent className="px-6 md:px-8 pb-8 pt-0">
                  <form className="space-y-8" onSubmit={handleSubmit}>
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <User className="h-4 w-4 text-[#0070D0]" />
                        <h3 className="text-sm font-semibold text-[#0070D0] uppercase tracking-wide">Your details</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="fullName" className="text-slate-700">
                            Full name <span className="text-[#FCC400]">*</span>
                          </Label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="fullName"
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Enter your full name"
                              aria-invalid={Boolean(errors.fullName)}
                              className={cn(inputClass(Boolean(errors.fullName)), "pl-11")}
                            />
                          </div>
                          {fieldError("fullName")}
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-slate-700">
                            Email <span className="text-[#FCC400]">*</span>
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="email"
                              type="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="you@example.com"
                              aria-invalid={Boolean(errors.email)}
                              className={cn(inputClass(Boolean(errors.email)), "pl-11")}
                            />
                          </div>
                          {fieldError("email")}
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                          <Label htmlFor="phone" className="text-slate-700">
                            Phone <span className="text-[#FCC400]">*</span>
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              id="phone"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="Enter your phone number"
                              aria-invalid={Boolean(errors.phone)}
                              className={cn(inputClass(Boolean(errors.phone)), "pl-11")}
                            />
                          </div>
                          <p className="text-xs text-slate-500">Used for session reminders if needed.</p>
                          {fieldError("phone")}
                        </div>
                      </div>
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                        <MessageSquare className="h-4 w-4 text-[#0070D0]" />
                        <h3 className="text-sm font-semibold text-[#0070D0] uppercase tracking-wide">
                          Reason for booking <span className="text-[#FCC400]">*</span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {BOOKING_REASONS.map((reason) => {
                          const active = reasonOption === reason.value;
                          return (
                            <button
                              key={reason.value}
                              type="button"
                              onClick={() => setReasonOption(reason.value)}
                              className={cn(
                                "rounded-xl border px-4 py-3 text-sm font-semibold transition-all text-left",
                                active
                                  ? "border-[#0070D0] bg-[#0070D0]/5 text-[#0070D0] shadow-sm"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <span
                                  className={cn(
                                    "flex h-4 w-4 items-center justify-center rounded-full border",
                                    active ? "border-[#0070D0]" : "border-slate-300"
                                  )}
                                >
                                  {active && <span className="h-2 w-2 rounded-full bg-[#0070D0]" />}
                                </span>
                                {reason.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {reasonOption === "other" && (
                        <Textarea
                          id="otherReason"
                          value={otherReason}
                          onChange={(e) => setOtherReason(e.target.value)}
                          placeholder="Type your reason for booking..."
                          rows={4}
                          aria-invalid={Boolean(errors.reason)}
                          className={cn(inputClass(Boolean(errors.reason)), "min-h-[100px] py-3 pl-4 resize-none")}
                        />
                      )}

                      {fieldError("reason")}
                    </section>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="agree"
                          checked={agree}
                          onCheckedChange={(checked) => setAgree(Boolean(checked))}
                          className="mt-0.5 data-[state=checked]:bg-[#0070D0] data-[state=checked]:border-[#0070D0]"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="agree" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                            I confirm that this information is correct.
                          </Label>
                          {fieldError("agree")}
                        </div>
                      </div>
                    </div>

                    {fieldError("selectedSlot")}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between border-t border-slate-100 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="rounded-full border-[#0070D0] text-[#0070D0] hover:bg-[#0070D0]/5"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-[#0070D0] hover:bg-[#0058A8] text-white font-semibold px-8 h-12 shadow-lg shadow-[#0070D0]/20"
                      >
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Confirming?
                          </span>
                        ) : (
                          "Confirm booking"
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>

      <BookingConfirmedDialog
        open={confirmedBooking !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmedBooking(null);
        }}
        email={confirmedBooking?.email ?? ""}
        sessionLabel={confirmedBooking?.sessionLabel ?? ""}
        timezoneLabel={confirmedBooking?.timezoneLabel}
      />
    </div>
  );

};



export default MeetingRegistration;


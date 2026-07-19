import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  Headphones,
  Loader2,
  MessageSquare,
  Mic,
  PenLine,
  Trash2,
  Upload,
  UserCheck,
} from "lucide-react";
import { QuizAudioPlayer } from "@/components/quizzes/QuizAudioPlayer";
import type { QuizQuestion } from "@/api/axios";

type Props = {
  index: number;
  question: QuizQuestion;
  courseId: number | string;
  uploading: boolean;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onRemove: () => void;
  onUpload: (file: File) => void;
  /** When true, hide type switcher — oral-only assessment */
  oralOnly?: boolean;
  onSwitchType?: (type: QuizQuestion["type"]) => void;
};

export const OralQuestionEditor = ({
  index,
  question,
  courseId,
  uploading,
  onChange,
  onRemove,
  onUpload,
  oralOnly = false,
  onSwitchType,
}: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const responseFormat = question.response_format ?? "audio";
  const hasAudio = !!question.prompt_audio_url?.trim();

  return (
    <article className="overflow-hidden rounded-2xl border border-primary/20 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-gradient-primary px-4 py-3 text-white">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm flex items-center gap-2">
              <Headphones className="h-4 w-4 shrink-0" />
              Oral listening task
            </p>
            <p className="text-xs text-white/90 truncate">
              Learner hears your audio, then responds
              {responseFormat === "audio" ? " by microphone" : " in writing"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-white/15 text-white border-0 text-[10px]">
            <Cloud className="h-3 w-3 mr-1 inline" />
            pCloud
          </Badge>
          {!oralOnly && onSwitchType && (
            <select
              className="h-8 rounded-md border-0 bg-white/15 px-2 text-xs text-white"
              value="oral_listen"
              onChange={(e) => onSwitchType(e.target.value as QuizQuestion["type"])}
            >
              <option value="oral_listen" className="text-foreground">
                Oral task
              </option>
              <option value="multiple_choice" className="text-foreground">
                Multiple choice
              </option>
              <option value="true_false" className="text-foreground">
                True / False
              </option>
              <option value="short_answer" className="text-foreground">
                Short answer
              </option>
            </select>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20 hover:text-white"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="p-4 sm:p-5 space-y-5">
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              1
            </span>
            <Label className="text-sm font-medium">Upload prompt audio</Label>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className={`w-full rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
              hasAudio
                ? "border-primary/40 bg-primary/5"
                : "border-muted-foreground/25 bg-muted/20 hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm">Uploading to pCloud…</span>
              </div>
            ) : hasAudio ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Headphones className="h-8 w-8" />
                <span className="text-sm font-medium">Audio uploaded — tap to replace</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <span className="text-sm font-medium text-foreground">Choose audio file</span>
                <span className="text-xs">MP3, WAV, M4A, WebM · max 15 MB</span>
              </div>
            )}
          </button>
          {hasAudio && courseId && (
            <QuizAudioPlayer
              src={question.prompt_audio_url!}
              courseId={Number(courseId)}
              filename={question.prompt_audio_filename ?? undefined}
              label="Preview — what learners will hear"
            />
          )}
          {!hasAudio && !uploading && (
            <p className="text-xs text-amber-700 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
              No audio uploaded yet — learners will not hear a prompt until you upload a file.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              2
            </span>
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-primary" />
              Instruction for the learner
            </Label>
          </div>
          <Textarea
            value={question.instruction ?? ""}
            onChange={(e) => onChange({ instruction: e.target.value })}
            placeholder="Pour cet audio, écoutez et donnez moi le résumé oral."
            rows={3}
            className="resize-none text-sm leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            Shown below the audio player — like your WhatsApp instruction message.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
              3
            </span>
            <Label className="text-sm font-medium">How should the learner reply?</Label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange({ response_format: "audio" })}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                responseFormat === "audio"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <Mic className={`h-5 w-5 shrink-0 ${responseFormat === "audio" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-semibold">Oral reply</p>
                <p className="text-xs text-muted-foreground mt-0.5">Microphone recording</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onChange({ response_format: "text" })}
              className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                responseFormat === "text"
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <PenLine className={`h-5 w-5 shrink-0 ${responseFormat === "text" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <p className="text-sm font-semibold">Written reply</p>
                <p className="text-xs text-muted-foreground mt-0.5">Text box summary</p>
              </div>
            </button>
          </div>
        </section>

        <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-start gap-2 text-xs text-amber-900">
          <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <strong>Manual marking.</strong> Learner replies are saved for you to review and grade — no AI auto-correction for oral tasks.
          </p>
        </div>
      </div>
    </article>
  );
};

export default OralQuestionEditor;

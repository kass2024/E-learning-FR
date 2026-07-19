import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import {
  CODE_PREFIX_OPTIONS,
  DEFAULT_GUIDELINES,
  DEFAULT_HOW_TO_USE,
  guidelinesToText,
  textToGuidelines,
  type CourseDetailsFields,
  type HowToUseItem,
} from "@/lib/courseDetails";
import { suggestCourseCode } from "@/api/axios";

type CourseDetailsFormFieldsProps = {
  value: CourseDetailsFields;
  onChange: (next: CourseDetailsFields) => void;
  courseTitle?: string;
  showCode?: boolean;
  section?: "all" | "code" | "guide" | "policies";
};

export function CourseDetailsFormFields({
  value,
  onChange,
  courseTitle,
  showCode = true,
  section = "all",
}: CourseDetailsFormFieldsProps) {
  const [generatingCode, setGeneratingCode] = useState(false);
  const [codePrefix, setCodePrefix] = useState<string>(CODE_PREFIX_OPTIONS[0]);
  const guidelinesText = guidelinesToText(value.guidelines);
  const howToUse = value.how_to_use?.length ? value.how_to_use : DEFAULT_HOW_TO_USE;

  const patch = (partial: Partial<CourseDetailsFields>) => onChange({ ...value, ...partial });

  const handleGenerateCode = async () => {
    setGeneratingCode(true);
    try {
      const result = await suggestCourseCode(courseTitle, codePrefix);
      patch({ course_code: result.course_code });
    } finally {
      setGeneratingCode(false);
    }
  };

  const updateHowToUse = (index: number, field: keyof HowToUseItem, text: string) => {
    const next = [...howToUse];
    next[index] = { ...next[index], [field]: text };
    patch({ how_to_use: next });
  };

  return (
    <div className="space-y-6">
      {showCode && (section === "all" || section === "code") && (
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Sparkles className="h-4 w-4 text-[#0070D0]" />
            Course code
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a predefined code (e.g. BBA076) or generate one automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={value.course_code ?? ""}
              onChange={(e) => patch({ course_code: e.target.value.toUpperCase() })}
              placeholder="e.g. ENG247"
              className="font-mono uppercase"
            />
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={codePrefix}
              onChange={(e) => setCodePrefix(e.target.value)}
            >
              {CODE_PREFIX_OPTIONS.map((prefix) => (
                <option key={prefix} value={prefix}>
                  {prefix}
                </option>
              ))}
            </select>
            <Button type="button" variant="outline" onClick={handleGenerateCode} disabled={generatingCode}>
              {generatingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {(section === "all" || section === "guide") && (
        <>
          <div className="space-y-2">
            <Label>General information</Label>
            <Textarea
              rows={4}
              value={value.general_information ?? ""}
              onChange={(e) => patch({ general_information: e.target.value })}
              placeholder="Welcome message and course overview for learners..."
            />
          </div>

          <div className="space-y-2">
            <Label>Important information</Label>
            <Textarea
              rows={4}
              value={value.important_information ?? ""}
              onChange={(e) => patch({ important_information: e.target.value })}
              placeholder="Key expectations, structure, and how the course runs..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Guidelines (one per line)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => patch({ guidelines: DEFAULT_GUIDELINES })}
              >
                Use template
              </Button>
            </div>
            <Textarea
              rows={6}
              value={guidelinesText}
              onChange={(e) => patch({ guidelines: textToGuidelines(e.target.value) })}
              placeholder="Stay Updated: Check announcements regularly..."
            />
          </div>

          <div className="space-y-3">
            <Label>How to use this course</Label>
            {howToUse.map((item, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-2 bg-white">
                <Input
                  value={item.title}
                  onChange={(e) => updateHowToUse(index, "title", e.target.value)}
                  placeholder="Section title"
                />
                <Textarea
                  rows={2}
                  value={item.description ?? ""}
                  onChange={(e) => updateHowToUse(index, "description", e.target.value)}
                  placeholder="Short explanation for learners"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {(section === "all" || section === "policies") && (
        <>
          <div className="space-y-2">
            <Label>Attendance policy</Label>
            <Textarea
              rows={6}
              value={value.attendance_policy ?? ""}
              onChange={(e) => patch({ attendance_policy: e.target.value })}
              placeholder="Attendance expectations, online class conduct, minimum scores..."
            />
          </div>

          <div className="space-y-2">
            <Label>Assessment policy</Label>
            <Textarea
              rows={4}
              value={value.assessment_policy ?? ""}
              onChange={(e) => patch({ assessment_policy: e.target.value })}
              placeholder="Grading, retakes, continuous assessment rules..."
            />
          </div>
        </>
      )}
    </div>
  );
}

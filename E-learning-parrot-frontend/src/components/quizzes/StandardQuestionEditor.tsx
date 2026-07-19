import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import type { QuizQuestion } from "@/api/axios";

type Props = {
  index: number;
  question: QuizQuestion;
  onChange: (patch: Partial<QuizQuestion>) => void;
  onRemove: () => void;
  onSwitchType?: (type: QuizQuestion["type"]) => void;
};

export const StandardQuestionEditor = ({ index, question, onChange, onRemove, onSwitchType }: Props) => {
  const type = question.type;

  return (
    <article className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="outline" className="font-normal">
          Question {index + 1}
        </Badge>
        <div className="flex items-center gap-2">
          {onSwitchType && (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={type}
              onChange={(e) => onSwitchType(e.target.value as QuizQuestion["type"])}
            >
              <option value="true_false">True / False</option>
              <option value="multiple_choice">Multiple choice</option>
              <option value="short_answer">Short answer (AI marked)</option>
              <option value="oral_listen">Oral — listen & respond</option>
            </select>
          )}
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">Question text</Label>
        <Textarea
          value={question.question}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder="Enter your question…"
          rows={2}
        />
      </div>

      {type === "multiple_choice" && (
        <div className="space-y-2">
          <Label className="text-sm">Answer options</Label>
          {(question.options ?? ["", "", "", ""]).map((opt, optIdx) => (
            <Input
              key={optIdx}
              value={opt}
              onChange={(e) => {
                const next = [...(question.options ?? ["", "", "", ""])];
                next[optIdx] = e.target.value;
                onChange({ options: next });
              }}
              placeholder={`Option ${optIdx + 1}`}
            />
          ))}
          <Input
            value={question.correct_answer ?? ""}
            onChange={(e) => onChange({ correct_answer: e.target.value })}
            placeholder="Correct answer (exact match)"
          />
        </div>
      )}

      {type === "true_false" && (
        <div className="space-y-2">
          <Label className="text-sm">Correct answer</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={question.correct_answer === "False" ? "False" : "True"}
            onChange={(e) => onChange({ correct_answer: e.target.value })}
          >
            <option value="True">True</option>
            <option value="False">False</option>
          </select>
        </div>
      )}

      {type === "short_answer" && (
        <div className="space-y-2">
          <Label className="text-sm">Model answer (Gemini marking)</Label>
          <Textarea
            value={question.model_answer ?? ""}
            onChange={(e) => onChange({ model_answer: e.target.value })}
            placeholder="Expected answer…"
            rows={2}
          />
        </div>
      )}
    </article>
  );
};

export default StandardQuestionEditor;

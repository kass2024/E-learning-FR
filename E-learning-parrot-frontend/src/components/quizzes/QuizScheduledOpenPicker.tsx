import { SmartDateTimePicker } from "@/components/ui/SmartDateTimePicker";

type QuizScheduledOpenPickerProps = {
  datetimeLocal: string;
  timezone: string;
  onDatetimeChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  idPrefix?: string;
};

export function QuizScheduledOpenPicker({
  datetimeLocal,
  timezone,
  onDatetimeChange,
  onTimezoneChange,
  idPrefix = "quiz-scheduled",
}: QuizScheduledOpenPickerProps) {
  return (
    <SmartDateTimePicker
      idPrefix={idPrefix}
      value={datetimeLocal}
      timezone={timezone}
      onValueChange={onDatetimeChange}
      onTimezoneChange={onTimezoneChange}
    />
  );
}

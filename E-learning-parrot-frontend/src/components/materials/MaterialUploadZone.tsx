import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  disabled?: boolean;
  uploading?: boolean;
  uploadProgress?: number | null;
  uploadingFileName?: string | null;
  onUpload: (files: File[], description?: string) => Promise<void>;
};

export function MaterialUploadZone({ disabled, uploading, uploadProgress, uploadingFileName, onUpload }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<File[]>([]);
  const [description, setDescription] = useState("");

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    setSelected((prev) => {
      const map = new Map(prev.map((f) => [`${f.name}-${f.size}`, f]));
      Array.from(list).forEach((f) => map.set(`${f.name}-${f.size}`, f));
      return Array.from(map.values());
    });
  };

  const removeFile = (index: number) => {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selected.length || disabled || uploading) return;
    await onUpload(selected, description.trim() || undefined);
    setSelected([]);
    setDescription("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled || uploading) return;
      addFiles(e.dataTransfer.files);
    },
    [disabled, uploading]
  );

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition",
          dragOver ? "border-[#0A0A0A] bg-[#0A0A0A]/5" : "border-border bg-muted/20",
          disabled && "opacity-60 pointer-events-none"
        )}
      >
        <UploadCloud className="h-10 w-10 mx-auto mb-3 text-[#0A0A0A]" />
        <p className="font-medium">Drag & drop files here</p>
        <p className="text-sm text-muted-foreground mt-1">
          Any file type — uploaded directly to your F&R Rwanda pCloud folder (not stored on the server)
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
        >
          Browse files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {selected.length > 0 && (
        <div className="rounded-xl border bg-white/80 p-4 space-y-3">
          <p className="text-sm font-medium">{selected.length} file(s) ready to upload</p>
          <ul className="space-y-2 max-h-40 overflow-y-auto">
            {selected.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{file.name}</span>
                <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeFile(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div>
            <Label className="text-xs">Description (optional, applies to all files in this batch)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Week 1 slides, reading list, etc."
              rows={2}
              className="mt-1"
            />
          </div>
          <Button onClick={handleSubmit} disabled={uploading || disabled} className="w-full sm:w-auto">
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading to pCloud...
              </>
            ) : (
              `Upload ${selected.length} file(s)`
            )}
          </Button>
          {uploading && uploadProgress != null && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span className="truncate max-w-[70%]">{uploadingFileName ?? "Uploading..."}</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#0A0A0A] to-[#FCC400] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

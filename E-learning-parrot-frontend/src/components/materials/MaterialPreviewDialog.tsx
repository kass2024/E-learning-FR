import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2, Music, Video } from "lucide-react";
import { isPdfFilename } from "@/lib/materialFileUtils";

export type MaterialPreviewItem = {
  name: string;
  category: "images" | "videos" | "audio" | "documents";
  previewUrl: string;
  downloadUrl?: string;
  thumbUrl?: string;
};

type Props = {
  item: MaterialPreviewItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MaterialPreviewDialog({ item, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && item) {
      setLoading(true);
    }
  }, [open, item?.previewUrl]);

  if (!item) return null;

  const downloadHref = item.downloadUrl ?? item.previewUrl;
  const isPdf = isPdfFilename(item.name);
  const thumbSrc = item.thumbUrl ?? (item.category === "images" ? item.previewUrl : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-8">
            {item.category === "videos" && <Video className="h-5 w-5 text-primary" />}
            {item.category === "audio" && <Music className="h-5 w-5 text-primary" />}
            {item.category === "documents" && <FileText className="h-5 w-5 text-primary" />}
            <span className="truncate">{item.name}</span>
          </DialogTitle>
          <DialogDescription>Preview and download this learning material.</DialogDescription>
        </DialogHeader>

        <div className="relative rounded-xl border bg-muted/30 overflow-hidden min-h-[200px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/70">
              <Loader2 className="h-8 w-8 animate-spin text-[#0A0A0A]" />
              <p className="text-sm text-muted-foreground">Loading preview...</p>
            </div>
          )}

          {item.category === "images" && (
            <img
              src={item.previewUrl}
              alt={item.name}
              className="w-full max-h-[65vh] object-contain bg-black/5"
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}

          {item.category === "videos" && (
            <video
              src={item.previewUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[65vh] bg-black"
              onLoadedData={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}

          {item.category === "audio" && (
            <div className="p-8 flex flex-col items-center gap-4 bg-gradient-to-br from-[#0A0A0A]/5 to-[#FCC400]/10">
              <Music className="h-16 w-16 text-[#0A0A0A]" />
              <audio
                controls
                preload="metadata"
                className="w-full max-w-lg"
                onLoadedData={() => setLoading(false)}
                onError={() => setLoading(false)}
              >
                <source src={item.previewUrl} />
              </audio>
            </div>
          )}

          {item.category === "documents" && (
            <div className="p-4 space-y-4">
              {isPdf ? (
                <iframe
                  title={item.name}
                  src={item.previewUrl}
                  className="w-full h-[62vh] rounded-lg border bg-white"
                  onLoad={() => setLoading(false)}
                />
              ) : thumbSrc ? (
                <div className="space-y-4">
                  <img
                    src={thumbSrc}
                    alt={`Preview of ${item.name}`}
                    className="w-full max-h-[50vh] object-contain mx-auto rounded-lg border bg-white"
                    onLoad={() => setLoading(false)}
                    onError={() => setLoading(false)}
                  />
                  <p className="text-center text-sm text-muted-foreground">
                    Document preview — download to open the full file in Word, Excel, or PowerPoint.
                  </p>
                </div>
              ) : (
                <div className="text-center py-10">
                  <FileText className="h-14 w-14 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Open or download this document to view it on your device.
                  </p>
                  <Button asChild variant="secondary" onClick={() => setLoading(false)}>
                    <a href={downloadHref} target="_blank" rel="noopener noreferrer">
                      Open file
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button asChild variant="outline">
            <a href={downloadHref} target="_blank" rel="noopener noreferrer" download>
              <Download className="h-4 w-4 mr-2" />
              Download
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

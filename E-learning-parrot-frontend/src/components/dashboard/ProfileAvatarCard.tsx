import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { cn } from "@/lib/utils";

type ProfileAvatarCardProps = {
  onAvatarChange?: (url: string) => void;
};

export function ProfileAvatarCard({ onAvatarChange }: ProfileAvatarCardProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("parrot_user_avatar") || "");
  const [uploading, setUploading] = useState(false);
  const displayName = localStorage.getItem("parrot_user_name") || "User";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "U";

  useEffect(() => {
    const sync = () => setAvatarUrl(localStorage.getItem("parrot_user_avatar") || "");
    window.addEventListener("storage", sync);
    window.addEventListener("parrot-avatar-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("parrot-avatar-updated", sync);
    };
  }, []);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    const role = localStorage.getItem("parrot_user_role") || "";
    const email = localStorage.getItem("parrot_user_email") || "";
    if (!role || !email) {
      toast({ variant: "destructive", title: "Not logged in", description: "Please log in again." });
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      form.append("role", role);
      form.append("email", email);

      const response = await fetch(`${getApiBaseUrl()}/auth/avatar`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Could not upload picture.");
      }

      const url = String(data.url || data.avatar || "");
      if (url) {
        localStorage.setItem("parrot_user_avatar", url);
        setAvatarUrl(url);
        onAvatarChange?.(url);
        window.dispatchEvent(new Event("parrot-avatar-updated"));
      }

      toast({ title: "Photo updated", description: "Your profile picture was saved." });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border bg-slate-50/80 p-4">
      <div className="relative">
        <div
          className={cn(
            "h-24 w-24 rounded-full overflow-hidden border-2 border-white shadow-md bg-primary/10 flex items-center justify-center",
          )}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-primary">{initials}</span>
          )}
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-[#254D81] text-white shadow-md flex items-center justify-center hover:bg-[#1d3c66] disabled:opacity-60"
          aria-label="Change profile picture"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="text-center sm:text-left space-y-1">
        <p className="font-semibold text-slate-900 flex items-center justify-center sm:justify-start gap-2">
          <UserRound className="h-4 w-4 text-primary" />
          Profile photo
        </p>
        <p className="text-sm text-muted-foreground">JPG or PNG, up to 10 MB. Shown in the top-right of your dashboard.</p>
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? "Uploading…" : "Upload new photo"}
        </Button>
      </div>
    </div>
  );
}

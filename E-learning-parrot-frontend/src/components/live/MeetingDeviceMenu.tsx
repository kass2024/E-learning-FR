import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronUp } from "lucide-react";
import {
  openSdkAudioSettings,
  openSdkVideoSettings,
  selectSdkMenuDevice,
} from "@/components/live/zoomMeetingClient";

type DeviceKind = "audio-input" | "audio-output" | "video-input";

type Props = {
  kind: DeviceKind;
  label: string;
  selectedId?: string;
  disabled?: boolean;
  onSelected?: (deviceId: string) => void;
};

function groupLabel(kind: DeviceKind) {
  if (kind === "audio-input") return "Microphone";
  if (kind === "audio-output") return "Speaker";
  return "Camera";
}

export function MeetingDeviceMenu({ kind, label, selectedId, disabled, onSelected }: Props) {
  const [open, setOpen] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState(selectedId ?? "");
  const rootRef = useRef<HTMLDivElement>(null);

  const loadDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const filtered = list.filter((d) => {
        if (kind === "audio-input") return d.kind === "audioinput";
        if (kind === "audio-output") return d.kind === "audiooutput";
        return d.kind === "videoinput";
      });
      setDevices(filtered);
      if (!activeId && filtered[0]) setActiveId(filtered[0].deviceId);
    } catch {
      setDevices([]);
    }
  }, [activeId, kind]);

  useEffect(() => {
    setActiveId(selectedId ?? "");
  }, [selectedId]);

  useEffect(() => {
    if (!open) return;
    void loadDevices();
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [loadDevices, open]);

  const pickDevice = async (device: MediaDeviceInfo) => {
    setLoading(true);
    try {
      if (kind === "video-input") {
        await openSdkVideoSettings();
      } else {
        await openSdkAudioSettings();
      }
      const picked = await selectSdkMenuDevice(device.label || device.deviceId);
      if (picked) {
        setActiveId(device.deviceId);
        onSelected?.(device.deviceId);
      }
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((v) => !v)}
        className="mb-5 rounded p-0.5 text-zinc-500 hover:bg-white/10 hover:text-zinc-300 disabled:opacity-40"
        aria-label={`${label} device settings`}
        aria-expanded={open}
      >
        <ChevronUp className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-1/2 z-[220] mb-2 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-[#2a2a2a] py-1 shadow-xl">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            {groupLabel(kind)}
          </p>
          {devices.length === 0 && (
            <p className="px-3 py-2 text-xs text-zinc-400">No devices found</p>
          )}
          {devices.map((device, index) => {
            const name = device.label?.trim() || `${groupLabel(kind)} ${index + 1}`;
            const selected = device.deviceId === activeId;
            return (
              <button
                key={device.deviceId || `${kind}-${index}`}
                type="button"
                disabled={loading}
                onClick={() => void pickDevice(device)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {selected ? <Check className="h-3 w-3 text-emerald-400" /> : null}
                </span>
                <span className="truncate">{name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

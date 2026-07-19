import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_PORTAL_ACCENT,
  DEFAULT_PORTAL_BUTTON_TEXT,
  DEFAULT_PORTAL_PRIMARY,
  type PortalColorDraft,
  portalThemeStyle,
  resolvePortalTheme,
} from "@/lib/institutionPortal";
import { cn } from "@/lib/utils";

type Props = {
  value: PortalColorDraft;
  onChange: (next: PortalColorDraft) => void;
  className?: string;
  showPreview?: boolean;
  institutionName?: string;
};

function ColorRow({
  label,
  hint,
  field,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  field: keyof PortalColorDraft;
  value: PortalColorDraft;
  onChange: (next: PortalColorDraft) => void;
}) {
  const hex = value[field] || DEFAULT_PORTAL_PRIMARY;
  const pickerValue = /^#[0-9A-Fa-f]{6}$/.test(hex)
    ? hex
    : /^#[0-9A-Fa-f]{3}$/.test(hex)
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : DEFAULT_PORTAL_PRIMARY;

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={pickerValue}
          onChange={(e) => onChange({ ...value, [field]: e.target.value.toUpperCase() })}
          className="h-10 w-12 cursor-pointer rounded border border-input bg-transparent p-1"
        />
        <Input
          value={hex}
          onChange={(e) => onChange({ ...value, [field]: e.target.value.toUpperCase() })}
          placeholder="#0070D0"
          className="font-mono uppercase"
          maxLength={9}
        />
      </div>
    </div>
  );
}

export function InstitutionWebsiteColorControls({
  value,
  onChange,
  className,
  showPreview = true,
  institutionName = "Institution",
}: Props) {
  const theme = resolvePortalTheme({
    id: 0,
    name: institutionName,
    slug: "preview",
    portal: {
      tagline: "",
      hero_title: "",
      hero_subtitle: "",
      about: "",
      primary_color: value.primary_color || DEFAULT_PORTAL_PRIMARY,
      accent_color: value.accent_color || DEFAULT_PORTAL_ACCENT,
      hero_bg_color: value.hero_bg_color || value.primary_color || DEFAULT_PORTAL_PRIMARY,
      button_bg_color: value.button_bg_color || value.primary_color || DEFAULT_PORTAL_PRIMARY,
      button_text_color: value.button_text_color || DEFAULT_PORTAL_BUTTON_TEXT,
      features: [],
      hero_image_url: null,
      cta_label: "Start enrollment",
    },
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">Website color control</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Set a unique look for this institution&apos;s public site, login, and register pages. Changes apply after save.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ColorRow
          label="Primary"
          hint="Header, links, headings"
          field="primary_color"
          value={value}
          onChange={onChange}
        />
        <ColorRow
          label="Accent"
          hint="Highlights and icons"
          field="accent_color"
          value={value}
          onChange={onChange}
        />
        <ColorRow
          label="Hero background"
          hint="Top banner / contact band"
          field="hero_bg_color"
          value={value}
          onChange={onChange}
        />
        <ColorRow
          label="Button background"
          hint="Solid enroll / CTA buttons"
          field="button_bg_color"
          value={value}
          onChange={onChange}
        />
        <ColorRow
          label="Button text"
          hint="Text on solid buttons"
          field="button_text_color"
          value={value}
          onChange={onChange}
        />
      </div>

      {showPreview && (
        <div className="overflow-hidden rounded-xl border border-border shadow-sm" style={portalThemeStyle(theme)}>
          <div
            className="px-4 py-3 text-sm font-semibold text-white"
            style={{ background: "var(--institution-hero-bg)" }}
          >
            {institutionName} — live preview
          </div>
          <div className="space-y-3 bg-slate-50 p-4">
            <p className="text-sm font-semibold" style={{ color: "var(--institution-primary)" }}>
              Learning paths at {institutionName}
            </p>
            <div className="flex flex-wrap gap-2">
              <span
                className="inline-flex rounded-full px-4 py-2 text-xs font-semibold"
                style={{
                  background: "var(--institution-button-bg)",
                  color: "var(--institution-button-text)",
                }}
              >
                Start enrollment
              </span>
              <span
                className="inline-flex rounded-full border px-4 py-2 text-xs font-semibold"
                style={{
                  borderColor: "var(--institution-primary)",
                  color: "var(--institution-primary)",
                }}
              >
                Sign in
              </span>
              <span
                className="inline-flex rounded-full px-3 py-2 text-xs font-medium text-white"
                style={{ background: "var(--institution-accent)" }}
              >
                Accent
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

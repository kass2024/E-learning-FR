import { Building2, Smartphone, MessageCircle, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type PaymentGuidelinesData = {
  packs?: Array<{
    name: string;
    online?: string;
    in_person?: string;
    from?: string;
    duration?: string;
    featured?: boolean;
  }>;
  methods?: Array<{
    type: string;
    label: string;
    account_name?: string;
    account_number?: string;
    phone?: string;
    ussd?: string;
  }>;
  note?: string;
};

export const DEFAULT_PAYMENT_GUIDELINES: PaymentGuidelinesData = {
  packs: [
    { name: "Pack Intensif", online: "80 000 RWF", in_person: "150 000 RWF", duration: "1 mois" },
    { name: "Pack Réussite", online: "230 000 RWF", in_person: "420 000 RWF", duration: "3 mois", featured: true },
    { name: "Coaching VIP 1-to-1", from: "250 000 RWF/mois", duration: "Flexible" },
  ],
  methods: [
    { type: "bank", label: "Equity Bank", account_name: "Kalisa Valens", account_number: "4015101074908" },
    { type: "momo", label: "MTN Mobile Money", account_name: "Kalisa Valens", phone: "0788 821 579", ussd: "*182#" },
    { type: "whatsapp", label: "WhatsApp confirmation", phone: "+250 788 821 579" },
  ],
  note: "Envoyez la preuve de paiement pour confirmation.",
};

/** @deprecated Prefer DEFAULT_PAYMENT_GUIDELINES */
const DEFAULT_GUIDELINES = DEFAULT_PAYMENT_GUIDELINES;

function methodIcon(type: string) {
  if (type === "bank") return Building2;
  if (type === "whatsapp") return MessageCircle;
  return Smartphone;
}

export function PaymentGuidelines({ data }: { data?: PaymentGuidelinesData | null }) {
  const guidelines = data ?? DEFAULT_GUIDELINES;
  const packs = guidelines.packs ?? DEFAULT_GUIDELINES.packs!;
  const methods = guidelines.methods ?? DEFAULT_GUIDELINES.methods!;

  return (
    <Card className="rounded-2xl border-[#254D81]/20 overflow-hidden">
      <CardHeader className="bg-[#254D81] text-white pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/15 flex items-center justify-center">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg tracking-wide">F&R RWANDA LTD.</CardTitle>
            <p className="text-xs text-white/80 italic">École de la langue française au Rwanda</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div>
          <h3 className="text-sm font-semibold text-[#254D81] mb-2">Packs & tarifs</h3>
          <ul className="space-y-2 text-sm">
            {packs.map((pack) => (
              <li key={pack.name} className="flex gap-2">
                <span className="text-[#254D81]">•</span>
                <span>
                  <span className="font-medium">
                    {pack.name}
                    {pack.featured ? " ★" : ""}
                  </span>
                  {pack.from ? (
                    <> — À partir de {pack.from}</>
                  ) : (
                    <>
                      {" "}
                      — {pack.online} (en ligne) / {pack.in_person} (présentiel)
                    </>
                  )}
                  {pack.duration ? <span className="text-muted-foreground"> · {pack.duration}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#254D81] mb-3">Modes de paiement</h3>
          <div className="space-y-3">
            {methods.map((method) => {
              const Icon = methodIcon(method.type);
              return (
                <div key={method.label} className="flex gap-3 rounded-xl border p-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-[#254D81]/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-[#254D81]" />
                  </div>
                  <div className="text-sm space-y-0.5">
                    <p className="font-medium">{method.label}</p>
                    {method.account_name ? (
                      <p className="text-muted-foreground">Nom: {method.account_name}</p>
                    ) : null}
                    {method.account_number ? (
                      <p className="font-mono text-foreground">{method.account_number}</p>
                    ) : null}
                    {method.phone ? <p className="font-mono">{method.phone}</p> : null}
                    {method.ussd ? <p className="text-muted-foreground">USSD: {method.ussd}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="text-center text-sm italic text-[#254D81]">
          {guidelines.note ?? DEFAULT_GUIDELINES.note}
        </p>
      </CardContent>
    </Card>
  );
}

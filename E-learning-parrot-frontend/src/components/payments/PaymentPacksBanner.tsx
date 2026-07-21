import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, GraduationCap, MessageCircle, Smartphone, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_PAYMENT_GUIDELINES,
  type PaymentGuidelinesData,
} from "@/components/payments/PaymentGuidelines";

type PaymentPacksBannerProps = {
  data?: PaymentGuidelinesData | null;
};

function methodIcon(type: string) {
  if (type === "bank") return Building2;
  if (type === "whatsapp") return MessageCircle;
  return Smartphone;
}

export function PaymentPacksBanner({ data }: PaymentPacksBannerProps) {
  const navigate = useNavigate();
  const guidelines = data ?? DEFAULT_PAYMENT_GUIDELINES;
  const packs = guidelines.packs ?? DEFAULT_PAYMENT_GUIDELINES.packs!;
  const methods = guidelines.methods ?? DEFAULT_PAYMENT_GUIDELINES.methods!;

  return (
    <section
      className="relative z-20 public-page-offset border-b border-[#1a3a63] bg-[#254D81] text-white shadow-[0_8px_28px_rgba(37,77,129,0.35)]"
      aria-label="Packs et modes de paiement"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FCC400] via-white/70 to-[#1F8A4C]" />

      <div className="container mx-auto px-4 py-4 sm:py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <div className="flex items-start gap-3 lg:min-w-[14rem] lg:max-w-[16rem]">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#FCC400]">
                Packs & paiement
              </p>
              <p className="text-sm font-bold leading-tight sm:text-base">F&R RWANDA LTD.</p>
              <p className="text-[11px] italic text-white/75">École de la langue française au Rwanda</p>
            </div>
          </div>

          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            {packs.map((pack) => (
              <div
                key={pack.name}
                className={`rounded-xl px-3 py-2.5 ring-1 ${
                  pack.featured
                    ? "bg-[#FCC400] text-[#0B0B0B] ring-[#FCC400]"
                    : "bg-white/10 ring-white/20"
                }`}
              >
                <p className="flex items-center gap-1 text-xs font-bold sm:text-sm">
                  {pack.name}
                  {pack.featured ? <Star className="h-3.5 w-3.5 fill-current" /> : null}
                </p>
                <p className={`mt-0.5 text-[11px] leading-snug sm:text-xs ${pack.featured ? "text-[#0B0B0B]/80" : "text-white/85"}`}>
                  {pack.from ? (
                    <>À partir de {pack.from}</>
                  ) : (
                    <>
                      {pack.online} en ligne
                      <span className="opacity-70"> · </span>
                      {pack.in_person} présentiel
                    </>
                  )}
                </p>
                {pack.duration ? (
                  <p className={`mt-0.5 text-[10px] font-medium uppercase tracking-wide ${pack.featured ? "text-[#0B0B0B]/65" : "text-white/60"}`}>
                    {pack.duration}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-stretch xl:flex-row xl:items-center">
            <div className="grid flex-1 gap-1.5 text-[11px] sm:text-xs sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {methods.map((method) => {
                const Icon = methodIcon(method.type);
                return (
                  <div
                    key={method.label}
                    className="flex items-start gap-2 rounded-lg bg-black/15 px-2.5 py-2 ring-1 ring-white/10"
                  >
                    <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FCC400]" />
                    <div className="min-w-0 leading-snug">
                      <p className="font-semibold">{method.label}</p>
                      {method.account_name ? (
                        <p className="truncate text-white/70">{method.account_name}</p>
                      ) : null}
                      {method.account_number ? (
                        <p className="font-mono font-semibold tracking-wide">{method.account_number}</p>
                      ) : null}
                      {method.phone ? (
                        <p className="font-mono font-semibold tracking-wide">{method.phone}</p>
                      ) : null}
                      {method.ussd ? <p className="text-white/70">USSD {method.ussd}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <Button
              size="lg"
              className="h-11 shrink-0 rounded-full bg-[#FCC400] px-6 font-bold text-[#0B0B0B] hover:bg-[#E6B000]"
              onClick={() => navigate("/signup")}
            >
              Get started
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="mt-3 text-center text-[11px] italic text-white/80 sm:text-left">
          {guidelines.note ?? DEFAULT_PAYMENT_GUIDELINES.note}
        </p>
      </div>
    </section>
  );
}

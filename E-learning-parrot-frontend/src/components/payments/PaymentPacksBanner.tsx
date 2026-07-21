import { Building2, GraduationCap, MessageCircle, Smartphone, Star } from "lucide-react";
import { motion } from "framer-motion";
import {
  DEFAULT_PAYMENT_GUIDELINES,
  type PaymentGuidelinesData,
} from "@/components/payments/PaymentGuidelines";
import { cn } from "@/lib/utils";

type PaymentPacksBannerProps = {
  data?: PaymentGuidelinesData | null;
};

function methodIcon(type: string) {
  if (type === "bank") return Building2;
  if (type === "whatsapp") return MessageCircle;
  return Smartphone;
}

export function PaymentPacksBanner({ data }: PaymentPacksBannerProps) {
  const guidelines = data ?? DEFAULT_PAYMENT_GUIDELINES;
  const packs = guidelines.packs ?? DEFAULT_PAYMENT_GUIDELINES.packs!;
  const methods = guidelines.methods ?? DEFAULT_PAYMENT_GUIDELINES.methods!;

  return (
    <section
      className="payment-packs-banner relative z-20 public-page-offset overflow-hidden border-b border-[#1a3a63] bg-[#254D81] text-white"
      aria-label="Packs et modes de paiement"
    >
      {/* Atmosphere */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#FCC400] via-white to-[#1F8A4C] payment-packs-banner__stripe" />
        <div className="absolute -left-24 top-1/2 h-56 w-56 -translate-y-1/2 rounded-full bg-[#FCC400]/15 blur-3xl payment-packs-banner__glow" />
        <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-[#0070D0]/40 blur-3xl payment-packs-banner__glow-delayed" />
        <div className="absolute inset-0 payment-packs-banner__sheen" />
      </div>

      <div className="container relative mx-auto px-4 py-5 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45 }}
            className="flex items-start gap-3 lg:min-w-[14rem] lg:max-w-[16rem]"
          >
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 shadow-[0_0_20px_rgba(252,196,0,0.25)] payment-packs-banner__icon">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#FCC400]">
                Packs & paiement
              </p>
              <p className="text-sm font-bold leading-tight sm:text-base">F&R RWANDA LTD.</p>
              <p className="text-[11px] italic text-white/75">École de la langue française au Rwanda</p>
            </div>
          </motion.div>

          <div className="grid flex-1 gap-2.5 sm:grid-cols-3">
            {packs.map((pack, index) => (
              <motion.div
                key={pack.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 * index }}
                className={cn(
                  "group relative overflow-hidden rounded-xl px-3.5 py-3 ring-1 transition-transform duration-300 hover:-translate-y-0.5",
                  pack.featured
                    ? "bg-[#FCC400] text-[#0B0B0B] ring-[#FCC400] shadow-[0_8px_24px_rgba(252,196,0,0.35)] payment-packs-banner__featured"
                    : "bg-white/10 ring-white/20 hover:bg-white/15 hover:ring-white/35"
                )}
              >
                {pack.featured ? (
                  <span className="pointer-events-none absolute inset-0 payment-packs-banner__featured-shine" aria-hidden />
                ) : null}
                <p className="relative flex items-center gap-1 text-xs font-bold sm:text-sm">
                  {pack.name}
                  {pack.featured ? (
                    <Star className="h-3.5 w-3.5 fill-current text-[#0B0B0B] payment-packs-banner__star" />
                  ) : null}
                </p>
                <p
                  className={cn(
                    "relative mt-0.5 text-[11px] leading-snug sm:text-xs",
                    pack.featured ? "text-[#0B0B0B]/80" : "text-white/85"
                  )}
                >
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
                  <p
                    className={cn(
                      "relative mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      pack.featured ? "bg-black/10 text-[#0B0B0B]/75" : "bg-white/10 text-white/70"
                    )}
                  >
                    {pack.duration}
                  </p>
                ) : null}
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.2 }}
            className="grid flex-1 gap-2 text-[11px] sm:grid-cols-3 sm:text-xs"
          >
            {methods.map((method) => {
              const Icon = methodIcon(method.type);
              return (
                <div
                  key={method.label}
                  className="flex items-start gap-2 rounded-xl bg-black/20 px-3 py-2.5 ring-1 ring-white/10 transition-colors duration-300 hover:bg-black/30 hover:ring-[#FCC400]/40"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FCC400]/15 text-[#FCC400]">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 leading-snug">
                    <p className="font-semibold">{method.label}</p>
                    {method.account_name ? (
                      <p className="truncate text-white/70">{method.account_name}</p>
                    ) : null}
                    {method.account_number ? (
                      <p className="font-mono font-semibold tracking-wide text-[#FCC400]/95">
                        {method.account_number}
                      </p>
                    ) : null}
                    {method.phone ? (
                      <p className="font-mono font-semibold tracking-wide text-[#FCC400]/95">{method.phone}</p>
                    ) : null}
                    {method.ussd ? <p className="text-white/70">USSD {method.ussd}</p> : null}
                  </div>
                </div>
              );
            })}
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="mt-4 text-center text-[11px] italic text-white/85 sm:text-left"
        >
          {guidelines.note ?? DEFAULT_PAYMENT_GUIDELINES.note}
        </motion.p>
      </div>
    </section>
  );
}

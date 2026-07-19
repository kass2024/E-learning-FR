import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { useLanguage } from "@/context/LanguageContext";

const Pricing = () => {
  const { language } = useLanguage();

  const title = language === "EN" ? "Pricing" : "Tarifs";
  const subtitle =
    language === "EN"
      ? "Choose the level of Zoom support you need from our Canadian experts."
      : "Choisissez le niveau d'accompagnement Zoom dont vous avez besoin auprès de nos experts canadiens.";

  const plans = [
    {
      nameEn: "Discovery Call",
      nameFr: "Appel de découverte",
      price: "$0",
      periodEn: "/session",
      periodFr: "/séance",
      descriptionEn: "Free 20-minute Zoom call to understand your goals and next steps.",
      descriptionFr:
        "Appel Zoom gratuit de 20 minutes pour comprendre vos objectifs et les prochaines étapes.",
      featuresEn: [
        "One free Zoom consultation",
        "High-level assessment of your situation",
        "Recommendation of best training path",
      ],
      featuresFr: [
        "Une consultation Zoom gratuite",
        "Évaluation générale de votre situation",
        "Recommandation du meilleur parcours de formation",
      ],
      ctaEn: "Book Free Call",
      ctaFr: "Réserver l'appel",
      popular: false,
      variant: "outline" as const,
    },
    {
      nameEn: "Core Zoom Program",
      nameFr: "Programme Zoom principal",
      price: "$249",
      periodEn: "/cohort",
      periodFr: "/cohorte",
      descriptionEn: "Structured live Zoom training with Canadian experts.",
      descriptionFr: "Formation structurée en direct sur Zoom avec des experts canadiens.",
      featuresEn: [
        "6–8 live Zoom sessions",
        "Downloadable workbooks & templates",
        "Access to recordings",
        "Email support during the cohort",
      ],
      featuresFr: [
        "6 à 8 séances Zoom en direct",
        "Cahiers d'exercices et modèles téléchargeables",
        "Accès aux enregistrements",
        "Support par e-mail pendant la cohorte",
      ],
      ctaEn: "Join Core Program",
      ctaFr: "Rejoindre le programme",
      popular: true,
      variant: "default" as const,
    },
    {
      nameEn: "Premium 1:1 Mentoring",
      nameFr: "Mentorat individuel Premium",
      price: "$599",
      periodEn: "/package",
      periodFr: "/forfait",
      descriptionEn: "Personalised Zoom mentoring and priority access to Canadian experts.",
      descriptionFr:
        "Mentorat Zoom personnalisé et accès prioritaire à des experts canadiens.",
      featuresEn: [
        "5 private Zoom sessions",
        "Review of documents or plans",
        "Priority WhatsApp / email support",
        "Custom action plan tailored to you",
      ],
      featuresFr: [
        "5 séances Zoom privées",
        "Relecture de documents ou de plans",
        "Support prioritaire WhatsApp / e-mail",
        "Plan d'action personnalisé pour vous",
      ],
      ctaEn: "Apply for Mentoring",
      ctaFr: "Demander le mentorat",
      popular: false,
      variant: "hero" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="public-page-offset pb-20 px-4 bg-[#020617]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">{title}</h1>
            <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">{subtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => {
              const name = language === "EN" ? plan.nameEn : plan.nameFr;
              const period = language === "EN" ? plan.periodEn : plan.periodFr;
              const description =
                language === "EN" ? plan.descriptionEn : plan.descriptionFr;
              const features = language === "EN" ? plan.featuresEn : plan.featuresFr;
              const cta = language === "EN" ? plan.ctaEn : plan.ctaFr;

              return (
                <Card
                  key={name}
                  className={`relative ${
                    plan.popular
                      ? "border-[#FFC72C] shadow-[0_32px_80px_rgba(0,0,0,0.9)] scale-105 bg-white/8"
                      : "border-white/10 bg-white/5"
                  } text-white`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-[#FFC72C] text-[#020617] px-4 py-1">
                        {language === "EN" ? "Most Popular" : "Le plus populaire"}
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl text-white">{name}</CardTitle>
                    <CardDescription className="text-white/70">{description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      <span className="text-white/60">{period}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3 mb-6">
                      {features.map((feature) => (
                        <li key={feature} className="text-sm text-white/70">
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <NavLink to="/signup">
                      <Button
                        variant={plan.variant}
                        size="lg"
                        className={`w-full font-semibold rounded-full ${
                          plan.popular
                            ? "bg-[#FFC72C] hover:bg-[#ffb600] text-[#020617]"
                            : "bg-transparent border border-white/40 text-white hover:bg-white/10"
                        }`}
                      >
                        {cta}
                      </Button>
                    </NavLink>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Pricing;

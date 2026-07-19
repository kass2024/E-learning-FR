import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="public-page-offset pb-20 px-4 bg-gradient-to-b from-[#EAF7F0] via-white to-white border-b border-slate-200">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
            <div>
              <Badge className="mb-4 bg-[#1F8A4C]/20 text-[#1F8A4C] border border-[#1F8A4C]/40">
                About us
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#0B0B0B]">
                About F&R Rwanda Ltd
              </h1>
              <p className="text-lg md:text-xl text-[#0B0B0B]/75 mb-6 max-w-xl">
                School of Fluency and Proficiency — a dedicated language school for English, French, and Kinyarwanda.
              </p>
              <p className="text-sm md:text-base text-[#0B0B0B]/70 max-w-xl">
                Interactive online classes with experienced instructors, flexible schedules, and personalized feedback
                so you can learn today, master tomorrow, and succeed globally.
              </p>
            </div>

            <div className="relative">
              <div
                className="absolute -inset-6 bg-gradient-to-tr from-[#1F8A4C]/30 via-[#1F8A4C]/10 to-transparent blur-3xl"
                aria-hidden="true"
              />
              <div className="relative rounded-3xl overflow-hidden shadow-[0_24px_60px_rgba(11,11,11,0.18)] bg-slate-900/5 border border-slate-200">
                <img
                  src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&auto=format&fit=crop&q=80"
                  alt="Students attending an online language session"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="border border-[#1A8AD8]/15 bg-white shadow-sm hover:shadow-lg hover:border-[#1F8A4C]/60 transition-all rounded-2xl">
              <CardHeader>
                <CardTitle className="text-slate-900">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-slate-700">
                  We help serious learners access clear, structured guidance through live online programs. Every cohort is designed
                  to answer real questions and provide practical next steps.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-[#1A8AD8]/15 bg-white shadow-sm hover:shadow-lg hover:border-[#1F8A4C]/60 transition-all rounded-2xl">
              <CardHeader>
                <CardTitle className="text-slate-900">Who We Train</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-slate-700">
                  Professionals, students and families planning their next step: studies, career transitions and practical skills.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-[#1A8AD8]/15 bg-white shadow-sm hover:shadow-lg hover:border-[#1F8A4C]/60 transition-all rounded-2xl">
              <CardHeader>
                <CardTitle className="text-slate-900">How We Work</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-slate-700">
                  Small cohorts, focused agendas, recordings you can review, and optional 1:1 mentoring for complex cases.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border border-[#1A8AD8]/15 bg-white shadow-sm hover:shadow-lg hover:border-[#1F8A4C]/60 transition-all rounded-2xl">
              <CardHeader>
                <CardTitle className="text-slate-900">Built for Global Learners</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-slate-700">
                  Learn from anywhere with a clear, step-by-step approach built around real outcomes and practical support.
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ShieldX, Home } from "lucide-react";
import { verifyCertificate, type VerifiedCertificate } from "@/api/axios";
import ParrotLogo from "@/components/ParrotLogo";
import { HUB } from "@/lib/hubConfig";

const CertificateVerify = () => {
  const { courseId, studentId } = useParams<{ courseId: string; studentId: string }>();
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [certificate, setCertificate] = useState<VerifiedCertificate | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cId = Number(courseId);
    const sId = Number(studentId);
    if (!cId || !sId || Number.isNaN(cId) || Number.isNaN(sId)) {
      setLoading(false);
      setError("Invalid verification link.");
      return;
    }

    verifyCertificate(cId, sId)
      .then((res) => {
        setValid(res.valid);
        setCertificate(res.certificate ?? null);
        if (!res.valid) setError(res.message ?? "Certificate could not be verified.");
      })
      .catch((err: any) => {
        setValid(false);
        setError(err?.response?.data?.message ?? "Certificate could not be verified.");
      })
      .finally(() => setLoading(false));
  }, [courseId, studentId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-background dark:to-muted/30">
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold text-lg">
            <ParrotLogo size="sm" alt={HUB.company} />
            {HUB.company}
          </Link>
          <p className="text-sm text-muted-foreground mt-1">Certificate verification portal</p>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-16 flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Verifying certificate...</p>
            </CardContent>
          </Card>
        ) : valid && certificate ? (
          <Card className="border-emerald-200 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-[#1A8AD8] to-[#0058A8] px-6 py-8 text-center text-white">
              <div className="flex justify-center mb-3">
                <ParrotLogo size="lg" showRing={false} className="ring-2 ring-white/30" />
              </div>
              <CardTitle className="text-2xl text-white">Certificate verified</CardTitle>
              <CardDescription className="text-white/80 mt-1">
                This is an authentic F&R Rwanda Ltd completion certificate.
              </CardDescription>
            </div>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-center">
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-sm px-4 py-1">Valid & authentic</Badge>
              </div>
              <div className="grid gap-3 text-sm rounded-xl border border-border bg-muted/30 p-5">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Learner</span>
                  <span className="font-semibold text-right">{certificate.student_name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-semibold text-right">{certificate.course_title}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Certificate ID</span>
                  <span className="font-mono text-xs font-semibold">{certificate.certificate_id}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Issued</span>
                  <span className="font-medium">
                    {certificate.issued_at
                      ? new Date(certificate.issued_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Issuer</span>
                  <span className="font-medium">{certificate.issuer}</span>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  Back to homepage
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-red-200">
            <CardHeader className="text-center">
              <ShieldX className="h-14 w-14 text-red-500 mx-auto mb-2" />
              <CardTitle className="text-red-700">Verification failed</CardTitle>
              <CardDescription>{error ?? "This certificate could not be verified."}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/">Return home</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CertificateVerify;

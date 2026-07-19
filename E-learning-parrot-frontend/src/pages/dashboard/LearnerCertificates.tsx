import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Download, QrCode, ArrowLeft, ExternalLink } from "lucide-react";
import ParrotLogo from "@/components/ParrotLogo";
import { useToast } from "@/components/ui/use-toast";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { buildVerifyPath, buildVerifyUrl, downloadCertificatePdf } from "@/lib/certificatePdf";
import { useLearnerDashboardData } from "@/hooks/useLearnerDashboardData";
import { resolveLearnerStudentId } from "@/lib/dashboardUser";

const LearnerCertificates = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data, loading } = useLearnerDashboardData();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const certificates = data?.certificates ?? [];

  const handleDownload = async (cert: (typeof certificates)[number]) => {
    if (!cert.certificate_id || !cert.course_id) return;

    const studentId = cert.student_id ?? Number(localStorage.getItem("parrot_student_id"));
    if (!studentId) {
      toast({ variant: "destructive", title: "Error", description: "Student session not found." });
      return;
    }

    setDownloadingId(cert.certificate_id);
    try {
      await downloadCertificatePdf({
        certificateId: cert.certificate_id,
        studentName: cert.student_name ?? "Learner",
        courseTitle: cert.course_title ?? "Course",
        issuedAt: cert.issued_at ?? new Date().toISOString(),
        verifyUrl: cert.verify_url ?? buildVerifyUrl(cert.course_id, studentId),
      });
      toast({ title: "Certificate downloaded", description: "Your PDF includes a QR code for online verification." });
    } catch {
      toast({ variant: "destructive", title: "Download failed", description: "Could not generate the certificate PDF." });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Learner"
        title="Digital Certificates"
        description="Download verified certificates with QR code verification for completed courses."
      >
        <Button variant="outline" onClick={() => navigate("/dashboard/learner")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </AdminPageHeader>

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : certificates.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <ParrotLogo size="xl" className="mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No certificates yet. Complete and pay for a course to earn your digital certificate.
            </p>
            <Button onClick={() => navigate("/dashboard/learner")}>Browse courses</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {certificates.map((cert) => {
            const studentId = cert.student_id ?? Number(localStorage.getItem("parrot_student_id"));
            const verifyPath =
              cert.course_id && studentId ? buildVerifyPath(cert.course_id, studentId) : cert.verify_url ?? "#";

            return (
              <Card key={cert.certificate_id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{cert.course_title}</CardTitle>
                      <CardDescription>{cert.certificate_id}</CardDescription>
                    </div>
                    <Badge>Verified</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 rounded-lg border border-dashed border-border p-4 bg-muted/30">
                    <QrCode className="h-16 w-16 text-primary shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium">QR verification</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Scan to verify authenticity at F&R Rwanda Ltd.
                      </p>
                      {cert.course_id && studentId ? (
                        <Link
                          to={verifyPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary underline mt-1 inline-flex items-center gap-1 hover:text-primary/80"
                        >
                          Verify online
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Issued: {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : "—"}
                  </p>
                  <Button
                    className="w-full"
                    variant="outline"
                    disabled={downloadingId === cert.certificate_id}
                    onClick={() => handleDownload(cert)}
                  >
                    {downloadingId === cert.certificate_id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download certificate
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearnerCertificates;

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { confirmPaymentCheckout } from "@/api/axios";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    localStorage.removeItem("parrot_selected_course_id");

    if (sessionId) {
      setConfirming(true);
      confirmPaymentCheckout(sessionId)
        .then(() => setConfirmed(true))
        .catch(() => setConfirmed(false))
        .finally(() => setConfirming(false));
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-2" />
          <CardTitle className="text-2xl">Payment successful</CardTitle>
          <CardDescription>
            Your Stripe payment was processed. Your course enrollment will be activated shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {sessionId && (
            <p className="text-xs text-muted-foreground break-all">Reference: {sessionId}</p>
          )}
          <Button className="w-full" onClick={() => navigate("/dashboard/learner")}>
            Go to dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard/my-courses")}>
            View my courses
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;

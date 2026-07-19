import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle, ArrowLeft } from "lucide-react";

const PaymentCancel = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <XCircle className="h-16 w-16 text-amber-600 mx-auto mb-2" />
          <CardTitle className="text-2xl">Payment cancelled</CardTitle>
          <CardDescription>
            Your Stripe checkout was cancelled. No charge was made. You can try again anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full" onClick={() => navigate("/dashboard/learner/payment")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to payment
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard/learner")}>
            Back to dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;

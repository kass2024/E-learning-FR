import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { completeInstitutionSignupPayment } from "@/api/axios";
import { CheckCircle2, Loader2, Mail } from "lucide-react";

const InstitutionSignupSuccess = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Confirming payment...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const sessionId = params.get("session_id");
    const promoSignup = params.get("promo") === "1";

    if (promoSignup && !sessionId) {
      setMessage("Registration submitted. Login credentials have been emailed to you. Pending admin approval.");
      setDone(true);
      return;
    }

    if (!sessionId) {
      setMessage("Missing payment session.");
      return;
    }
    completeInstitutionSignupPayment(sessionId)
      .then((res) => {
        setMessage(res.message || "Payment received. Pending admin approval.");
        setDone(true);
      })
      .catch(() => setMessage("Could not confirm payment. Contact support if you were charged."));
  }, [params]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <main className="container max-w-lg public-page-offset pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border bg-white shadow-xl overflow-hidden"
        >
          <div className="bg-gradient-to-r from-[#0070D0] to-[#0058A8] px-6 py-8 text-center text-white">
            {done ? (
              <CheckCircle2 className="h-14 w-14 mx-auto text-emerald-300" />
            ) : (
              <Loader2 className="h-14 w-14 mx-auto animate-spin" />
            )}
            <h1 className="text-xl font-bold mt-4">Institution registration</h1>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-muted-foreground text-center">{message}</p>
            {done && (
              <div className="rounded-xl bg-[#0070D0]/5 border border-[#0070D0]/15 p-4 flex gap-3 text-sm">
                <Mail className="h-5 w-5 text-[#0070D0] shrink-0" />
                <p>Your login credentials were emailed when you registered. You can sign in once admin approves your institution.</p>
              </div>
            )}
            {done && (
              <Button className="w-full rounded-xl bg-[#0070D0] hover:bg-[#0058A8]" onClick={() => navigate("/login")}>
                Go to login
              </Button>
            )}
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
};

export default InstitutionSignupSuccess;

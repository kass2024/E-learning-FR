import { useEffect, useState } from "react";
import { Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import {
  getPaymentReceiverSettings,
  updatePaymentReceiverSettings,
} from "@/api/axios";

/**
 * MoMo number that receives learner course payments (shown on Pay & Enroll + MoPay transfer).
 */
export default function PaymentReceiverSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getPaymentReceiverSettings();
        if (cancelled) return;
        setPhone(data.momo_receiver_phone || data.display_momo_phone || "");
        setName(data.momo_receiver_name || "");
        setWhatsapp(data.momo_whatsapp_phone || data.display_whatsapp_phone || "");
      } catch {
        if (!cancelled) {
          toast({
            variant: "destructive",
            title: "Could not load payment settings",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleSave = async () => {
    if (!phone.trim()) {
      toast({ variant: "destructive", title: "Enter a Mobile Money number" });
      return;
    }
    setSaving(true);
    try {
      const data = await updatePaymentReceiverSettings({
        momo_receiver_phone: phone.trim(),
        momo_receiver_name: name.trim() || undefined,
        momo_whatsapp_phone: whatsapp.trim() || undefined,
      });
      setPhone(data.momo_receiver_phone || data.display_momo_phone || phone);
      setName(data.momo_receiver_name || name);
      setWhatsapp(data.momo_whatsapp_phone || data.display_whatsapp_phone || whatsapp);
      toast({
        title: "Saved",
        description: `Learners will see ${data.display_momo_phone || phone} as the receive number on Pay & Enroll.`,
      });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast({
        variant: "destructive",
        title: "Could not save",
        description: err?.response?.data?.message ?? "Failed to update MoMo number.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading payment settings…
      </div>
    );
  }

  return (
    <Card className="border border-[#0070D0]/15 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#0070D0]">
          <Smartphone className="h-5 w-5" />
          Mobile Money receive number
        </CardTitle>
        <CardDescription>
          This is the MTN/Airtel number that receives course payments. It appears under Modes de paiement on Pay &
          Enroll, and MoPay transfers money to this number.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="momo-receiver-phone">MoMo number (receive payments)</Label>
            <Input
              id="momo-receiver-phone"
              className="font-mono h-11"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0788 821 579"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="momo-receiver-name">Account name</Label>
            <Input
              id="momo-receiver-name"
              className="h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kalisa Valens"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="momo-whatsapp">WhatsApp confirmation (optional)</Label>
            <Input
              id="momo-whatsapp"
              className="font-mono h-11"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+250 788 821 579"
            />
          </div>
        </div>
        <Button
          onClick={() => void handleSave()}
          disabled={saving || !phone.trim()}
          className="bg-[#0070D0] hover:bg-[#1A8AD8]"
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save MoMo number
        </Button>
      </CardContent>
    </Card>
  );
}

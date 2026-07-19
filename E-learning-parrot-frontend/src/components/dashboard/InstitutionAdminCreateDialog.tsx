import { FormEvent, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { createPlatformInstitution } from "@/api/axios";
import { Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export default function InstitutionAdminCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [password, setPassword] = useState("");
  const [autoApprove, setAutoApprove] = useState(true);
  const [sendCredentials, setSendCredentials] = useState(true);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);

  const reset = () => {
    setName("");
    setContactEmail("");
    setContactPhone("");
    setWebsite("");
    setAddress("");
    setOwnerName("");
    setAdminNotes("");
    setPassword("");
    setAutoApprove(true);
    setSendCredentials(true);
    setCreatedPassword(null);
    setLoginUrl(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contactEmail.trim()) {
      toast({ variant: "destructive", title: "Name and login email are required" });
      return;
    }
    setSaving(true);
    try {
      const res = await createPlatformInstitution({
        name: name.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        admin_notes: adminNotes.trim() || undefined,
        owner_name: ownerName.trim() || undefined,
        password: password.trim() || undefined,
        auto_approve: autoApprove,
        send_credentials: sendCredentials,
      });
      setCreatedPassword(res.password ?? null);
      setLoginUrl(res.login_url ?? null);
      toast({ title: "Institution created", description: res.message });
      onCreated();
      if (!res.password && !res.login_url) {
        handleOpenChange(false);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast({ variant: "destructive", title: "Create failed", description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Create partner institution</DialogTitle>
          <DialogDescription>
            Creates the institution and partner login on the main platform. Meeting provider follows Settings → Live meetings.
          </DialogDescription>
        </DialogHeader>

        {createdPassword || loginUrl ? (
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-2">
              <p className="font-medium">Institution ready</p>
              {loginUrl ? (
                <p>
                  Login URL: <span className="font-mono text-xs break-all">{loginUrl}</span>
                </p>
              ) : null}
              {createdPassword ? (
                <p>
                  Temporary password: <span className="font-mono font-semibold">{createdPassword}</span>
                </p>
              ) : null}
              {sendCredentials ? (
                <p className="text-xs">Credentials were also emailed to {contactEmail.trim()}.</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <Label>Institution name</Label>
              <Input className="rounded-xl mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Login email</Label>
                <Input
                  type="email"
                  className="rounded-xl mt-1"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="rounded-xl mt-1" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Owner display name</Label>
              <Input
                className="rounded-xl mt-1"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Defaults to “{name} Admin”"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Website</Label>
                <Input className="rounded-xl mt-1" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div>
                <Label>Address</Label>
                <Input className="rounded-xl mt-1" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Admin notes (internal)</Label>
              <Input className="rounded-xl mt-1" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            </div>
            <div>
              <Label>Initial password</Label>
              <Input
                type="text"
                className="rounded-xl mt-1 font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to auto-generate"
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Activate immediately</p>
                <p className="text-xs text-muted-foreground">Skip pending approval</p>
              </div>
              <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-3">
              <div>
                <p className="text-sm font-medium">Email credentials</p>
                <p className="text-xs text-muted-foreground">Send welcome email with login details</p>
              </div>
              <Switch checked={sendCredentials} onCheckedChange={setSendCredentials} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#0070D0] hover:bg-[#1A8AD8]">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create institution
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

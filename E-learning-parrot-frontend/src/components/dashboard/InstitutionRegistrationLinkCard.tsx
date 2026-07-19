import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { useToast } from "@/components/ui/use-toast";

import {

  buildInstitutionLearnerLoginUrl,

  buildInstitutionLearnerSignupUrl,

  buildInstitutionPortalUrl,

} from "@/lib/institutionSignupLink";

import { Check, Copy, Globe2, Link2, LogIn } from "lucide-react";



type Props = {

  slug: string;

  institutionName?: string;

  className?: string;

  compact?: boolean;

};



const InstitutionRegistrationLinkCard = ({ slug, institutionName, className, compact = false }: Props) => {

  const { toast } = useToast();

  const [copiedPortal, setCopiedPortal] = useState(false);

  const [copiedSignup, setCopiedSignup] = useState(false);

  const [copiedLogin, setCopiedLogin] = useState(false);

  const portalUrl = slug ? buildInstitutionPortalUrl(slug) : "";

  const signupUrl = slug ? buildInstitutionLearnerSignupUrl(slug) : "";

  const loginUrl = slug ? buildInstitutionLearnerLoginUrl(slug) : "";



  const copyText = async (text: string, label: string, setCopied: (v: boolean) => void) => {

    if (!text) return;

    try {

      await navigator.clipboard.writeText(text);

      setCopied(true);

      toast({ title: `${label} copied` });

      window.setTimeout(() => setCopied(false), 2000);

    } catch {

      toast({ variant: "destructive", title: "Could not copy link" });

    }

  };



  if (!slug) return null;



  if (compact) {

    return (

      <div className={className}>

        <p className="text-xs font-medium text-muted-foreground mb-1.5">Institution website</p>

        <div className="mb-3 flex gap-2">

          <Input readOnly value={portalUrl} className="h-9 font-mono text-xs" />

          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => void copyText(portalUrl, "Website link", setCopiedPortal)}>

            {copiedPortal ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}

          </Button>

        </div>

        <p className="text-xs font-medium text-muted-foreground mb-1.5">Registration link</p>

        <div className="mb-3 flex gap-2">

          <Input readOnly value={signupUrl} className="h-9 font-mono text-xs" />

          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => void copyText(signupUrl, "Signup link", setCopiedSignup)}>

            {copiedSignup ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}

          </Button>

        </div>

        <p className="text-xs font-medium text-muted-foreground mb-1.5">Login link</p>

        <div className="flex gap-2">

          <Input readOnly value={loginUrl} className="h-9 font-mono text-xs" />

          <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => void copyText(loginUrl, "Login link", setCopiedLogin)}>

            {copiedLogin ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}

          </Button>

        </div>

      </div>

    );

  }



  return (

    <Card className={className}>

      <CardHeader className="pb-3">

        <CardTitle className="flex items-center gap-2 text-lg">

          <Link2 className="h-5 w-5" />

          Institution portal links

        </CardTitle>

        <CardDescription>

          Share your auto-generated institution website and direct enrollment links with learners at

          {institutionName ? ` ${institutionName}` : " your institution"}.

        </CardDescription>

      </CardHeader>

      <CardContent className="space-y-4">

        <div>

          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Institution website (main link)</p>

          <div className="flex flex-col gap-2 sm:flex-row">

            <Input readOnly value={portalUrl} className="font-mono text-xs sm:text-sm" />

            <Button type="button" className="shrink-0" onClick={() => void copyText(portalUrl, "Website link", setCopiedPortal)}>

              {copiedPortal ? (

                <>

                  <Check className="mr-2 h-4 w-4" />

                  Copied

                </>

              ) : (

                <>

                  <Globe2 className="mr-2 h-4 w-4" />

                  Copy website

                </>

              )}

            </Button>

          </div>

        </div>

        <div>

          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Registration link</p>

          <div className="flex flex-col gap-2 sm:flex-row">

            <Input readOnly value={signupUrl} className="font-mono text-xs sm:text-sm" />

            <Button type="button" variant="outline" className="shrink-0" onClick={() => void copyText(signupUrl, "Signup link", setCopiedSignup)}>

              {copiedSignup ? (

                <>

                  <Check className="mr-2 h-4 w-4" />

                  Copied

                </>

              ) : (

                <>

                  <Copy className="mr-2 h-4 w-4" />

                  Copy signup

                </>

              )}

            </Button>

          </div>

        </div>

        <div>

          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Login link</p>

          <div className="flex flex-col gap-2 sm:flex-row">

            <Input readOnly value={loginUrl} className="font-mono text-xs sm:text-sm" />

            <Button type="button" variant="outline" className="shrink-0" onClick={() => void copyText(loginUrl, "Login link", setCopiedLogin)}>

              {copiedLogin ? (

                <>

                  <Check className="mr-2 h-4 w-4" />

                  Copied

                </>

              ) : (

                <>

                  <LogIn className="mr-2 h-4 w-4" />

                  Copy login

                </>

              )}

            </Button>

          </div>

        </div>

      </CardContent>

    </Card>

  );

};



export default InstitutionRegistrationLinkCard;



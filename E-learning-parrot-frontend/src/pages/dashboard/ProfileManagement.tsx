import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LockKeyhole, UserRound } from "lucide-react";
import UserProfile from "./UserProfile";
import PasswordChange from "./PasswordChange";
import { ProfileAvatarCard } from "@/components/dashboard/ProfileAvatarCard";

/**
 * Personal profile hub for every dashboard role (learner, instructor, admin, …).
 * Opened from the top-right avatar menu — not the sidebar Settings item.
 */
const ProfileManagement = () => {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <UserRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">My profile</h1>
            <p className="text-sm text-muted-foreground">
              Update your photo, display name, email, and password.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Photo</Badge>
          <Badge variant="secondary">Profile</Badge>
          <Badge variant="secondary">Security</Badge>
        </div>
      </div>

      <Card className="border-0 bg-white shadow-xl rounded-2xl overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-r from-slate-50 to-white">
          <CardTitle className="text-xl">Profile management</CardTitle>
          <CardDescription>Changes apply to your signed-in account across the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <ProfileAvatarCard />

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/40">
              <TabsTrigger value="profile" className="gap-2">
                <UserRound className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="password" className="gap-2">
                <LockKeyhole className="h-4 w-4" />
                Password
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-0">
              <UserProfile />
            </TabsContent>
            <TabsContent value="password" className="mt-0">
              <PasswordChange />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileManagement;

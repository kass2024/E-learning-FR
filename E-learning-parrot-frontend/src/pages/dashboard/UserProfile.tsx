import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { API_URLS } from "@/config/api";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  currentPassword: z.string().min(1, "Current password is required"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const UserProfile = () => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: localStorage.getItem("parrot_user_name") || "",
      email: localStorage.getItem("parrot_user_email") || "",
      currentPassword: "",
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const role = localStorage.getItem("parrot_user_role") || "";
      const email = localStorage.getItem("parrot_user_email") || data.email;
      if (!role || !email) {
        throw new Error("Missing login information. Please log in again.");
      }

      const response = await fetch(API_URLS.profile, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          role,
          email,
          name: data.name,
          new_email: data.email,
          current_password: data.currentPassword,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to update profile");
      }

      // Update local storage
      localStorage.setItem("parrot_user_name", data.name);
      localStorage.setItem("parrot_user_email", data.email);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      console.error("Profile update error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile. Please try again.";
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Update your display name and email. You will be asked for your current password to confirm changes.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" {...register("name")} className={errors.name ? "border-red-500" : ""} />
            {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              className={errors.email ? "border-red-500" : ""}
            />
            {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div className="space-y-2 max-w-md">
          <Label htmlFor="currentPassword">Current Password</Label>
          <Input
            id="currentPassword"
            type="password"
            {...register("currentPassword")}
            className={errors.currentPassword ? "border-red-500" : ""}
          />
          {errors.currentPassword && (
            <p className="text-sm text-red-500 mt-1">{errors.currentPassword.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="rounded-full">
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { API_URLS } from "@/config/api";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

const PasswordChange = () => {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onSubmit = async (data: PasswordFormValues) => {
    try {
      const role = localStorage.getItem("parrot_user_role") || "";
      const email = localStorage.getItem("parrot_user_email") || "";
      if (!role || !email) {
        throw new Error("Missing login information. Please log in again.");
      }

      const response = await fetch(API_URLS.changePassword, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          role,
          email,
          current_password: data.currentPassword,
          new_password: data.newPassword,
          new_password_confirmation: data.confirmPassword,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          responseData.message ||
          responseData.error ||
          `Error: ${response.status} - ${response.statusText}`
        );
      }

      reset();
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    } catch (error) {
      console.error("Password change error:", error);
      let errorMessage = "Failed to update password. ";
      
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes("current_password")) {
          errorMessage = "The current password is incorrect.";
        } else if (error.message.toLowerCase().includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage += error.message;
        }
      } else {
        errorMessage += "Please try again later.";
      }

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
        <h2 className="text-lg font-semibold text-slate-900">Password</h2>
        <p className="text-sm text-muted-foreground">
          Choose a strong password to keep your account secure.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2 max-w-md">
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

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              {...register("newPassword")}
              className={errors.newPassword ? "border-red-500" : ""}
            />
            {errors.newPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              className={errors.confirmPassword ? "border-red-500" : ""}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="rounded-full">
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </span>
            ) : (
              "Update Password"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PasswordChange;

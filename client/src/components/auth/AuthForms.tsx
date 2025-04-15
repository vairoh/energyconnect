import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLogin, useRegister } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { message: "Full name must be at least 2 characters" }),
    username: z
      .string()
      .min(3, { message: "Username must be at least 3 characters" })
      .max(20, { message: "Username cannot exceed 20 characters" })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Username can only contain letters, numbers and underscores",
      }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    inviteCode: z.string().min(4, { message: "Invite code is required" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

interface AuthFormsProps {
  initialMode: "login" | "register";
  onSuccess?: () => void;
  onModeChange?: (mode: "login" | "register") => void;
}

export function AuthForms({
  initialMode,
  onSuccess,
  onModeChange,
}: AuthFormsProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">(initialMode);
  const [inviteVerified, setInviteVerified] = useState(false);
  const [enteredInviteCode, setEnteredInviteCode] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);




  const { toast } = useToast();

  const login = useLogin();
  const register = useRegister();

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    loginForm.reset();
    registerForm.reset();
    setOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setForgotEmail("");
    setOtpSent(false);
    setInviteVerified(false);
    setEnteredInviteCode("");
    if (onModeChange) onModeChange(newMode);
  };
  

  const onLoginSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => {
        toast({
          title: "Logged in successfully",
          description: "Welcome back!",
        });
        if (onSuccess) onSuccess();
      },
      onError: (error: any) => {
        toast({
          title: "Login failed",
          description: error.message || "Invalid credentials",
          variant: "destructive",
        });
      },
    });
  };

  const onRegisterSubmit = async (values: RegisterFormValues) => {
    const { confirmPassword, inviteCode, ...registerData } = values;

    try {
      const res = await fetch("/api/invite/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast({
          title: "Invalid invite code",
          description:
            data.message || "The invite code is incorrect or already used",
          variant: "destructive",
        });
        return;
      }

      register.mutate(registerData, {
        onSuccess: async () => {
          try {
            await fetch("/api/invite/mark-used", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ code: inviteCode }),
            });

            toast({
              title: "Registration successful",
              description: "Your account has been created",
            });
            setRegisterSuccess(true);
          } catch (err) {
            toast({
              title: "Registration succeeded, but invite tracking failed",
              description: "We'll look into it, no action needed from your side.",
            });
          }

          if (onSuccess) onSuccess();
        },

        onError: (error: any) => {
          toast({
            title: "Registration failed",
            description: error.message || "Could not create account",
            variant: "destructive",
          });
        },
      });
    } catch (error) {
      toast({
        title: "Invite code check failed",
        description: "Something went wrong while validating invite code.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 py-2 pb-4">
      {mode === "login" ? (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Log in to EnergyPro
            </h2>
          </div>

          <Form {...loginForm}>
            <form
              onSubmit={loginForm.handleSubmit(onLoginSubmit)}
              className="space-y-4"
            >
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <div className="flex justify-end mt-1">
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0"
                      onClick={() => setMode("forgot")}
                    >
                      Forgot password?
                    </Button>

                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={login.isPending}
              >
                {login.isPending ? "Logging in..." : "Log in"}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => switchMode("register")}
              >
                Sign up
              </Button>
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Create an Account
            </h2>
          </div>

          {registerSuccess ? (
            <div className="text-center space-y-4">
              <h2 className="text-lg font-semibold text-green-700">
                🎉 Registration Successful!
              </h2>
              <p className="text-sm text-gray-600">
                You can now log in with your account.
              </p>
              <Button onClick={() => switchMode("login")} className="w-full">
                Go to Login
              </Button>
            </div>
          ) : (
            <Form {...registerForm}>
              <form
                onSubmit={
                  inviteVerified
                    ? registerForm.handleSubmit(onRegisterSubmit)
                    : async (e) => {
                        e.preventDefault();
                        try {
                          const res = await fetch("/api/invite/validate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ code: enteredInviteCode }),
                          });

                          if (!res.ok) {
                            const data = await res.json();
                            toast({
                              title: "Invalid invite code",
                              description:
                                data.message ||
                                "The invite code is incorrect or already used",
                              variant: "destructive",
                            });
                            return;
                          }

                          toast({
                            title: "Invite code accepted",
                            description: "You can now create your account.",
                          });

                          setInviteVerified(true);
                          registerForm.setValue("inviteCode", enteredInviteCode);
                        } catch (err) {
                          toast({
                            title: "Error",
                            description:
                              "Something went wrong while checking the invite code.",
                            variant: "destructive",
                          });
                        }
                      }
                }
                className="space-y-4"
              >
                {/* your inviteCode + fullName + username + etc stays unchanged here */}
                {!inviteVerified ? (
                  <>
                    <FormField
                      control={registerForm.control}
                      name="inviteCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Invite Code</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your invite code"
                              {...field}
                              value={enteredInviteCode}
                              onChange={(e) => {
                                field.onChange(e);
                                setEnteredInviteCode(e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Continue
                    </Button>
                  </>
                ) : (
                  <>
                    {/* fullName, username, email, password, confirmPassword fields go here (unchanged) */}
                    <FormField
                      control={registerForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="johndoe" {...field} />
                          </FormControl>
                          <FormDescription>This will be your unique identifier</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email address</FormLabel>
                          <FormControl>
                            <Input placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormDescription>Must be at least 8 characters</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={register.isPending}
                    >
                      {register.isPending ? "Creating account..." : "Sign up"}
                    </Button>
                  </>
                )}
              </form>
            </Form>
          )}

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => switchMode("login")}
              >
                Log in
              </Button>
            </p>
          </div>
        </>
      )}
      {mode === "forgot" && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Reset your Password
            </h2>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setResetting(true);
            
              try {
                const endpoint =
                  otp && newPassword && confirmNewPassword
                    ? "/api/auth/reset-password"
                    : "/api/auth/request-reset";
          
                const body =
                  otp && newPassword && confirmNewPassword
                    ? { email: forgotEmail, otp, newPassword, confirmNewPassword }
                    : { email: forgotEmail };
          
                const res = await fetch(endpoint, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
            
                const data = await res.json();
            
                if (!res.ok || !data.success) {
                  toast({
                    title: "Email not found",
                    description: data.message || "This email is not registered.",
                    variant: "destructive",
                  });
                  return;
                }
            
                if (otp && newPassword && confirmNewPassword) {
                  toast({
                    title: "Password reset successful",
                    description: "You can now log in with your new password.",
                  });
                  setMode("login");
                  setOtpSent(false);
                  setOtp("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setForgotEmail("");
                } else {
                  toast({
                    title: "OTP sent",
                    description: "Check your email for the verification code.",
                  });
                  setOtpSent(true);
                }
          
                // Optionally: setOtpSent(true);
              } catch (err) {
                toast({
                  title: "Request failed",
                  description: "Something went wrong. Please try again.",
                  variant: "destructive",
                });
              }
              setResetting(false);
            }}
            className="space-y-4"
          >
            <div>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </FormControl>
            </div>

            {otpSent && (
              <div>
                <FormLabel>OTP Code</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Enter the OTP sent to your email"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </FormControl>
                {otp && (
                  <>
                    <div>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </FormControl>
                    </div>
                    <div>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Re-enter new password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                        />
                      </FormControl>
                    </div>
                  </>
                )}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={resetting}>
              {resetting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                "Send OTP"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Back to{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => setMode("login")}>
                Log in
              </Button>
            </p>
          </div>
        </>
      )}
    </div>
  );
}

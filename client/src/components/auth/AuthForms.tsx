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
  const [mode, setMode] = useState<"login" | "register">(initialMode);
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
                      <Button variant="link" size="sm" className="h-auto p-0">
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

          <Form {...registerForm}>
            <form
              onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
              className="space-y-4"
            >
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
                    <FormDescription>
                      This will be your unique identifier
                    </FormDescription>
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Must be at least 8 characters
                    </FormDescription>
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
                      <Input
                        type="password"
                        placeholder="••••••••"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={registerForm.control}
                name="inviteCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invite Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your invite code" {...field} />
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
            </form>
          </Form>

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
    </div>
  );
}

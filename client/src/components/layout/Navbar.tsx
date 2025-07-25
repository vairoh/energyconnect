import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCurrentUser, useLogout } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AuthForms } from "@/components/auth/AuthForms";
import { NewPostDropdown } from "@/components/post/NewPostDropdown";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";

export function Navbar() {
  const [location] = useLocation();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authOpen, setAuthOpen] = useState(false);

  const { data: user, isLoading: userLoading } = useCurrentUser();
  const logout = useLogout();

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        window.location.reload(); // Force reload to ensure clean state
      },
      onError: (err) => {
        console.error("Logout failed:", err);
        window.location.href = "/"; // Fallback redirect
      },
    });
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center">
              <svg
                className="h-8 w-8 text-primary"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v18M5.25 6.75L18.75 6.75" />
                <path d="M5.25 11.25L18.75 11.25" />
                <path d="M5.25 15.75L18.75 15.75" />
              </svg>
              <span className="ml-2 text-xl font-bold text-primary">
                EnergyPro
              </span>
            </Link>
          </div>
          <div className="flex items-center">
            {userLoading ? (
              <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <>
                <NewPostDropdown />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-2">
                        <span className="text-sm font-medium">
                          {user.fullName
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <Link href={`/profile/${user.id}`}>
                      <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        Your Profile
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Dialog open={authOpen} onOpenChange={setAuthOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={() => setAuthMode("login")}
                    >
                      Log in
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <AuthForms
                      initialMode={authMode}
                      onSuccess={() => setAuthOpen(false)}
                      onModeChange={setAuthMode}
                    />
                  </DialogContent>
                </Dialog>

                <Dialog open={authOpen} onOpenChange={setAuthOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="ml-4"
                      onClick={() => setAuthMode("register")}
                    >
                      Sign up
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

import { apiRequest } from "./queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

export interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  fullName: string;
  email: string;
  password: string;
}

// Get the current authenticated user
export function useCurrentUser() {
  return useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 300000, // 5 minutes
  });
}

// Register a new user
export function useRegister() {
  return useMutation({
    mutationFn: (data: RegisterData) => 
      apiRequest("POST", "/api/auth/register", data)
        .then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });
}

// Login a user
export function useLogin() {
  return useMutation({
    mutationFn: (credentials: LoginCredentials) => 
      apiRequest("POST", "/api/auth/login", credentials)
        .then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });
}

// Logout the current user
export function useLogout() {
  return useMutation({
    mutationFn: () => 
      apiRequest("POST", "/api/auth/logout")
        .then(() => undefined),
    onSuccess: () => {
      queryClient.clear(); // Clear all cached data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  });
}

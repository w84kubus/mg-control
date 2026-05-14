import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppUser, ThemeMode } from "@/types";

interface AuthState {
  user: AppUser | null;
  firebaseUid: string | null;
  isLoading: boolean;
  theme: ThemeMode;
  setUser: (user: AppUser | null) => void;
  setFirebaseUid: (uid: string | null) => void;
  setLoading: (loading: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      firebaseUid: null,
      isLoading: true,
      theme: "system",
      setUser: (user) => set({ user }),
      setFirebaseUid: (firebaseUid) => set({ firebaseUid }),
      setLoading: (isLoading) => set({ isLoading }),
      setTheme: (theme) => set({ theme }),
      reset: () =>
        set({ user: null, firebaseUid: null, isLoading: false }),
    }),
    {
      name: "mg-control-auth",
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);

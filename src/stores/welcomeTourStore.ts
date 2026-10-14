import { create } from "zustand";

interface WelcomeTourState {
  requestId: number;
  open: () => void;
}

export const useWelcomeTourStore = create<WelcomeTourState>((set) => ({
  requestId: 0,
  open: () => set((state) => ({ requestId: state.requestId + 1 })),
}));

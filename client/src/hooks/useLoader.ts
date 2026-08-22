import { create } from "zustand";

interface LoaderState {
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const useLoader = create<LoaderState>((set) => ({
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
}));

export default useLoader;

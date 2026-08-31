import { create } from "zustand";

const useSocietyModalStore = create((set) => ({
  isOpen: false,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));

export default useSocietyModalStore;

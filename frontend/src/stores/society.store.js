import { create } from "zustand";
import { persist } from "zustand/middleware";
import api, { setActiveSocietyId } from "../lib/api";
import queryClient from "../lib/queryClient";

const useSocietyStore = create(
  persist(
    (set, get) => ({
      societies: [],
      activeSocietyId: null,
      status: "idle",

      loadMySocieties: async () => {
        set({ status: "loading" });
        try {
          const response = await api.get("/memberships/my-societies");
          const societies = response.data.data || [];
          const { activeSocietyId } = get();
          const stillAuthorized =
            activeSocietyId && societies.some((s) => s.society.id === activeSocietyId);

          let nextActiveId;
          if (stillAuthorized) {
            nextActiveId = activeSocietyId;
          } else if (societies.length > 0) {
            nextActiveId = societies[0].society.id;
          } else {
            nextActiveId = null;
          }

          setActiveSocietyId(nextActiveId);
          set({ societies, activeSocietyId: nextActiveId, status: "ready" });
        } catch (error) {
          set({ status: "error" });
          throw error;
        }
      },

      setActiveSociety: (societyId) => {
        const { societies, activeSocietyId } = get();
        const target = societies.find((s) => s.society.id === societyId);
        if (!target || societyId === activeSocietyId) return;

        setActiveSocietyId(societyId);
        set({ activeSocietyId: societyId });

        queryClient.invalidateQueries();
      },

      reset: () => {
        setActiveSocietyId(null);
        set({ societies: [], activeSocietyId: null, status: "idle" });
        queryClient.clear();
      },
    }),
    {
      name: "residentone.active-society",
      partialize: (state) => ({ activeSocietyId: state.activeSocietyId }),
    }
  )
);

export const selectAvailableSocieties = (state) => state.societies;

export const selectActiveMembership = (state) =>
  state.societies.find((s) => s.society.id === state.activeSocietyId) || null;

export const selectActiveSociety = (state) => selectActiveMembership(state)?.society || null;

export const selectPrimaryUnit = (state) => {
  const membership = selectActiveMembership(state);
  return membership?.units?.[0] || null;
};

export default useSocietyStore;

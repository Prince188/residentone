import { create } from "zustand";
import { persist } from "zustand/middleware";
import api, { setActiveSocietyId } from "../lib/api";
import queryClient from "../lib/queryClient";

const useSocietyStore = create(
  persist(
    (set, get) => ({
      societies: [],
      activeSocietyId: null,
      isSuperAdminManaging: false,
      status: "idle",

      loadMySocieties: async () => {
        set({ status: "loading" });
        try {
          const response = await api.get("/memberships/my-societies");
          const societies = response.data.data || [];
          const { activeSocietyId, isSuperAdminManaging } = get();

          // If super admin is currently managing a society, preserve it
          if (isSuperAdminManaging && activeSocietyId) {
            setActiveSocietyId(activeSocietyId);
            set({ status: "ready" });
            return;
          }

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

      enterSocietyAsSuperAdmin: (society) => {
        const socId = society.id || society._id;
        const virtualEntry = {
          society: {
            id: socId,
            name: society.name,
            city: society.city,
            state: society.state,
            address: society.address,
            societyType: society.societyType,
            isActive: society.isActive,
            totalUnits: society.totalUnits,
          },
          role: "super_admin",
          additionalRoles: ["society_admin"],
          units: [],
        };
        const existing = get().societies.filter((s) => s.society.id !== socId);
        setActiveSocietyId(socId);
        set({
          societies: [virtualEntry, ...existing],
          activeSocietyId: socId,
          isSuperAdminManaging: true,
        });
        queryClient.invalidateQueries();
      },

      exitSuperAdminSocietyMode: () => {
        setActiveSocietyId(null);
        set({
          activeSocietyId: null,
          isSuperAdminManaging: false,
        });
        queryClient.invalidateQueries();
      },

      reset: () => {
        setActiveSocietyId(null);
        set({ societies: [], activeSocietyId: null, isSuperAdminManaging: false, status: "idle" });
        queryClient.clear();
      },
    }),
    {
      name: "residentone.active-society",
      partialize: (state) => ({
        activeSocietyId: state.activeSocietyId,
        isSuperAdminManaging: state.isSuperAdminManaging,
        societies: state.isSuperAdminManaging ? state.societies : [],
      }),
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

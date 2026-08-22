import { create } from "zustand";
import api, { setAccessToken } from "../lib/api";
import useSocietyStore from "./society.store";

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const response = await api.post("/auth/login", { email, password });
    const { user, accessToken, refreshToken } = response.data.data;
    setAccessToken(accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    useSocietyStore.getState().reset();
    set({ user, isAuthenticated: true });
  },

  register: async (name, email, phone, password) => {
    const response = await api.post("/auth/register", { name, email, phone, password });
    const { user, accessToken, refreshToken } = response.data.data;
    setAccessToken(accessToken);
    localStorage.setItem("refreshToken", refreshToken);
    useSocietyStore.getState().reset();
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    setAccessToken(null);
    localStorage.removeItem("refreshToken");
    useSocietyStore.getState().reset();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      set({ isLoading: false });
      return;
    }

    try {
      const response = await api.post("/auth/refresh", { refreshToken });
      const { accessToken, refreshToken: newRefresh } = response.data.data;
      setAccessToken(accessToken);
      localStorage.setItem("refreshToken", newRefresh);

      const userResponse = await api.get("/users/profile");
      set({ user: userResponse.data.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem("refreshToken");
      setAccessToken(null);
      set({ isLoading: false });
    }
  },
}));

export default useAuthStore;

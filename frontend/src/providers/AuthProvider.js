import { useEffect } from "react";
import useAuthStore from "../stores/auth.store";
import useSocietyStore from "../stores/society.store";

export default function AuthProvider({ children }) {
  const loadUser = useAuthStore((state) => state.loadUser);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const societyStatus = useSocietyStore((state) => state.status);
  const loadMySocieties = useSocietyStore((state) => state.loadMySocieties);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (societyStatus === "idle") {
      loadMySocieties().catch(() => {});
    }
  }, [isAuthenticated, societyStatus, loadMySocieties]);

  if (isLoading || (isAuthenticated && societyStatus !== "ready")) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return children;
}

import { Navigate } from "react-router-dom";
import useAuthStore from "../stores/auth.store";

export default function SuperAdminRoute({ children }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

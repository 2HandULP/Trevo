import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function RoleRoute({ allowedRoles }) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const normalizedRole = role?.toLowerCase();
  const normalizedAllowedRoles = allowedRoles.map((allowedRole) =>
    allowedRole.toLowerCase()
  );

  if (!normalizedAllowedRoles.includes(normalizedRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

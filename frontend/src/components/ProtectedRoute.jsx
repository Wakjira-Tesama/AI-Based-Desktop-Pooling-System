import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

export default function ProtectedRoute({ children, role }) {
  const appMode = import.meta.env.MODE;
  const isAdminMode = appMode === "admin";
  const isStudentMode = appMode === "student";
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!token) {
      if (isMounted) {
        setLoading(false);
      }
      return () => {
        isMounted = false;
      };
    }

    const fetchUser = async () => {
      try {
        const res = await api.get("/me");
        if (isMounted) {
          setIsAdmin(!!res.data?.is_admin);
        }
      } catch {
        if (isMounted) {
          localStorage.removeItem("token");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchUser();
    return () => {
      isMounted = false;
    };
  }, [token]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (isAdminMode && role === "student") {
    return <Navigate to="/admin-login" replace />;
  }

  if (isStudentMode && role === "admin") {
    return <Navigate to="/student" replace />;
  }

  if (loading) {
    return null;
  }

  if (role === "admin" && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === "student" && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

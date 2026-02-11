import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../api";

export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    let isMounted = true;
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
  }, []);

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

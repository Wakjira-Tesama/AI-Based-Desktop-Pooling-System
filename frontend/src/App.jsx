import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import SessionPage from "./pages/SessionPage";
import AdminDashboard from "./pages/AdminDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const appMode = import.meta.env.MODE;
  const isAdminMode = appMode === "admin";
  const isStudentMode = appMode === "student";
  const defaultRoute = isAdminMode ? "/admin-login" : "/student";

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={defaultRoute} replace />} />
        <Route
          path="/student"
          element={
            isAdminMode ? (
              <Navigate to="/admin-login" replace />
            ) : (
              <LoginPage role="student" />
            )
          }
        />
        <Route
          path="/admin-login"
          element={
            isStudentMode ? (
              <Navigate to="/student" replace />
            ) : (
              <LoginPage role="admin" />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAdminMode ? (
              <Navigate to="/admin-login" replace />
            ) : (
              <RegisterPage />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            isAdminMode ? (
              <Navigate to="/admin-login" replace />
            ) : (
              <ProtectedRoute role="student">
                <DashboardPage />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/session"
          element={
            isAdminMode ? (
              <Navigate to="/admin-login" replace />
            ) : (
              <ProtectedRoute role="student">
                <SessionPage />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin"
          element={
            isStudentMode ? (
              <Navigate to="/student" replace />
            ) : (
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

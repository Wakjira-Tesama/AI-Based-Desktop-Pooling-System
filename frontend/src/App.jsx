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
import LibrarySelection from "./pages/LibrarySelection";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/student-login" replace />} />
        
        <Route path="/student-login" element={<LoginPage role="student" />} />
        <Route path="/admin-login" element={<LoginPage role="admin" />} />

        {/* Unified Registration (Optional context for library could be added later, but basic register is fine for students) */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Student Library Selection */}
        <Route
          path="/select-library"
          element={
            <ProtectedRoute role="student">
              <LibrarySelection />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="student">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/session"
          element={
            <ProtectedRoute role="student">
              <SessionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

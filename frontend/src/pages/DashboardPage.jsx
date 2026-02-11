import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import {
  ComputerDesktopIcon,
  SignalIcon,
  SignalSlashIcon,
  Cog6ToothIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export default function DashboardPage() {
  const [desktops, setDesktops] = useState([]);
  const [user, setUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(null);
  const [sessionDuration, setSessionDuration] = useState(60);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const [desktopsRes, userRes] = await Promise.all([
        api.get("/desktops/"),
        api.get("/me"),
      ]);
      setDesktops(desktopsRes.data);
      setUser(userRes.data);

      // Check for active session
      try {
        const sessionRes = await api.get("/sessions/me");
        setActiveSession(sessionRes.data);
      } catch {
        setActiveSession(null);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      if (error.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleStartSession = async (desktopId) => {
    setStartingSession(desktopId);
    try {
      await api.post(
        `/sessions/start?desktop_id=${desktopId}&duration_minutes=${sessionDuration}`,
      );
      navigate("/session");
    } catch (error) {
      console.error("Failed to start session", error);
      alert(error.response?.data?.detail || "Failed to start session");
    } finally {
      setStartingSession(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If user has active session, redirect to session page
  if (activeSession) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <ComputerDesktopIcon className="h-16 w-16 mx-auto mb-4 text-blue-500" />
          <h2 className="text-2xl font-bold mb-2">
            You have an active session
          </h2>
          <p className="text-gray-400 mb-6">
            Desktop #{activeSession.desktop_id}
          </p>
          <button
            onClick={() => navigate("/session")}
            className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Go to Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 shadow border-b border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Desktop Pool
              </h1>
              <p className="text-sm text-gray-400">
                Select an available desktop to start your session
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-300">
                <UserCircleIcon className="h-6 w-6" />
                <span className="text-sm font-medium">{user?.name}</span>
              </div>
              {user?.is_admin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats Bar */}
          <div className="flex gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="text-gray-400">
                Available:{" "}
                {desktops.filter((d) => d.status === "available").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span className="text-gray-400">
                Busy: {desktops.filter((d) => d.status === "busy").length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-gray-400">
                Offline: {desktops.filter((d) => d.status === "offline").length}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-gray-400">Session time</span>
              <select
                value={sessionDuration}
                onChange={(e) => setSessionDuration(Number(e.target.value))}
                className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
                <option value={180}>180 min</option>
                <option value={240}>240 min</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {desktops.length > 0 ? (
              desktops.map((desktop) => (
                <div
                  key={desktop.id}
                  className={clsx(
                    "relative flex flex-col overflow-hidden rounded-2xl border p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
                    desktop.status === "available"
                      ? "bg-gray-800 border-emerald-500/30 hover:border-emerald-500/50"
                      : desktop.status === "busy"
                        ? "bg-gray-800 border-blue-500/30"
                        : "bg-gray-800 border-gray-700",
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={clsx(
                        "p-3 rounded-xl",
                        desktop.status === "available"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : desktop.status === "busy"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-700 text-gray-400",
                      )}
                    >
                      <ComputerDesktopIcon className="h-6 w-6" />
                    </div>
                    <div
                      className={clsx(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                        desktop.status === "available"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : desktop.status === "busy"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-gray-700 text-gray-400",
                      )}
                    >
                      {desktop.status === "available" ||
                      desktop.status === "busy" ? (
                        <SignalIcon className="h-3 w-3" />
                      ) : (
                        <SignalSlashIcon className="h-3 w-3" />
                      )}
                      {desktop.status.toUpperCase()}
                    </div>
                  </div>

                  <h3 className="text-lg font-semibold text-white">
                    {desktop.desktop_id}
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    {desktop.ip_address}
                  </p>

                  <div className="mt-6 pt-4 border-t border-gray-700/50">
                    <button
                      onClick={() => handleStartSession(desktop.id)}
                      disabled={
                        desktop.status !== "available" ||
                        startingSession === desktop.id
                      }
                      className={clsx(
                        "w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200",
                        desktop.status === "available"
                          ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-95"
                          : "bg-gray-700 text-gray-400 cursor-not-allowed",
                      )}
                    >
                      {startingSession === desktop.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Starting...
                        </span>
                      ) : desktop.status === "available" ? (
                        "Start Session"
                      ) : (
                        "Unavailable"
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
                <ComputerDesktopIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  No desktops available. Please contact admin to add desktops.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

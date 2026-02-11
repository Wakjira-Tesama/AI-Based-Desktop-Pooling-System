import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import {
  ComputerDesktopIcon,
  ChartBarIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [desktops, setDesktops] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingDesktopId, setUpdatingDesktopId] = useState(null);
  const [endingSessionId, setEndingSessionId] = useState(null);
  const [newDesktop, setNewDesktop] = useState({
    desktop_id: "",
    ip_address: "",
    status: "available",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, statsRes, desktopsRes, sessionsRes] = await Promise.all([
        api.get("/me"),
        api.get("/analytics/stats"),
        api.get("/desktops/"),
        api.get("/sessions/active"),
      ]);

      setUser(userRes.data);
      if (!userRes.data.is_admin) {
        navigate("/dashboard");
        return;
      }

      setStats(statsRes.data);
      setDesktops(desktopsRes.data);
      setActiveSessions(sessionsRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
      if (err.response?.status === 401) {
        localStorage.removeItem("token");
        navigate("/");
      } else if (err.response?.status === 403) {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDesktop = async (e) => {
    e.preventDefault();
    try {
      await api.post("/desktops/", newDesktop);
      setShowAddModal(false);
      setNewDesktop({ desktop_id: "", ip_address: "", status: "available" });
      fetchData();
    } catch (err) {
      console.error("Failed to add desktop", err);
    }
  };

  const handleDeleteDesktop = async (id) => {
    if (!confirm("Are you sure you want to delete this desktop?")) return;
    try {
      await api.delete(`/desktops/${id}`);
      fetchData();
    } catch (err) {
      console.error("Failed to delete desktop", err);
    }
  };

  const handleUpdateStatus = async (desktopId, status) => {
    setUpdatingDesktopId(desktopId);
    try {
      await api.patch(`/desktops/${desktopId}/status`, { status });
      fetchData();
    } catch (err) {
      console.error("Failed to update desktop status", err);
    } finally {
      setUpdatingDesktopId(null);
    }
  };

  const handleEndSession = async (sessionId) => {
    setEndingSessionId(sessionId);
    try {
      await api.post(`/sessions/${sessionId}/end`);
      fetchData();
    } catch (err) {
      console.error("Failed to end session", err);
    } finally {
      setEndingSessionId(null);
    }
  };

  const getRemainingMinutes = (session) => {
    const start = new Date(session.start_time);
    const duration = session.duration_minutes || 60;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const remainingMs = end - new Date();
    return Math.ceil(remainingMs / 60000);
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

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-400">
                  Manage desktops and view analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">{user?.name}</span>
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

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <ComputerDesktopIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Desktops</p>
                <p className="text-2xl font-bold">
                  {stats?.desktops?.total || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <ComputerDesktopIcon className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Available</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {stats?.desktops?.available || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <UsersIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-orange-400">
                  {stats?.sessions?.active || 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Sessions</p>
                <p className="text-2xl font-bold">
                  {stats?.sessions?.total || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktops Management */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 mb-8">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Desktop Management</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Desktop
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Desktop ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    IP Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Last Heartbeat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Update
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {desktops.map((desktop) => (
                  <tr key={desktop.id} className="hover:bg-gray-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {desktop.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {desktop.desktop_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {desktop.ip_address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {desktop.last_heartbeat
                        ? new Date(desktop.last_heartbeat).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-full text-xs font-medium",
                          desktop.status === "available"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : desktop.status === "busy"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-gray-700 text-gray-400",
                        )}
                      >
                        {desktop.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={desktop.status}
                        onChange={(e) =>
                          handleUpdateStatus(desktop.id, e.target.value)
                        }
                        disabled={updatingDesktopId === desktop.id}
                        className="rounded-lg bg-gray-800 border border-gray-700 px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="available">available</option>
                        <option value="busy">busy</option>
                        <option value="offline">offline</option>
                        <option value="maintenance">maintenance</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleDeleteDesktop(desktop.id)}
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {desktops.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No desktops found. Add your first desktop!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-gray-800 rounded-xl border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Active Sessions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Session ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Student ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Desktop ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time Left
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Start Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {activeSessions.map((session) => {
                  const remaining = getRemainingMinutes(session);
                  return (
                    <tr key={session.id} className="hover:bg-gray-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        #{session.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {session.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {session.desktop_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {session.duration_minutes || 60} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {remaining <= 0 ? "Expired" : `${remaining} min`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(session.start_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleEndSession(session.id)}
                          disabled={endingSessionId === session.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600/10 text-red-400 hover:bg-red-600/20 disabled:opacity-50"
                        >
                          {endingSessionId === session.id ? "Ending..." : "End"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {activeSessions.length === 0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No active sessions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Desktop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Desktop</h3>
            <form onSubmit={handleAddDesktop} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Desktop ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., LIB-001"
                  className="w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                  value={newDesktop.desktop_id}
                  onChange={(e) =>
                    setNewDesktop({ ...newDesktop, desktop_id: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  IP Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., 192.168.1.101"
                  className="w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                  value={newDesktop.ip_address}
                  onChange={(e) =>
                    setNewDesktop({ ...newDesktop, ip_address: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Add Desktop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

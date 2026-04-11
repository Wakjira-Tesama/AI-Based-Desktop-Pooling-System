import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  ComputerDesktopIcon,
  ChartBarIcon,
  UsersIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
const TIME_SLOTS = [
  { start: "08:00", end: "09:00", label: "8:00AM-9:00AM" },
  { start: "09:00", end: "10:00", label: "9:00AM-10:00AM" },
  { start: "10:00", end: "11:00", label: "10:00AM-11:00AM" },
  { start: "11:00", end: "12:00", label: "11:00AM-12:00PM" },
  { start: "12:00", end: "13:00", label: "12:00PM-1:00PM" },
  { start: "13:00", end: "14:00", label: "1:00PM-2:00PM" },
  { start: "14:00", end: "15:00", label: "2:00PM-3:00PM" },
  { start: "15:00", end: "16:00", label: "3:00PM-4:00PM" },
  { start: "16:00", end: "17:00", label: "4:00PM-5:00PM" },
  { start: "17:00", end: "18:00", label: "5:00PM-6:00PM" },
];

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stats, setStats] = useState(null);
  const [desktops, setDesktops] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [students, setStudents] = useState([]);
  const [issueReports, setIssueReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [updatingDesktopId, setUpdatingDesktopId] = useState(null);
  const [endingSessionId, setEndingSessionId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteDesktop, setPendingDeleteDesktop] = useState(null);
  const [newDesktop, setNewDesktop] = useState({
    desktop_id: "",
    ip_address: "",
    status: "available",
  });
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [
        userRes,
        statsRes,
        desktopsRes,
        sessionsRes,
        studentsRes,
        scheduleRes,
        issuesRes,
      ] = await Promise.all([
        api.get("/me"),
        api.get("/analytics/stats"),
        api.get("/desktops/"),
        api.get("/sessions/active"),
        api.get("/students/"),
        api.get("/schedule", { params: { day: today } }),
        api.get("/issues"),
      ]);

      setUser(userRes.data);
      if (!userRes.data.is_admin) {
        navigate("/dashboard");
        return;
      }

      setStats(statsRes.data);
      setDesktops(desktopsRes.data);
      setActiveSessions(sessionsRes.data);
      setStudents(studentsRes.data || []);
      setScheduleEntries(scheduleRes.data || []);
      setIssueReports(issuesRes.data || []);
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
  }, [navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(clock);
  }, []);

  const handleAddDesktop = async (e) => {
    e.preventDefault();
    try {
      const ipAddress = getNextIp();
      await api.post("/desktops/", { 
        ...newDesktop, 
        ip_address: ipAddress,
        library: user.library || "central" 
      });
      setShowAddModal(false);
      setNewDesktop({ desktop_id: "", ip_address: "", status: "available" });
      fetchData();
    } catch (err) {
      console.error("Failed to add desktop", err);
      alert("Failed to add desktop. Make sure the Desktop ID is unique.");
    }
  };

  const getNextIp = () => {
    const isApplied = user?.library === "applied";
    const base = isApplied ? "192.168.2." : "192.168.1.";
    
    const lastOctets = desktops
      .map((desktop) => desktop.ip_address || "")
      .filter((ip) => ip.startsWith(base))
      .map((ip) => Number(ip.replace(base, "")))
      .filter((value) => Number.isInteger(value) && value > 0 && value < 255);

    const startOctet = isApplied ? 100 : 100; // Both start from .101
    const maxOctet = lastOctets.length ? Math.max(...lastOctets) : startOctet;
    return `${base}${maxOctet + 1}`;
  };

  const openDeleteModal = (desktop) => {
    if (!desktop) return;
    setPendingDeleteDesktop(desktop);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setPendingDeleteDesktop(null);
  };

  const handleDeleteDesktop = async (id) => {
    closeDeleteModal();
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

  const studentById = students.reduce((acc, student) => {
    acc[student.id] = student.student_id;
    return acc;
  }, {});
  const desktopCodeById = desktops.reduce((acc, desktop) => {
    acc[desktop.id] = desktop.desktop_id;
    return acc;
  }, {});
  const activeByDesktop = activeSessions.reduce((acc, session) => {
    acc[session.desktop_id] = session;
    return acc;
  }, {});
  const nextIp = getNextIp();

  if (loading) {
    return (
      <div className="astu-shell flex items-center justify-center">
        <div className="astu-content animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="astu-shell text-white">
      {/* Header */}
      <header className="astu-content bg-gray-800/80 border-b border-gray-700">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img
                src="/astu-logo.svg"
                alt="ASTU logo"
                className="astu-logo"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <div>
                <h1 className="text-2xl font-bold text-white astu-title">
                  Librarian Dashboard
                </h1>
                <p className="text-sm astu-subtitle">
                  Manage desktops and monitor usage
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
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

      <main className="astu-content mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="astu-panel astu-tile p-6">
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
          <div className="astu-panel astu-tile p-6">
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
          <div className="astu-panel astu-tile p-6">
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
          <div className="astu-panel astu-tile p-6">
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

        <div className="mb-8 astu-panel">
          <div className="border-b border-gray-700 px-6 py-4">
            <h2 className="text-lg font-semibold">Desktop Status Sheet</h2>
            <p className="text-sm text-gray-400">
              Busy shows student ID, available shows available
            </p>
          </div>
          <div className="overflow-x-auto">
            {desktops.length > 0 ? (
              <table className="min-w-full text-sm text-gray-200">
                <thead className="bg-gray-700/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Time
                    </th>
                    {desktops.map((desktop) => (
                      <th
                        key={desktop.id}
                        className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-300"
                      >
                        {desktop.desktop_id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {TIME_SLOTS.map((slot) => (
                    <tr key={slot.start} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-300 whitespace-nowrap">
                        {slot.label}
                      </td>
                      {desktops.map((desktop) => {
                        const scheduleEntry = scheduleEntries.find(
                          (entry) =>
                            entry.desktop_id === desktop.id &&
                            entry.start_time === slot.start &&
                            entry.end_time === slot.end,
                        );
                        const bookedBy = scheduleEntry?.student_id || null;
                        const session = activeByDesktop[desktop.id];
                        const studentCode = session
                          ? studentById[session.student_id] ||
                            session.student_id
                          : null;
                        const isBooked = Boolean(bookedBy);
                        const statusLabel = isBooked
                          ? bookedBy
                          : desktop.status === "busy" && studentCode
                            ? studentCode
                            : desktop.status;
                        return (
                          <td
                            key={`${desktop.id}-${slot.start}`}
                            className="px-4 py-2 text-center"
                          >
                            <span
                              className={clsx(
                                "inline-flex w-full justify-center rounded-md px-2 py-1 text-xs font-semibold",
                                isBooked
                                  ? "bg-blue-500/10 text-blue-300"
                                  : desktop.status === "available"
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : desktop.status === "busy"
                                      ? "bg-blue-500/10 text-blue-300"
                                      : "bg-gray-700 text-gray-400",
                              )}
                            >
                              {statusLabel}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <ComputerDesktopIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No desktops available. Please add PCs.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 astu-panel">
          <div className="border-b border-gray-700 px-6 py-4">
            <h2 className="text-lg font-semibold">Issue Reports</h2>
            <p className="text-sm text-gray-400">
              Student-reported desktop issues
            </p>
          </div>
          <div className="overflow-x-auto">
            {issueReports.length > 0 ? (
              <table className="min-w-full text-sm text-gray-200">
                <thead className="bg-gray-700/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Student
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Desktop
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Category
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Details
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {issueReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm">
                        {studentById[report.student_id] || report.student_id}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {desktopCodeById[report.desktop_id] ||
                          report.desktop_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {report.start_time}-{report.end_time}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {report.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {report.description || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">
                          {report.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>No issue reports yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Desktops Management */}
        <div className="astu-panel mb-8">
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
                    Status / Student
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
                      {(() => {
                        const session = activeByDesktop[desktop.id];
                        const studentCode = session
                          ? studentById[session.student_id] ||
                            session.student_id
                          : null;
                        const statusLabel =
                          desktop.status === "busy" && studentCode
                            ? studentCode
                            : desktop.status;

                        return (
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
                            {statusLabel}
                          </span>
                        );
                      })()}
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
                        onClick={() => openDeleteModal(desktop)}
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
        <div className="astu-panel">
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
                  IP Address (auto-assigned)
                </label>
                <div className="w-full rounded-lg border border-gray-700 bg-gray-800 py-3 px-3 text-sm text-gray-200">
                  {nextIp}
                </div>
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

      {showDeleteModal && pendingDeleteDesktop && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Delete desktop?</h3>
            <p className="text-sm text-gray-400 mb-6">
              {pendingDeleteDesktop.desktop_id} •{" "}
              {pendingDeleteDesktop.ip_address}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDesktop(pendingDeleteDesktop.id)}
                className="flex-1 bg-red-600 hover:bg-red-500 py-2.5 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

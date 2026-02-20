import { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import {
  ComputerDesktopIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  XMarkIcon,
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

export default function DashboardPage() {
  const [desktops, setDesktops] = useState([]);
  const [scheduleEntries, setScheduleEntries] = useState([]);
  const [user, setUser] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [startingSession, setStartingSession] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedDesktop, setSelectedDesktop] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [registerError, setRegisterError] = useState("");
  const [reportEntry, setReportEntry] = useState(null);
  const [reportCategory, setReportCategory] = useState("Password changed");
  const [reportDescription, setReportDescription] = useState("");
  const [reportError, setReportError] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [noticeType, setNoticeType] = useState("success");
  const [lastEndedKey, setLastEndedKey] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingCancelEntry, setPendingCancelEntry] = useState(null);
  const navigate = useNavigate();

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [desktopsRes, userRes, scheduleRes] = await Promise.all([
        api.get("/desktops/overview"),
        api.get("/me"),
        api.get("/schedule", { params: { day: today } }),
      ]);
      setDesktops(desktopsRes.data);
      setUser(userRes.data);
      setScheduleEntries(scheduleRes.data || []);

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
    const interval = setInterval(fetchData, 60000); // Poll every 60 seconds
    return () => clearInterval(interval);
  }, [fetchData, navigate]);

  useEffect(() => {
    const clock = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(clock);
  }, []);

  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    setSelectedDesktop(null);
    setSelectedSlot(null);
    setRegisterError("");
  };

  const closeReportModal = () => {
    setShowReportModal(false);
    setReportEntry(null);
    setReportError("");
    setReportSubmitting(false);
  };

  const showNotice = (message, type = "success") => {
    setNoticeMessage(message);
    setNoticeType(type);
  };

  const clearNotice = () => {
    setNoticeMessage("");
  };

  const openCancelModal = (entry) => {
    if (!entry) return;
    setPendingCancelEntry(entry);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setPendingCancelEntry(null);
  };

  const timeToMinutes = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const isSlotExpired = (slot) => {
    if (!slot?.end) return false;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    return nowMinutes > timeToMinutes(slot.end);
  };

  const isEntryExpired = (entry) => {
    if (!entry?.date || !entry?.end_time) return false;
    const today = new Date().toISOString().slice(0, 10);
    if (entry.date < today) return true;
    if (entry.date > today) return false;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return nowMinutes >= timeToMinutes(entry.end_time);
  };

  const timesOverlap = (startA, endA, startB, endB) => {
    return timeToMinutes(startA) < timeToMinutes(endB)
      ? timeToMinutes(startB) < timeToMinutes(endA)
      : false;
  };

  const handleRegisterClick = (desktop, slot) => {
    const studentId = user?.student_id?.toLowerCase();
    if (!studentId) return;
    const hasBooking = scheduleEntries.some(
      (entry) =>
        !isEntryExpired(entry) &&
        (entry.student_id || "").toLowerCase() === studentId,
    );
    const isSameSlotBooked = scheduleEntries.some(
      (entry) =>
        (entry.student_id || "").toLowerCase() === studentId &&
        entry.desktop_id === desktop.id &&
        entry.start_time === slot.start &&
        entry.end_time === slot.end,
    );

    if (hasBooking && !isSameSlotBooked) {
      setRegisterError(
        "You already have a booking. Cancel it to register another.",
      );
      return;
    }
    const hasOverlap = scheduleEntries.some((entry) => {
      if (isEntryExpired(entry)) return false;
      if ((entry.student_id || "").toLowerCase() !== studentId) return false;
      if (
        entry.desktop_id === desktop.id &&
        entry.start_time === slot.start &&
        entry.end_time === slot.end
      ) {
        return false;
      }
      return timesOverlap(
        entry.start_time,
        entry.end_time,
        slot.start,
        slot.end,
      );
    });

    if (hasOverlap) {
      setRegisterError("You already booked another time for this slot.");
      return;
    }

    setRegisterError("");
    setSelectedDesktop(desktop);
    setSelectedSlot(slot);
    setShowRegisterModal(true);
  };

  const openReportModal = (entry) => {
    if (!entry) return;
    setReportEntry(entry);
    setReportCategory("Password changed");
    setReportDescription("");
    setReportError("");
    setShowReportModal(true);
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    if (!reportEntry) return;
    setReportSubmitting(true);
    setReportError("");
    try {
      await api.post("/issues/report", {
        desktop_id: reportEntry.desktop_id,
        date: reportEntry.date,
        start_time: reportEntry.start_time,
        end_time: reportEntry.end_time,
        category: reportCategory,
        description: reportDescription || null,
      });
      closeReportModal();
      showNotice("Issue reported to admin.");
    } catch (error) {
      console.error("Failed to report issue", error);
      const message = error.response?.data?.detail || "Failed to report issue";
      setReportError(message);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleCancelBooking = async (entry) => {
    if (!entry) return;
    closeCancelModal();

    setRegisterError("");
    setStartingSession(entry.desktop_id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post("/schedule/entry", {
        desktop_id: entry.desktop_id,
        date: entry.date || today,
        start_time: entry.start_time,
        end_time: entry.end_time,
        student_id: null,
        mark: null,
      });
      fetchData();
      showNotice("Booking canceled successfully.");
    } catch (error) {
      console.error("Failed to cancel booking", error);
      const message =
        error.response?.data?.detail || "Failed to cancel booking";
      setRegisterError(message);
      setNoticeType("error");
      showNotice(message, "error");
    } finally {
      setStartingSession(null);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    if (!selectedDesktop || !selectedSlot) return;

    setStartingSession(selectedDesktop.id);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const formData = new FormData();
      formData.append("desktop_id", String(selectedDesktop.id));
      formData.append("date", today);
      formData.append("start_time", selectedSlot.start);
      formData.append("end_time", selectedSlot.end);
      formData.append("student_id", user?.student_id || "");
      formData.append("name", user?.name || "");

      await api.post("/schedule/register", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      closeRegisterModal();
      fetchData();
      showNotice("Time slot registered successfully.");
    } catch (error) {
      console.error("Failed to register session", error);
      const message =
        error.response?.data?.detail || "Failed to register time slot";
      setRegisterError(message);
    } finally {
      setStartingSession(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const studentIdLower = user?.student_id?.toLowerCase();
  const bookingEntry = scheduleEntries.find(
    (entry) => (entry.student_id || "").toLowerCase() === studentIdLower,
  );

  useEffect(() => {
    if (!bookingEntry) return;
    if (!isEntryExpired(bookingEntry)) return;
    const entryKey = `${bookingEntry.desktop_id}-${bookingEntry.date}-${bookingEntry.start_time}-${bookingEntry.end_time}`;
    if (entryKey === lastEndedKey) return;
    showNotice(
      "Your time is ended please register on available desktop",
      "error",
    );
    setLastEndedKey(entryKey);
  }, [bookingEntry, lastEndedKey, currentTime]);

  if (loading) {
    return (
      <div className="astu-shell flex items-center justify-center">
        <div className="astu-content animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If user has active session, redirect to session page
  if (activeSession) {
    return (
      <div className="astu-shell flex items-center justify-center text-white">
        <div className="astu-content text-center">
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

  const availableCount = desktops.filter(
    (desktop) => desktop.status === "available",
  ).length;
  const busyCount = desktops.filter(
    (desktop) => desktop.status === "busy",
  ).length;
  const offlineCount = desktops.filter(
    (desktop) => desktop.status === "offline",
  ).length;

  return (
    <div className="astu-shell text-white">
      <header className="astu-content bg-gray-800/80 shadow border-b border-gray-700">
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
                <h1 className="text-2xl font-bold tracking-tight text-white astu-title">
                  Desktop Pool
                </h1>
                <p className="text-sm astu-subtitle">
                  Select an available desktop to start your session
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

      <main className="astu-content">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {/* Stats Bar */}
          <div className="flex gap-4 mb-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="text-gray-400">Available: {availableCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span className="text-gray-400">Busy: {busyCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-500"></div>
              <span className="text-gray-400">Offline: {offlineCount}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-gray-400">Today</span>
              <span className="text-gray-200 font-medium">
                {new Date().toLocaleDateString()}
              </span>
            </div>
          </div>

          {noticeMessage && (
            <div
              className={clsx(
                "mb-6 rounded-xl border px-4 py-3 text-sm flex items-start justify-between gap-3",
                noticeType === "success"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-red-500/40 bg-red-500/10 text-red-200",
              )}
            >
              <span>{noticeMessage}</span>
              <button
                onClick={clearNotice}
                className="text-xs text-current hover:opacity-80"
              >
                Dismiss
              </button>
            </div>
          )}

          {bookingEntry && (
            <div className="mb-6 astu-panel px-6 py-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Your Booking</h2>
                  <p className="text-sm text-gray-400">
                    Desktop {bookingEntry.desktop_id} •{" "}
                    {bookingEntry.start_time}-{bookingEntry.end_time}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => openCancelModal(bookingEntry)}
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                  >
                    Cancel booking
                  </button>
                  <button
                    onClick={() => openReportModal(bookingEntry)}
                    className="rounded-lg bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 hover:bg-amber-500/20"
                  >
                    Report issue
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 astu-panel">
            <div className="border-b border-gray-700 px-6 py-4">
              <h2 className="text-lg font-semibold">Desktop Status Sheet</h2>
              <p className="text-sm text-gray-400">
                Click an available desktop to register
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
                          const entry = scheduleEntries.find(
                            (item) =>
                              item.desktop_id === desktop.id &&
                              item.start_time === slot.start &&
                              item.end_time === slot.end,
                          );
                          const studentId = user?.student_id?.toLowerCase();
                          const bookedBy = entry?.student_id || "";
                          const isBooked = Boolean(bookedBy);
                          const isMine =
                            studentId && bookedBy.toLowerCase() === studentId;
                          const isAvailable =
                            desktop.status === "available" && !isBooked;
                          const canCancel = isMine;
                          const canRegister =
                            isAvailable && !isSlotExpired(slot);
                          const isProcessing =
                            startingSession === desktop.id &&
                            (canCancel || canRegister);
                          const statusLabel = isMine
                            ? "Your slot"
                            : isBooked
                              ? "busy"
                              : desktop.status;
                          return (
                            <td
                              key={`${desktop.id}-${slot.start}`}
                              className="px-4 py-2 text-center"
                            >
                              <button
                                onClick={() => {
                                  if (canCancel) {
                                    openCancelModal(entry);
                                    return;
                                  }
                                  if (canRegister) {
                                    handleRegisterClick(desktop, slot);
                                  }
                                }}
                                disabled={
                                  (!canRegister && !canCancel) || isProcessing
                                }
                                className={clsx(
                                  "w-full rounded-md px-2 py-1 text-xs font-semibold",
                                  isAvailable
                                    ? "bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                    : isMine
                                      ? "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30"
                                      : isBooked
                                        ? "bg-blue-500/10 text-blue-300 cursor-not-allowed"
                                        : desktop.status === "busy"
                                          ? "bg-blue-500/10 text-blue-300 cursor-not-allowed"
                                          : "bg-gray-700 text-gray-400 cursor-not-allowed",
                                )}
                              >
                                {isProcessing && canRegister
                                  ? "Registering"
                                  : isProcessing && canCancel
                                    ? "Canceling"
                                    : statusLabel}
                              </button>
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
                  <p>No desktops available. Please contact admin to add PCs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {showRegisterModal && selectedDesktop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Register Desktop</h3>
                <p className="text-sm text-gray-400">
                  {selectedDesktop.desktop_id} - {selectedDesktop.ip_address}
                </p>
              </div>
              <button
                onClick={closeRegisterModal}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleRegisterSubmit}
              className="px-6 py-5 space-y-5"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400">Student ID</label>
                  <input
                    value={user?.student_id || ""}
                    readOnly
                    className="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Name</label>
                  <input
                    value={user?.name || ""}
                    readOnly
                    className="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Time Slot</label>
                <input
                  value={selectedSlot ? selectedSlot.label : ""}
                  readOnly
                  className="mt-1 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200"
                />
              </div>

              {registerError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {registerError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={closeRegisterModal}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={startingSession === selectedDesktop.id}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                >
                  {startingSession === selectedDesktop.id
                    ? "Registering..."
                    : "Confirm Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReportModal && reportEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-700 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">Report an Issue</h3>
                <p className="text-sm text-gray-400">
                  Desktop {reportEntry.desktop_id} • {reportEntry.start_time}-
                  {reportEntry.end_time}
                </p>
              </div>
              <button
                onClick={closeReportModal}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm text-gray-400">Issue type</label>
                <select
                  value={reportCategory}
                  onChange={(event) => setReportCategory(event.target.value)}
                  className="mt-2 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200"
                >
                  <option>Password changed</option>
                  <option>Cannot log in</option>
                  <option>Desktop not responding</option>
                  <option>Hardware issue</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400">
                  Details (optional)
                </label>
                <textarea
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-gray-200"
                  placeholder="Describe the issue you are facing"
                />
              </div>

              {reportError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {reportError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-gray-700 pt-4">
                <button
                  type="button"
                  onClick={closeReportModal}
                  className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportSubmitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {reportSubmitting ? "Sending..." : "Send report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCancelModal && pendingCancelEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-gray-900 border border-gray-700 shadow-2xl">
            <div className="border-b border-gray-700 px-6 py-4">
              <h3 className="text-lg font-semibold">Cancel booking?</h3>
              <p className="text-sm text-gray-400">
                Desktop {pendingCancelEntry.desktop_id} •{" "}
                {pendingCancelEntry.start_time}-{pendingCancelEntry.end_time}
              </p>
            </div>
            <div className="px-6 py-5 text-sm text-gray-300">
              You can register another desktop after canceling this booking.
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-700 px-6 py-4">
              <button
                type="button"
                onClick={closeCancelModal}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Keep booking
              </button>
              <button
                type="button"
                onClick={() => handleCancelBooking(pendingCancelEntry)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Cancel booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

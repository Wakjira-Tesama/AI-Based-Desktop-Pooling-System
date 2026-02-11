import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  ClockIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

export default function SessionPage() {
  const [session, setSession] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [warning, setWarning] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [timeoutMessage, setTimeoutMessage] = useState("");
  const timeoutHandledRef = useRef(false);
  const navigate = useNavigate();

  const fetchSession = useCallback(async () => {
    try {
      const response = await api.get("/sessions/me");
      setSession(response.data);
      setDurationMinutes(response.data.duration_minutes || 60);

      // Calculate time left
      const startTime = new Date(response.data.start_time);
      const endTime = new Date(
        startTime.getTime() +
          (response.data.duration_minutes || 60) * 60 * 1000,
      );
      const now = new Date();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);
    } catch (err) {
      if (err.response?.status === 404) {
        setTimeoutMessage("Your session has ended.");
        setShowTimeoutModal(true);
        setSession(null);
        setTimeLeft(0);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleEndSession = useCallback(async () => {
    if (!session || ending) return;

    setEnding(true);
    try {
      await api.post(`/sessions/${session.id}/end`);
      navigate("/dashboard");
    } catch (err) {
      console.error("Failed to end session", err);
      setEnding(false);
    }
  }, [ending, navigate, session]);

  const handleTimeout = useCallback(async () => {
    if (!session) {
      setTimeoutMessage("Time is over. Please end your session.");
      setShowTimeoutModal(true);
      return;
    }

    setEnding(true);
    try {
      await api.post(`/sessions/${session.id}/end`);
    } catch (err) {
      console.error("Failed to end session on timeout", err);
    } finally {
      setEnding(false);
      setTimeoutMessage("Time is over. Please end your session.");
      setShowTimeoutModal(true);
    }
  }, [session]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = prev - 1;

        // Set warnings
        if (newTime === 600) setWarning("10 minutes remaining!");
        else if (newTime === 300) setWarning("5 minutes remaining!");
        else if (newTime === 60) setWarning("1 minute remaining!");
        else if (newTime <= 0) {
          if (!timeoutHandledRef.current) {
            timeoutHandledRef.current = true;
            handleTimeout();
          }
          return 0;
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handleTimeout, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getTimeColor = () => {
    if (timeLeft <= 60) return "text-red-400";
    if (timeLeft <= 300) return "text-orange-400";
    if (timeLeft <= 600) return "text-yellow-400";
    return "text-emerald-400";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Warning Banner */}
      {warning && timeLeft > 0 && (
        <div
          className={clsx(
            "bg-gradient-to-r py-3 px-4 text-center font-semibold animate-pulse",
            timeLeft <= 60
              ? "from-red-600 to-red-700"
              : timeLeft <= 300
                ? "from-orange-600 to-orange-700"
                : "from-yellow-600 to-yellow-700",
          )}
        >
          <ExclamationTriangleIcon className="h-5 w-5 inline mr-2" />
          {warning}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Session Card */}
          <div className="bg-gray-800 rounded-3xl border border-gray-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-xl backdrop-blur">
                  <ComputerDesktopIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Active Session
                  </h1>
                  <p className="text-blue-100">Desktop {session?.desktop_id}</p>
                </div>
              </div>
            </div>

            {/* Timer */}
            <div className="p-8 text-center">
              <div className="mb-2 text-gray-400 text-sm uppercase tracking-wider flex items-center justify-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Time Remaining
              </div>
              <div
                className={clsx(
                  "text-7xl font-mono font-bold mb-6 transition-colors",
                  getTimeColor(),
                )}
              >
                {formatTime(timeLeft || 0)}
              </div>

              {/* Progress Ring */}
              <div className="relative w-48 h-48 mx-auto mb-8">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="#374151"
                    strokeWidth="12"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke={
                      timeLeft <= 60
                        ? "#ef4444"
                        : timeLeft <= 300
                          ? "#f97316"
                          : timeLeft <= 600
                            ? "#eab308"
                            : "#10b981"
                    }
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 88}
                    strokeDashoffset={
                      2 *
                      Math.PI *
                      88 *
                      (1 - (timeLeft || 0) / (durationMinutes * 60))
                    }
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-3xl font-bold">
                      {Math.ceil((timeLeft || 0) / 60)}
                    </div>
                    <div className="text-gray-400 text-sm">minutes</div>
                  </div>
                </div>
              </div>

              {/* Session Info */}
              <div className="bg-gray-700/50 rounded-xl p-4 mb-6 text-left">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Started</span>
                    <p className="text-white font-medium">
                      {session?.start_time
                        ? new Date(session.start_time).toLocaleTimeString()
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400">Session ID</span>
                    <p className="text-white font-medium">#{session?.id}</p>
                  </div>
                </div>
              </div>

              {/* End Session Button */}
              <button
                onClick={handleEndSession}
                disabled={ending}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-600/20"
              >
                {ending ? "Ending Session..." : "End Session"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showTimeoutModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md text-center">
            <h3 className="text-xl font-semibold mb-2">Session ended</h3>
            <p className="text-gray-300 mb-6">
              {timeoutMessage || "Your session has ended."}
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg font-medium transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

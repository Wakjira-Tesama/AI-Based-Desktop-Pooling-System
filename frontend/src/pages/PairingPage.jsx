import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { ComputerDesktopIcon } from "@heroicons/react/24/outline";

function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem("device_uuid");
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("device_uuid", deviceId);
  }
  return deviceId;
}

export default function PairingPage() {
  const [desktopId, setDesktopId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const pairedDesktopId = localStorage.getItem("paired_desktop_id");
    if (pairedDesktopId) {
      navigate("/student");
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const deviceId = getOrCreateDeviceId();
      const response = await api.post("/pairings/register", {
        device_uuid: deviceId,
        desktop_id: desktopId.trim(),
      });

      localStorage.setItem("paired_desktop_id", response.data.desktop_code);
      navigate("/student");
    } catch (err) {
      const message = err.response?.data?.detail || "Failed to pair desktop";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
        <div>
          <div className="mx-auto h-12 w-12 text-emerald-400 flex items-center justify-center rounded-full bg-emerald-500/10">
            <ComputerDesktopIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Pair This Desktop
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Enter the desktop ID provided by the admin
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm">
            <label htmlFor="desktop-id" className="sr-only">
              Desktop ID
            </label>
            <input
              id="desktop-id"
              name="desktop-id"
              type="text"
              autoComplete="off"
              required
              className="relative block w-full rounded-md border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm sm:leading-6"
              placeholder="e.g. LIB-001"
              value={desktopId}
              onChange={(e) => setDesktopId(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-2 rounded">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-emerald-600 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 disabled:opacity-60"
            >
              {loading ? "Pairing..." : "Pair Desktop"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

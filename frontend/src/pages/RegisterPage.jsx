import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { UserPlusIcon } from "@heroicons/react/24/solid";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    student_id: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [idFile, setIdFile] = useState(null);
  const [checkingId, setCheckingId] = useState(false);
  const [idCheckMessage, setIdCheckMessage] = useState("");
  const [idCheckSuccess, setIdCheckSuccess] = useState(false);
  const [useCamera, setUseCamera] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const idVerifiedRef = useRef(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const submitRegistration = async () => {
    if (!idFile) {
      setError("Please upload or capture your university ID");
      return;
    }

    if (!idVerifiedRef.current) {
      setError("Please verify your university ID before registering");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const payload = new FormData();
      payload.append("student_id", formData.student_id.trim());
      payload.append("name", formData.name.trim());
      payload.append("email", formData.email.trim());
      payload.append("password", formData.password);
      payload.append("id_image", idFile);

      await api.post("/students/", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const loginForm = new FormData();
      loginForm.append("username", formData.student_id.trim());
      loginForm.append("password", formData.password);
      const loginResponse = await api.post("/token", loginForm);
      localStorage.setItem("token", loginResponse.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setIdCheckMessage("");
    await submitRegistration();
  };

  const handleCheckId = async () => {
    setError("");
    setIdCheckMessage("");
    setIdCheckSuccess(false);
    idVerifiedRef.current = false;

    if (!idFile) {
      setError("Please upload or capture your university ID");
      return;
    }

    if (!formData.student_id.trim()) {
      setError("Please enter your Student ID");
      return;
    }

    setCheckingId(true);
    try {
      const payload = new FormData();
      payload.append("student_id", formData.student_id.trim());
      payload.append("id_image", idFile);

      const response = await api.post("/students/verify-id", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const matches = !!response.data?.matches;
      const extractedId = response.data?.extracted_id;
      if (matches) {
        setIdCheckSuccess(true);
        idVerifiedRef.current = true;
        setIdCheckMessage("ID verified. You can continue registration.");
        if (extractedId) {
          setFormData((prev) => ({
            ...prev,
            student_id: extractedId,
          }));
        }
        const fieldsReady =
          formData.name.trim() &&
          formData.email.trim() &&
          formData.password &&
          formData.confirmPassword;
        if (fieldsReady && formData.password === formData.confirmPassword) {
          await submitRegistration();
        }
      } else {
        setIdCheckSuccess(false);
        setIdCheckMessage(
          `ID mismatch. Detected: ${extractedId || "not found"}`,
        );
      }
    } catch (err) {
      setIdCheckSuccess(false);
      setIdCheckMessage(err.response?.data?.detail || "ID check failed");
    } finally {
      setCheckingId(false);
    }
  };

  useEffect(() => {
    let stream;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "environment",
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
        }
      } catch (err) {
        setError("Camera access denied");
      }
    };

    if (useCamera) {
      startCamera();
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      setCameraReady(false);
    };
  }, [useCamera]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], "student-id.png", { type: "image/png" });
      setIdFile(file);
    }, "image/png");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
        <div>
          <div className="mx-auto h-12 w-12 text-emerald-500 flex items-center justify-center rounded-full bg-emerald-500/10">
            <UserPlusIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Register to use the Library Desktop Pooling System
          </p>
        </div>
        <form className="mt-8 space-y-5" onSubmit={handleRegister}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="student_id"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Student ID
              </label>
              <input
                id="student_id"
                name="student_id"
                type="text"
                required
                pattern="ugr/\\d{4,6}/\\d{2}"
                title="Format: ugr/32337/15"
                className="relative block w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                placeholder="e.g., ugr/32337/15"
                value={formData.student_id}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-400">Format: ugr/32337/15</p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-gray-200">
                  University ID Verification
                </p>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setUseCamera(false)}
                    className={`px-3 py-1 rounded ${!useCamera ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCamera(true)}
                    className={`px-3 py-1 rounded ${useCamera ? "bg-emerald-600 text-white" : "bg-gray-700 text-gray-300"}`}
                  >
                    Camera
                  </button>
                </div>
              </div>

              {!useCamera && (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setIdFile(e.target.files?.[0] || null)}
                    className="block w-full text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-emerald-600 file:px-4 file:py-2 file:text-white file:font-medium hover:file:bg-emerald-500"
                  />
                  {idFile && (
                    <p className="mt-2 text-xs text-gray-400">
                      Selected: {idFile.name}
                    </p>
                  )}
                </div>
              )}

              {useCamera && (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg border border-gray-700"
                  />
                  <p className="text-xs text-gray-400">
                    Keep the ID flat, well-lit, and fill the frame.
                  </p>
                  <canvas ref={canvasRef} className="hidden" />
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={!cameraReady}
                    className="w-full rounded-md bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Capture ID
                  </button>
                  {idFile && (
                    <p className="text-xs text-gray-400">
                      Captured: {idFile.name}
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleCheckId}
                  disabled={checkingId}
                  className="w-full rounded-md bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {checkingId ? "Checking ID..." : "Check ID"}
                </button>
                {idCheckMessage && (
                  <p
                    className={`mt-2 text-xs ${idCheckSuccess ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {idCheckMessage}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="relative block w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="relative block w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="relative block w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
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
              className="group relative flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <UserPlusIcon
                  className="h-5 w-5 text-emerald-300 group-hover:text-emerald-100"
                  aria-hidden="true"
                />
              </span>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-400">Already have an account?</span>{" "}
            <Link
              to="/"
              className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

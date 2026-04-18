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
  });
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Registration info, 2: OTP Verification
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const getErrorMessage = (err, fallback) => {
    const detail = err?.response?.data?.detail;
    if (!detail) return fallback;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((item) => item?.msg || JSON.stringify(item)).join(", ");
    }
    return JSON.stringify(detail);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/students/", {
        student_id: formData.student_id.trim(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
      });
      
      setStep(2); // Move to OTP step on success
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.post("/students/verify-otp", {
        student_id: formData.student_id.trim(),
        otp: otp.trim(),
      });
      
      // Auto-login or redirect to login
      navigate("/?verified=true");
    } catch (err) {
      setError(getErrorMessage(err, "Verification failed"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="astu-shell flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="astu-content w-full max-w-md space-y-8 astu-card p-8 astu-anim-in">
        <div>
          <img
            src="/astu-logo.png"
            alt="ASTU logo"
            className="astu-logo mx-auto"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div className="mx-auto mt-4 h-12 w-12 text-emerald-500 flex items-center justify-center rounded-full bg-emerald-500/10">
            <UserPlusIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white astu-title">
            {step === 1 ? "Create your account" : "Verify your email"}
          </h2>
          <p className="mt-2 text-center text-sm astu-subtitle">
            {step === 1 
              ? "Register to use the Library Desktop Pooling System" 
              : `A verification code was sent to ${formData.email}`}
          </p>
        </div>

        {step === 1 ? (
          <form className="mt-8 space-y-5" onSubmit={handleRegister}>
            <div className="space-y-4">
              <div>
                <label htmlFor="student_id" className="block text-sm font-medium text-gray-300 mb-1">
                  Student ID
                </label>
                <input
                  id="student_id"
                  name="student_id"
                  type="text"
                  required
                  className="relative block w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                  placeholder="e.g., ugr/32337/15"
                  value={formData.student_id}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="relative block w-full rounded-lg border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-emerald-500 sm:text-sm"
                  placeholder="name@astu.edu.et"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
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
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-2 rounded">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? "Sending code..." : "Create account"}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-5" onSubmit={handleVerifyOtp}>
            <div className="space-y-4">
              <div className="text-center">
                <label htmlFor="otp" className="block text-sm font-medium text-gray-300 mb-3">
                  Verification Code
                </label>
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  required
                  autoFocus
                  className="block w-full text-center tracking-widest text-2xl font-bold rounded-lg border-0 bg-gray-700 py-4 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-emerald-500"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-2 rounded">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-lg bg-emerald-600 px-3 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify Account"}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-gray-400 hover:text-white transition-colors"
                disabled={loading}
              >
                Back to registration
              </button>
            </div>
          </form>
        )}

        {step === 1 && (
          <div className="text-center text-sm">
            <span className="text-gray-400">Already have an account?</span>{" "}
            <Link to="/" className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

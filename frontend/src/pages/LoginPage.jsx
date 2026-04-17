import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import api from "../api";
import { LockClosedIcon } from "@heroicons/react/24/solid";

export default function LoginPage({ role }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isVerified = searchParams.get("verified") === "true";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    try {
      const response = await api.post("/token", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      localStorage.setItem("token", response.data.access_token);

      const me = await api.get("/me");
      const isAdmin = !!me.data?.is_admin;

      // Role check constraint
      if (role === "admin" && !isAdmin) {
        localStorage.removeItem("token");
        setError("Admin access required. Please use student login instead.");
        return;
      }
      if (role === "student" && isAdmin) {
        localStorage.removeItem("token");
        setError("Administrators should use the admin login page.");
        return;
      }

      if (isAdmin) {
        navigate("/admin");
      } else {
        navigate("/select-library");
      }
    } catch (err) {
      setError("Invalid credentials. Please check your username and password.");
      console.error(err);
    }
  };

  return (
    <div className="astu-shell flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="astu-content w-full max-w-md space-y-8 astu-card p-8 astu-anim-in">
        <div>
          <img
            src="/astu-logo.svg"
            alt="ASTU logo"
            className="astu-logo mx-auto"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          <div className="mx-auto mt-4 h-12 w-12 text-blue-500 flex items-center justify-center rounded-full bg-blue-500/10">
            <LockClosedIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white astu-title">
            {role === "admin" ? "Admin Sign In" : "Student Sign In"}
          </h2>
          <p className="mt-2 text-center text-sm astu-subtitle">
            Access the Library Desktop Pooling System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="username" className="sr-only">
                {role === "admin" ? "Email Address" : "Student ID"}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="relative block w-full rounded-t-md border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                placeholder={role === "admin" ? "Email Address" : "Student ID"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-md border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center font-medium bg-red-500/10 py-2 rounded">
              {error}
            </div>
          )}

          {isVerified && !error && (
            <div className="text-emerald-500 text-sm text-center font-medium bg-emerald-500/10 py-2 rounded">
              Account verified successfully! Please sign in.
            </div>
          )}

          <div>
            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all duration-200"
            >
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <LockClosedIcon
                  className="h-5 w-5 text-blue-300 group-hover:text-blue-100"
                  aria-hidden="true"
                />
              </span>
              Sign in
            </button>
          </div>

          {role === "student" && (
            <div className="text-center text-sm">
              <span className="text-gray-400">Don't have an account?</span>{" "}
              <Link
                to="/register"
                className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Register here
              </Link>
            </div>
          )}

        </form>
      </div>
    </div>
  );
}


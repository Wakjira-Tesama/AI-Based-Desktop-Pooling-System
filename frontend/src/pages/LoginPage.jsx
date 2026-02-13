import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import { LockClosedIcon } from "@heroicons/react/24/solid";

export default function LoginPage({ role }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== "student") {
      return;
    }
    const pairedDesktopId = localStorage.getItem("paired_desktop_id");
    if (!pairedDesktopId) {
      navigate("/pair");
    }
  }, [navigate, role]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    const formData = new FormData();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const response = await api.post("/token", formData);
      localStorage.setItem("token", response.data.access_token);

      const me = await api.get("/me");
      const isAdmin = !!me.data?.is_admin;

      if (role === "admin" && !isAdmin) {
        localStorage.removeItem("token");
        setError("Admin access required. Use student login.");
        return;
      }

      if (role === "student" && isAdmin) {
        localStorage.removeItem("token");
        setError("Student access required. Use admin login.");
        return;
      }

      navigate(isAdmin ? "/admin" : "/dashboard");
    } catch (err) {
      setError("Invalid credentials");
      console.error(err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-700">
        <div>
          <div className="mx-auto h-12 w-12 text-blue-500 flex items-center justify-center rounded-full bg-blue-500/10">
            <LockClosedIcon className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-white">
            {role === "admin" ? "Admin sign in" : "Student sign in"}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Access the Library Desktop Pooling System
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-md border-0 bg-gray-700 py-3 px-3 text-white placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm sm:leading-6"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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

          {role !== "admin" && (
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
          <div className="text-center text-sm">
            {role === "admin" ? (
              <Link
                to="/student"
                className="font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                Student login
              </Link>
            ) : (
              <Link
                to="/admin-login"
                className="font-medium text-gray-400 hover:text-gray-200 transition-colors"
              >
                Admin login
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

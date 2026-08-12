import axios from "axios";

const baseURL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD
    ? "https://ai-based-desktop-pooling-system-1.onrender.com"
    : "http://localhost:8000")
).replace(/\/$/, "");

const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    const deviceId = localStorage.getItem("device_uuid");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (deviceId) {
      config.headers["X-Device-Id"] = deviceId;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;

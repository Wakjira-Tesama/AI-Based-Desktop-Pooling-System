import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Add a request interceptor to include the token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const deviceId = localStorage.getItem('device_uuid');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (deviceId) {
      config.headers['X-Device-Id'] = deviceId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

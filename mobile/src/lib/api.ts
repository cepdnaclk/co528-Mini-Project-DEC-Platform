import axios from 'axios';
import { API_URL } from '@/lib/config';

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  // Lazy import to avoid circular dependency
  const { useAuthStore } = require('@/store/authStore');
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (val: string) => void; reject: (err: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config as typeof err.config & { _retry?: boolean };
    if (err.response?.status !== 401 || original._retry) return Promise.reject(err);

    const { useAuthStore } = require('@/store/authStore');
    const { refreshToken, setAuth, logout, user } = useAuthStore.getState();

    if (!refreshToken) {
      logout();
      return Promise.reject(err);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((newToken) => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, { refreshToken });
      const newAccessToken: string = data.data.accessToken;
      const newRefreshToken: string = data.data.refreshToken;
      setAuth(newAccessToken, newRefreshToken, user!);
      processQueue(null, newAccessToken);
      original.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(original);
    } catch (refreshErr) {
      processQueue(refreshErr, null);
      logout();
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
            { refreshToken },
          );
          if (data?.accessToken) {
            localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) {
              localStorage.setItem('refreshToken', data.refreshToken);
            }
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return api(originalRequest);
          }
        } catch {
          // Token refresh failed; clear session
        }
      }
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** Extracts a friendly message from our backend's error shape. */
export function apiErrorMessage(err: unknown): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.message || anyErr?.message || 'Something went wrong. Please try again.';
}

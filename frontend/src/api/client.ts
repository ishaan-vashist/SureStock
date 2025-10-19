import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiError } from '../types';

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Inject x-user-id header
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const userId = import.meta.env.VITE_USER_ID || 'demo-user';
    config.headers['x-user-id'] = userId;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Error message mapping
const ERROR_MESSAGES: Record<number, string> = {
  400: 'Invalid request',
  404: 'Not found',
  409: 'Item went out of stock. Please adjust your cart.',
  410: 'Reservation expired. Please reserve again.',
  500: 'Server error. Please try again.',
};

// Response interceptor: Normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status || 500;
    const serverMessage = error.response?.data?.error || error.response?.data?.message;
    const message = serverMessage || ERROR_MESSAGES[status] || 'An error occurred';

    const apiError: ApiError = {
      status,
      message,
    };

    console.error('API Error:', apiError);
    return Promise.reject(apiError);
  }
);

export default apiClient;

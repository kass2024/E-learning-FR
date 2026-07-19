import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include the auth token with each request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// API functions for Admin Dashboard
export const dashboardApi = {
  getDashboardMetrics: async () => {
    try {
      const response = await api.get('/admin/dashboard/metrics');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  getEnrollmentsOverTime: async () => {
    try {
      const response = await api.get('/admin/dashboard/enrollments/over-time');
      return response.data;
    } catch (error) {
      console.error('Error fetching enrollments over time:', error);
      throw error;
    }
  },
};

export default api;

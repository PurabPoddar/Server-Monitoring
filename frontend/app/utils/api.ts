/**
 * API Client Utility
 * Axios instance with data mode support
 */

import axios from 'axios';
import { getDataMode } from './dataMode';

const API_BASE_URL = 'http://localhost:5001/api';

/**
 * Create an axios instance with automatic data mode header
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor to add data mode header
 */
apiClient.interceptors.request.use(
  (config) => {
    // Add data mode header to all requests
    const mode = getDataMode();
    
    // CRITICAL: Force set the header - make sure it's always set
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers['X-Data-Mode'] = mode;
    
    // Debug logging only in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url} - Mode: ${mode}`);
    }
    
    // Add auth token if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token && config.headers) {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor for error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Redirect to login if not authenticated
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Export API endpoints
export const api = {
  // Auth endpoints
  auth: {
    login: (credentials: { username: string; password: string }) =>
      axios.post(`${API_BASE_URL}/auth/login`, credentials),
    register: (data: { username: string; email: string; password: string }) =>
      axios.post(`${API_BASE_URL}/auth/register`, data),
    logout: () => apiClient.post('/auth/logout'),
  },
  
  // Server endpoints
  servers: {
    list: () => apiClient.get('/servers'),
    get: (id: number) => apiClient.get(`/servers/${id}`),
    register: (data: any) => apiClient.post('/servers', data),
    delete: (id: number) => apiClient.delete(`/servers/${id}`),
    getMetrics: (id: number, params?: { password?: string; port?: number }) => {
      // Ensure params is always an object, even if empty
      const queryParams = params || {};
      // Debug logging
      if (process.env.NODE_ENV === 'development') {
        console.log(`[getMetrics] Server ID: ${id}, Params:`, queryParams, 'Has password:', !!queryParams.password);
      }
      return apiClient.get(`/servers/${id}/metrics`, { params: queryParams });
    },
    getDetailedMetrics: (id: number, params?: { password?: string; port?: number }) =>
      apiClient.get(`/servers/${id}/detailed-metrics`, { params: params || {} }),
    executeCommand: (id: number, command: string, params?: { password?: string; port?: number }) =>
      apiClient.post(`/servers/${id}/execute-command`, { command, ...params }),
    restartService: (id: number, serviceName: string, params?: { password?: string; port?: number }) =>
      apiClient.post(`/servers/${id}/quick-actions/restart-service`, { service_name: serviceName, ...params }),
    startService: (id: number, serviceName: string, params?: { password?: string; port?: number }) =>
      apiClient.post(`/servers/${id}/quick-actions/start-service`, { service_name: serviceName, ...params }),
    stopService: (id: number, serviceName: string, params?: { password?: string; port?: number }) =>
      apiClient.post(`/servers/${id}/quick-actions/stop-service`, { service_name: serviceName, ...params }),
    healthCheck: (id: number, params?: { password?: string; port?: number }) =>
      apiClient.post(`/servers/${id}/quick-actions/health-check`, params || {}),
  },
  
  // User management endpoints
  users: {
    list: (serverId: number) => apiClient.get(`/servers/${serverId}/users`),
    create: (serverId: number, data: { newuser: string; newpass: string }) =>
      apiClient.post(`/servers/${serverId}/users`, data),
    delete: (serverId: number, username: string) =>
      apiClient.delete(`/servers/${serverId}/users/${username}`),
  },
  
  // VM control endpoints
  vm: {
    start: (name: string) => apiClient.post(`/vm/${name}/start`),
    stop: (name: string) => apiClient.post(`/vm/${name}/stop`),
    status: (name: string) => apiClient.get(`/vm/${name}/status`),
  },
};

export default apiClient;


/**
 * API Client - Routes Level
 * This file re-exports from the centralized API client with mode support
 */

import { api as centralizedApi, apiClient } from "../utils/api";

// Re-export the main API client
export default apiClient;

// Server registration
export const registerServer = (data: any) => centralizedApi.servers.register(data);

// Delete server
export const deleteServer = (id: string | number) => centralizedApi.servers.delete(Number(id));

// List servers (with automatic data mode)
export const fetchServers = () => centralizedApi.servers.list();

// Fetch metrics for a server (with automatic data mode)
export const fetchServerMetrics = (id: string | number, password?: string, port?: number) => {
  const params: any = {};
  
  // Only include password if it's a non-empty string
  // Empty strings, undefined, and null should not be included
  if (password && typeof password === 'string' && password.trim() !== '') {
    params.password = password;
  }
  if (port) {
    params.port = port;
  }
  
  // Ensure we're passing params object (even if empty, axios will handle it)
  const result = centralizedApi.servers.getMetrics(Number(id), params);
  
  // Log errors only
  result.catch(err => {
    if (process.env.NODE_ENV === 'development') {
      console.error('[fetchServerMetrics] Request failed:', err);
    }
  });
  
  return result;
};

// List users for a server (with automatic data mode)
export const fetchServerUsers = (id: string | number) => 
  centralizedApi.users.list(Number(id));

// Add user to a server
export const addServerUser = (id: string | number, data: any) => 
  centralizedApi.users.create(Number(id), data);

// Delete user from a server
export const deleteServerUser = (id: string | number, username: string) => 
  centralizedApi.users.delete(Number(id), username);

// Test connection directly (for registration form, before server is created)
export const testConnectionDirect = (data: {
  ip: string;
  os_type: string;
  username: string;
  password?: string;
  key_path?: string;
  port?: string | number;
  winrm_port?: string | number;
}) => apiClient.post("/test-connection", data);

// Test server connection (for existing servers)
export const testServerConnection = (id: string | number, password?: string, port?: number) => 
  apiClient.post(`/servers/${id}/test-connection`, { ...(password && { password }), ...(port && { port }) });

// Update server status
export const updateServerStatus = (id: string | number, status: string) => 
  apiClient.patch(`/servers/${id}/status`, { status });

// Fetch detailed metrics for a server
export const fetchDetailedMetrics = (id: string | number, password?: string, port?: number) => {
  const params: any = {};
  if (password) params.password = password;
  if (port) params.port = port;
  return centralizedApi.servers.getDetailedMetrics(Number(id), params);
};

// Execute command on server
export const executeServerCommand = (id: string | number, command: string, password?: string, port?: number) => {
  const params: any = {};
  if (password) params.password = password;
  if (port) params.port = port;
  return centralizedApi.servers.executeCommand(Number(id), command, params);
};

// Restart service on server
export const restartService = (id: string | number, serviceName: string, password?: string, port?: number) => {
  const params: any = {};
  if (password) params.password = password;
  if (port) params.port = port;
  return centralizedApi.servers.restartService(Number(id), serviceName, params);
};

// Start service on server
export const startService = (id: string | number, serviceName: string, password?: string, port?: number) => {
  const params: any = {};
  if (password) params.password = password;
  if (port) params.port = port;
  return centralizedApi.servers.startService(Number(id), serviceName, params);
};

// Stop service on server
export const stopService = (id: string | number, serviceName: string, password?: string, port?: number) => {
  const params: any = {};
  if (password) params.password = password;
  if (port) params.port = port;
  return centralizedApi.servers.stopService(Number(id), serviceName, params);
};

// Run health check on server
export const runHealthCheck = (id: string | number, password?: string, port?: number) => {
  const params: any = {};
  if (password) params.password = password;
  if (port) params.port = port;
  return centralizedApi.servers.healthCheck(Number(id), params);
};

// Start VM
export const startVM = (name: string) => centralizedApi.vm.start(name);

// Stop VM
export const stopVM = (name: string) => centralizedApi.vm.stop(name);


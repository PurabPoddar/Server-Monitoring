/**
 * API Client - Routes Level
 * This file re-exports from the centralized API client with mode support
 */

import { api as centralizedApi, apiClient } from "../utils/api";

// Re-export the main API client
export default apiClient;

// Server registration
export const registerServer = (data: any) => centralizedApi.servers.register(data);

// List servers (with automatic data mode)
export const fetchServers = () => centralizedApi.servers.list();

// Fetch metrics for a server (with automatic data mode)
export const fetchServerMetrics = (id: string | number, password?: string, port?: number) => {
  const params: any = {};
  if (password) params.password = password;
  if (port) params.port = port;
  return centralizedApi.servers.getMetrics(Number(id), params);
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

// Test server connection
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


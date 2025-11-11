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
export const fetchServerMetrics = (id: string | number) => 
  centralizedApi.servers.getMetrics(Number(id));

// List users for a server (with automatic data mode)
export const fetchServerUsers = (id: string | number) => 
  centralizedApi.users.list(Number(id));

// Add user to a server
export const addServerUser = (id: string | number, data: any) => 
  centralizedApi.users.create(Number(id), data);

// Delete user from a server
export const deleteServerUser = (id: string | number, username: string) => 
  centralizedApi.users.delete(Number(id), username);

// Start VM
export const startVM = (name: string) => centralizedApi.vm.start(name);

// Stop VM
export const stopVM = (name: string) => centralizedApi.vm.stop(name);


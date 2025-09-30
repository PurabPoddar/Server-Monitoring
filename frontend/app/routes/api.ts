import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Server registration
export const registerServer = (data: any) => api.post("/servers", data);
// List servers
export const fetchServers = () => api.get("/servers");
// Fetch metrics for a server
export const fetchServerMetrics = (id: string) => api.get(`/servers/${id}/metrics`);
// List users for a server
export const fetchServerUsers = (id: string) => api.get(`/servers/${id}/users`);
// Add user to a server
export const addServerUser = (id: string, data: any) => api.post(`/servers/${id}/users`, data);
// Delete user from a server
export const deleteServerUser = (id: string, username: string) => api.delete(`/servers/${id}/users/${username}`);
// Start VM
export const startVM = (name: string) => api.post(`/vm/${name}/start`);
// Stop VM
export const stopVM = (name: string) => api.post(`/vm/${name}/stop`);

export default api;


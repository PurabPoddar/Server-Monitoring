import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import {
  Computer,
  Add,
  Edit,
  Delete,
  Refresh,
  CheckCircle,
  Warning,
  Storage,
  Memory,
  NetworkCheck,
} from "@mui/icons-material";
import { fetchServers, fetchServerMetrics, fetchServerUsers, addServerUser, deleteServerUser } from "./api";

export default function Servers() {
  const [servers, setServers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ [id: string]: any }>({});
  const [users, setUsers] = useState<{ [id: string]: any[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });

  const loadServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchServers();
      setServers(response.data);
      
      // Load metrics and users for all servers
      for (const server of response.data) {
        try {
          const [metricsResponse, usersResponse] = await Promise.all([
            fetchServerMetrics(server.id),
            fetchServerUsers(server.id)
          ]);
          setMetrics(prev => ({ ...prev, [server.id]: metricsResponse.data }));
          setUsers(prev => ({ ...prev, [server.id]: usersResponse.data.users || [] }));
        } catch (err) {
          console.error(`Failed to load data for server ${server.id}:`, err);
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to load servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleAddUser = async () => {
    if (!selectedServer || !newUser.username) return;
    
    try {
      await addServerUser(selectedServer.id, newUser);
      setUsers(prev => ({
        ...prev,
        [selectedServer.id]: [...(prev[selectedServer.id] || []), newUser]
      }));
      setNewUser({ username: "", password: "" });
      setUserDialogOpen(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to add user");
    }
  };

  const handleDeleteUser = async (serverId: string, username: string) => {
    try {
      await deleteServerUser(serverId, username);
      setUsers(prev => ({
        ...prev,
        [serverId]: (prev[serverId] || []).filter(user => user.username !== username)
      }));
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to delete user");
    }
  };

  const getStatusColor = (status: string | null) => {
    const serverStatus = status || 'unknown';
    return serverStatus === 'online' ? 'success' : (serverStatus === 'offline' ? 'error' : 'warning');
  };

  const getStatusIcon = (status: string | null) => {
    const serverStatus = status || 'unknown';
    return serverStatus === 'online' ? <CheckCircle /> : <Warning />;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Servers...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          Registered Servers ({servers.length})
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadServers}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Server Overview Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 4 }}>
        {servers.map((server) => {
          const serverMetrics = metrics[server.id];
          const serverUsers = users[server.id] || [];
          
          return (
            <Box key={server.id}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                    <Typography variant="h6" component="div">
                      {server.name || server.hostname}
                    </Typography>
                    <Chip
                      label={server.status || 'unknown'}
                      color={getStatusColor(server.status)}
                      size="small"
                      icon={getStatusIcon(server.status)}
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {server.ip} • {server.os_type}
                  </Typography>
                  
                  {serverMetrics && (
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Memory sx={{ fontSize: 16, mr: 1 }} />
                        <Typography variant="caption">
                          CPU: {serverMetrics.cpu?.usage_percent?.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Storage sx={{ fontSize: 16, mr: 1 }} />
                        <Typography variant="caption">
                          Memory: {serverMetrics.memory?.usage_percent?.toFixed(1)}%
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <NetworkCheck sx={{ fontSize: 16, mr: 1 }} />
                        <Typography variant="caption">
                          Disk: {serverMetrics.disk?.usage_percent?.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Users: {serverUsers.length}
                  </Typography>
                  
                  <Box display="flex" gap={1}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Edit />}
                      onClick={() => {
                        setSelectedServer(server);
                        setUserDialogOpen(true);
                      }}
                    >
                      Manage Users
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      component={Link}
                      to={`/metrics?server=${server.id}`}
                    >
                      View Details
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          );
        })}
      </Box>

      {/* Detailed Server Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Server Details
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Hostname</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>OS Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>CPU Usage</TableCell>
                  <TableCell>Memory Usage</TableCell>
                  <TableCell>Disk Usage</TableCell>
                  <TableCell>Users</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {servers.map((server) => {
                  const serverMetrics = metrics[server.id];
                  const serverUsers = users[server.id] || [];
                  
                  return (
                    <TableRow key={server.id}>
                      <TableCell>{server.name || server.hostname}</TableCell>
                      <TableCell>{server.hostname}</TableCell>
                      <TableCell>{server.ip}</TableCell>
                      <TableCell>
                        <Chip 
                          label={server.os_type} 
                          size="small" 
                          color={server.os_type === 'linux' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={server.status || 'unknown'}
                          color={getStatusColor(server.status)}
                          size="small"
                          icon={getStatusIcon(server.status)}
                        />
                      </TableCell>
                      <TableCell>
                        {serverMetrics?.cpu?.usage_percent?.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {serverMetrics?.memory?.usage_percent?.toFixed(1)}%
                      </TableCell>
                      <TableCell>
                        {serverMetrics?.disk?.usage_percent?.toFixed(1)}%
                      </TableCell>
                      <TableCell>{serverUsers.length}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedServer(server);
                            setUserDialogOpen(true);
                          }}
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* User Management Dialog */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Manage Users - {selectedServer?.name || selectedServer?.hostname}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Add New User
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Username"
                value={newUser.username}
                onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              />
            </Box>
          </Box>
          
          <Typography variant="h6" gutterBottom>
            Existing Users ({(users[selectedServer?.id] || []).length})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Home Directory</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(users[selectedServer?.id] || []).map((user, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {user.username}
                        </Typography>
                        {user.uid && (
                          <Typography variant="caption" color="text.secondary">
                            UID: {user.uid}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{user.home_directory || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={user.status || 'active'} 
                        size="small" 
                        color={user.status === 'active' ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{user.last_login || 'N/A'}</Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteUser(selectedServer.id, user.username)}
                        title="Delete User"
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(users[selectedServer?.id] || []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary" py={2}>
                        No users found. Add a user to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddUser} variant="contained">
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

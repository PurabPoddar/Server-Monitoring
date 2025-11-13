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
  NetworkCheck as TestConnectionIcon,
} from "@mui/icons-material";
import { fetchServers, fetchServerMetrics, fetchServerUsers, addServerUser, deleteServerUser, testServerConnection, updateServerStatus } from "./api";

export default function Servers() {
  const [servers, setServers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ [id: string]: any }>({});
  const [users, setUsers] = useState<{ [id: string]: any[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", password: "" });
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testPassword, setTestPassword] = useState("");
  const [testPort, setTestPort] = useState("22");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const loadServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchServers();
      setServers(response.data);
      
      // Load metrics and users for all servers
      for (const server of response.data) {
        try {
          // For password auth servers, we need password to fetch metrics
          // For now, skip if password auth and no password available
          // User can use "Test Connection" which will load metrics
          let metricsResponse = null;
          if (server.auth_type === 'password' && server.ip === '127.0.0.1') {
            // For localhost test server, use default password
            try {
              metricsResponse = await fetchServerMetrics(server.id, 'testpass123', 2222);
            } catch (err) {
              console.error(`Failed to load metrics for server ${server.id}:`, err);
            }
          } else if (server.auth_type !== 'password') {
            // For key-based auth, try without password
            metricsResponse = await fetchServerMetrics(server.id);
          }
          
          if (metricsResponse) {
            setMetrics(prev => ({ ...prev, [server.id]: metricsResponse.data }));
          }
          
          // Try to load users (may fail if password needed)
          try {
            const usersResponse = await fetchServerUsers(server.id);
            setUsers(prev => ({ ...prev, [server.id]: usersResponse.data.users || [] }));
          } catch (err) {
            console.error(`Failed to load users for server ${server.id}:`, err);
          }
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
    // Removed auto-refresh - users can manually refresh or use polling on metrics page
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

  const handleTestConnection = async () => {
    if (!selectedServer) return;
    
    setTestingConnection(true);
    setTestResult(null);
    setError(null);
    
    try {
      const password = testPassword || undefined;
      const port = testPort ? parseInt(testPort) : 22;
      const response = await testServerConnection(selectedServer.id, password, port);
      
      setTestResult({
        success: response.data.success,
        message: response.data.message || "Connection test completed"
      });
      
      // Update server status in the list
      if (response.data.success) {
        setServers(prev => prev.map(s => 
          s.id === selectedServer.id 
            ? { ...s, status: response.data.status || 'online' }
            : s
        ));
        
        // Reload metrics for this server
        try {
          const port = testPort ? parseInt(testPort) : 22;
          const password = testPassword || (selectedServer.ip === '127.0.0.1' ? 'testpass123' : undefined);
          if (password) {
            const metricsResponse = await fetchServerMetrics(selectedServer.id, password, port);
            setMetrics(prev => ({ ...prev, [selectedServer.id]: metricsResponse.data }));
          }
        } catch (err) {
          console.error('Failed to reload metrics:', err);
        }
        
        // Reload servers to get updated status
        setTimeout(() => loadServers(), 1000);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.error || err?.response?.data?.message || err.message || "Connection test failed"
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const openTestDialog = (server: any) => {
    setSelectedServer(server);
    setTestPassword("");
    setTestPort("22");
    setTestResult(null);
    setTestDialogOpen(true);
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
      {servers.length === 0 ? (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Computer sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight="600">
              No Servers Registered Yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              Start monitoring your infrastructure by registering your first server. You can add Linux or Windows servers to track their performance and health.
            </Typography>
            <Button
              component={Link}
              to="/register"
              variant="contained"
              size="large"
              startIcon={<Add />}
            >
              Register Your First Server
            </Button>
          </CardContent>
        </Card>
      ) : (
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
                  
                  <Box display="flex" gap={1} flexWrap="wrap">
                    {server.os_type === "linux" && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        startIcon={<TestConnectionIcon />}
                        onClick={() => openTestDialog(server)}
                      >
                        Test Connection
                      </Button>
                    )}
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
      )}

      {/* Detailed Server Table */}
      {servers.length > 0 && (
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
      )}

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Test Connection - {selectedServer?.name || selectedServer?.hostname}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Test SSH connection to this server. If the server uses password authentication, enter the password below.
            </Typography>
            
            <TextField
              fullWidth
              type="number"
              label="SSH Port"
              value={testPort}
              onChange={(e) => setTestPort(e.target.value)}
              sx={{ mb: 2 }}
              helperText="SSH port (default: 22)"
              inputProps={{ min: 1, max: 65535 }}
            />
            
            {selectedServer?.auth_type === "password" && (
              <TextField
                fullWidth
                type="password"
                label="SSH Password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                sx={{ mb: 2 }}
                helperText="Enter password if server uses password authentication"
              />
            )}
            
            {selectedServer?.auth_type === "key" && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This server uses SSH key authentication. The stored key path will be used for testing.
              </Alert>
            )}
            
            {testResult && (
              <Alert 
                severity={testResult.success ? "success" : "error"} 
                sx={{ mb: 2 }}
              >
                {testResult.message}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Close</Button>
          <Button 
            onClick={handleTestConnection} 
            variant="contained"
            disabled={testingConnection}
            startIcon={testingConnection ? <CircularProgress size={20} /> : <TestConnectionIcon />}
          >
            {testingConnection ? "Testing..." : "Test Connection"}
          </Button>
        </DialogActions>
      </Dialog>

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

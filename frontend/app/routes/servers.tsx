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
import { fetchServers, fetchServerMetrics, fetchServerUsers, addServerUser, deleteServerUser, testServerConnection, updateServerStatus, deleteServer } from "./api";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serverToDelete, setServerToDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

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
          } else if (server.os_type === 'windows') {
            // Windows servers: try to auto-load if password is stored
            if (server.has_password) {
              // Server has stored password, try to fetch metrics automatically
              try {
                // Don't pass password/port - backend will use stored values
                metricsResponse = await fetchServerMetrics(server.id);
              } catch (err) {
                console.error(`Failed to auto-load metrics for Windows server ${server.id}:`, err);
              }
            }
            // If no stored password, user will need to use "Test Connection"
          } else if (server.os_type === 'linux') {
            // Linux servers: try to auto-load if credentials are stored
            if (server.has_password || server.key_path) {
              // Server has stored credentials, try to fetch metrics automatically
              try {
                // Don't pass password/port - backend will use stored values
                metricsResponse = await fetchServerMetrics(server.id);
              } catch (err) {
                console.error(`Failed to auto-load metrics for Linux server ${server.id}:`, err);
              }
            }
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
    
    // Check if we have stored credentials
    const hasStoredCredentials = selectedServer.has_password || 
      (selectedServer.os_type === "linux" && selectedServer.key_path);
    
    // Windows servers require password - check stored or provided
    if (selectedServer.os_type === "windows" && !testPassword && !selectedServer.has_password) {
      setTestResult({
        success: false,
        message: "Password is required for Windows servers. Please enter password or ensure it's stored."
      });
      return;
    }
    
    setTestingConnection(true);
    setTestResult(null);
    setError(null);
    
    try {
      // Use stored port or provided port
      const defaultPort = selectedServer.os_type === "windows" 
        ? (selectedServer.winrm_port || 5985)
        : (selectedServer.ssh_port || 22);
      const port = testPort ? parseInt(testPort) : defaultPort;
      // Only send password if manually provided (stored password will be used automatically)
      const password = testPassword && testPassword.trim() !== "" ? testPassword : undefined;
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
        
        // Reload metrics for this server after successful connection
        // Use stored credentials automatically - no need to pass password/port if stored
        try {
          // Stored credentials will be used automatically by the backend
          // Only pass password/port if manually provided (for override)
          // For Windows, only pass port if it's a valid WinRM port (5985 or 5986), not SSH port (22)
          let port: number | undefined = undefined;
          if (testPort) {
            const parsedPort = parseInt(testPort);
            if (selectedServer.os_type === "windows") {
              // Only pass port if it's a valid WinRM port (5985 or 5986)
              // Don't pass SSH port (22) - backend will use stored winrm_port
              if (parsedPort === 5985 || parsedPort === 5986) {
                port = parsedPort;
              }
              // If port is 22 or other invalid value, don't pass it - backend will use stored winrm_port
            } else {
              // For Linux, pass the port if provided
              port = parsedPort;
            }
          }
          const password = testPassword && testPassword.trim() !== "" ? testPassword : undefined;
          
          // Fetch metrics - backend will use stored credentials if password/port not provided
          const metricsResponse = await fetchServerMetrics(selectedServer.id, password, port);
          setMetrics(prev => ({ ...prev, [selectedServer.id]: metricsResponse.data }));
        } catch (err: any) {
          console.error('[Test Connection] Failed to reload metrics:', err);
          // Set error in metrics
          const errorMessage = err?.response?.data?.error || err.message || "Failed to load metrics";
          setMetrics(prev => ({ 
            ...prev, 
            [selectedServer.id]: { 
              error: errorMessage,
              requiresPassword: errorMessage.toLowerCase().includes("password"),
              details: err?.response?.data?.details
            } 
          }));
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
    // If credentials are stored, don't require manual entry
    if (server.has_password || (server.os_type === "linux" && server.key_path)) {
      setTestPassword(""); // Empty - will use stored credentials
    } else {
      setTestPassword("");
    }
    // Set default port from stored value or default
    const defaultPort = server.os_type === "windows" 
      ? (server.winrm_port || 5985) 
      : (server.ssh_port || 22);
    setTestPort(defaultPort.toString());
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

  const handleDeleteClick = (server: any) => {
    setServerToDelete(server);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!serverToDelete) return;
    
    setDeleting(true);
    setError(null);
    
    try {
      await deleteServer(serverToDelete.id);
      // Remove server from local state
      setServers(prev => prev.filter(s => s.id !== serverToDelete.id));
      // Remove metrics and users for deleted server
      setMetrics(prev => {
        const newMetrics = { ...prev };
        delete newMetrics[serverToDelete.id];
        return newMetrics;
      });
      setUsers(prev => {
        const newUsers = { ...prev };
        delete newUsers[serverToDelete.id];
        return newUsers;
      });
      setDeleteDialogOpen(false);
      setServerToDelete(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to delete server");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setServerToDelete(null);
  };

  const handleLoadMetrics = async (server: any) => {
    try {
      setError(null);
      // For Windows servers, try to use stored password
      let password: string | undefined = undefined;
      let port: number | undefined = undefined;
      
      if (server.os_type === 'windows') {
        // Windows servers need password - check if stored
        if (server.has_password) {
          // Use stored password
          port = server.winrm_port || 5985;
        } else {
          // No stored password - show message
          setError(`Password required for Windows server. Please use "Test Connection" to provide password.`);
          return;
        }
      } else if (server.auth_type === 'password') {
        // Linux with password auth - might need password
        if (server.ip === '127.0.0.1') {
          password = 'testpass123';
          port = 2222;
        }
      }
      
      const metricsResponse = await fetchServerMetrics(server.id, password, port);
      setMetrics(prev => ({ ...prev, [server.id]: metricsResponse.data }));
    } catch (err: any) {
      console.error(`Failed to load metrics for server ${server.id}:`, err);
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || err.message || "Failed to load metrics";
      setMetrics(prev => ({
        ...prev,
        [server.id]: {
          error: errorMsg,
          requiresPassword: errorMsg.toLowerCase().includes("password")
        }
      }));
    }
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
                  
                  {serverMetrics && !serverMetrics.error ? (
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Memory sx={{ fontSize: 16, mr: 1 }} />
                        <Typography variant="caption">
                          CPU: {serverMetrics.cpu?.usage_percent !== undefined 
                            ? `${serverMetrics.cpu.usage_percent.toFixed(1)}%`
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Storage sx={{ fontSize: 16, mr: 1 }} />
                        <Typography variant="caption">
                          Memory: {serverMetrics.memory?.usage_percent !== undefined 
                            ? `${serverMetrics.memory.usage_percent.toFixed(1)}%`
                            : 'N/A'}
                        </Typography>
                      </Box>
                      <Box display="flex" alignItems="center" mb={1}>
                        <NetworkCheck sx={{ fontSize: 16, mr: 1 }} />
                        <Typography variant="caption">
                          Disk: {serverMetrics.disk?.usage_percent !== undefined 
                            ? `${serverMetrics.disk.usage_percent.toFixed(1)}%`
                            : 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  ) : serverMetrics?.error ? (
                    <Alert severity="error" sx={{ mb: 2, py: 0.5 }}>
                      <Typography variant="caption">
                        {serverMetrics.error}
                      </Typography>
                    </Alert>
                  ) : (
                    <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
                      <Typography variant="caption">
                        Metrics not loaded. Use "Test Connection" or "View Details" to load metrics.
                      </Typography>
                    </Alert>
                  )}
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Users: {serverUsers.length}
                  </Typography>
                  
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Button
                      size="small"
                      variant="outlined"
                      color="primary"
                      startIcon={<TestConnectionIcon />}
                      onClick={() => openTestDialog(server)}
                    >
                      Test Connection
                    </Button>
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
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Delete />}
                      onClick={() => handleDeleteClick(server)}
                    >
                      Delete
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
                        {serverMetrics?.cpu?.usage_percent !== undefined 
                          ? `${serverMetrics.cpu.usage_percent.toFixed(1)}%`
                          : serverMetrics?.error 
                            ? <Typography variant="caption" color="error">Error</Typography>
                            : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                      </TableCell>
                      <TableCell>
                        {serverMetrics?.memory?.usage_percent !== undefined 
                          ? `${serverMetrics.memory.usage_percent.toFixed(1)}%`
                          : serverMetrics?.error 
                            ? <Typography variant="caption" color="error">Error</Typography>
                            : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                      </TableCell>
                      <TableCell>
                        {serverMetrics?.disk?.usage_percent !== undefined 
                          ? `${serverMetrics.disk.usage_percent.toFixed(1)}%`
                          : serverMetrics?.error 
                            ? <Typography variant="caption" color="error">Error</Typography>
                            : <Typography variant="caption" color="text.secondary">N/A</Typography>}
                      </TableCell>
                      <TableCell>{serverUsers.length}</TableCell>
                      <TableCell>
                        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                          {(!serverMetrics || serverMetrics?.error) && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleLoadMetrics(server)}
                              title="Load Metrics"
                              sx={{ minWidth: 'auto', fontSize: '0.75rem', px: 1 }}
                            >
                              Load Metrics
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedServer(server);
                              setUserDialogOpen(true);
                            }}
                            title="Manage Users"
                          >
                            <Edit />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteClick(server)}
                            title="Delete Server"
                          >
                            <Delete />
                          </IconButton>
                        </Box>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Server</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Are you sure you want to delete the server <strong>{serverToDelete?.name || serverToDelete?.hostname}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This action cannot be undone. All server data, metrics, and user information will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={20} /> : <Delete />}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Connection Dialog */}
      <Dialog open={testDialogOpen} onClose={() => setTestDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Test Connection - {selectedServer?.name || selectedServer?.hostname}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {(selectedServer?.has_password || (selectedServer?.os_type === "linux" && selectedServer?.key_path)) && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Stored credentials will be used automatically. You can override by entering password/port below.
              </Alert>
            )}
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {selectedServer?.os_type === "windows" 
                ? "Test WinRM connection to this Windows server. Password will be used from stored credentials if available."
                : "Test SSH connection to this server. Credentials will be used from stored values if available."}
            </Typography>
            
            <TextField
              fullWidth
              type="number"
              label={selectedServer?.os_type === "windows" ? "WinRM Port (optional)" : "SSH Port (optional)"}
              value={testPort}
              onChange={(e) => setTestPort(e.target.value)}
              sx={{ mb: 2 }}
              helperText={selectedServer?.os_type === "windows" 
                ? `WinRM port (stored: ${selectedServer?.winrm_port || 5985}, leave empty to use stored)`
                : `SSH port (stored: ${selectedServer?.ssh_port || 22}, leave empty to use stored)`}
              inputProps={{ min: 1, max: 65535 }}
            />
            
            {(selectedServer?.auth_type === "password" || selectedServer?.os_type === "windows") && (
              <TextField
                fullWidth
                type="password"
                label={selectedServer?.os_type === "windows" ? "Windows Password (optional)" : "SSH Password (optional)"}
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                sx={{ mb: 2 }}
                helperText={selectedServer?.os_type === "windows"
                  ? selectedServer?.has_password 
                    ? "Leave empty to use stored password, or enter to override"
                    : "Enter Windows administrator password"
                  : selectedServer?.has_password
                    ? "Leave empty to use stored password, or enter to override"
                    : "Enter password if server uses password authentication"}
                required={selectedServer?.os_type === "windows" && !selectedServer?.has_password}
              />
            )}
            
            {selectedServer?.auth_type === "key" && selectedServer?.os_type === "linux" && (
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

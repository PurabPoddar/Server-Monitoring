import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Avatar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Switch,
  FormControlLabel,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import {
  Computer,
  Memory,
  Storage,
  NetworkCheck,
  Warning,
  CheckCircle,
  Refresh,
  Speed,
  Storage as HardDrive,
  ExpandMore,
  Timeline,
  Add,
  PlayArrow,
  RestartAlt,
  HealthAndSafety,
  Terminal,
  Info,
  TableChart,
  PlayCircle,
  StopCircle,
} from "@mui/icons-material";
import { fetchServers, fetchServerMetrics, fetchDetailedMetrics, executeServerCommand, restartService, startService, stopService, runHealthCheck } from "./api";

export default function Metrics() {
  const [searchParams] = useSearchParams();
  const [servers, setServers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ [id: string]: any }>({});
  const [detailedMetrics, setDetailedMetrics] = useState<{ [id: string]: any }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | false>(false);
  const [pollingEnabled, setPollingEnabled] = useState<Set<number>>(new Set());
  const pollingIntervalsRef = useRef<{ [id: number]: NodeJS.Timeout }>({});
  const pollingEnabledRef = useRef<Set<number>>(new Set());
  const serversRef = useRef<any[]>([]);
  
  // Quick Actions state
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [startServiceDialogOpen, setStartServiceDialogOpen] = useState(false);
  const [stopServiceDialogOpen, setStopServiceDialogOpen] = useState(false);
  const [healthCheckDialogOpen, setHealthCheckDialogOpen] = useState(false);
  const [currentServer, setCurrentServer] = useState<any>(null);
  const [commandInput, setCommandInput] = useState("");
  const [serviceInput, setServiceInput] = useState("");
  const [startServiceInput, setStartServiceInput] = useState("");
  const [stopServiceInput, setStopServiceInput] = useState("");
  const [commandResult, setCommandResult] = useState<any>(null);
  const [serviceResult, setServiceResult] = useState<any>(null);
  const [startServiceResult, setStartServiceResult] = useState<any>(null);
  const [stopServiceResult, setStopServiceResult] = useState<any>(null);
  const [healthCheckResult, setHealthCheckResult] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [detailedMetricsTab, setDetailedMetricsTab] = useState<{ [id: number]: number }>({});
  const [quickActionsExpanded, setQuickActionsExpanded] = useState<{ [id: number]: boolean }>({});
  const [detailedMetricsExpanded, setDetailedMetricsExpanded] = useState<{ [id: number]: boolean }>({});
  
  // Password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordServer, setPasswordServer] = useState<any>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordPort, setPasswordPort] = useState("22");

  // Helper to get stored password for a server
  const getStoredPassword = (serverId: number): string | null => {
    if (typeof window === 'undefined') return null;
    const key = `server_password_${serverId}`;
    return sessionStorage.getItem(key);
  };

  // Helper to store password for a server
  const storePassword = (serverId: number, password: string) => {
    if (typeof window === 'undefined') return;
    const key = `server_password_${serverId}`;
    sessionStorage.setItem(key, password);
  };

  const loadServerMetrics = async (server: any, password?: string, port?: number) => {
    try {
      // For password auth localhost servers, use default password
      if (server.auth_type === 'password' && server.ip === '127.0.0.1') {
        const metricsResponse = await fetchServerMetrics(server.id, 'testpass123', 2222);
        setMetrics(prev => ({ ...prev, [server.id]: metricsResponse.data }));
      } else if (server.auth_type !== 'password') {
        // Key-based authentication - no password needed
        const metricsResponse = await fetchServerMetrics(server.id);
        setMetrics(prev => ({ ...prev, [server.id]: metricsResponse.data }));
      } else {
        // Password-based auth - check for stored password or use provided password
        const storedPassword = password || getStoredPassword(server.id);
        const sshPort = port || 22;
        
        if (!storedPassword) {
          // No password available - prompt user
          setPasswordServer(server);
          setPasswordDialogOpen(true);
          setMetrics(prev => ({ 
            ...prev, 
            [server.id]: { 
              error: "Password required",
              requiresPassword: true 
            } 
          }));
          return;
        }
        
        // Try to fetch metrics with password
        try {
          const metricsResponse = await fetchServerMetrics(server.id, storedPassword, sshPort);
          setMetrics(prev => ({ ...prev, [server.id]: metricsResponse.data }));
        } catch (err: any) {
          const errorMsg = err?.response?.data?.error || err?.message || 'Unknown error';
          console.error(`[Metrics] Failed to load metrics for server ${server.id}: ${errorMsg}`);
          
          // If authentication failed, clear stored password and prompt again
          if (errorMsg.includes('password') || errorMsg.includes('authentication') || errorMsg.includes('key_path')) {
            sessionStorage.removeItem(`server_password_${server.id}`);
            setPasswordServer(server);
            setPasswordDialogOpen(true);
          }
          
          setMetrics(prev => ({ 
            ...prev, 
            [server.id]: { 
              error: errorMsg,
              requiresPassword: true 
            } 
          }));
        }
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.message || 'Unknown error';
      console.error(`[Metrics] Failed to load metrics for server ${server.id}: ${errorMsg}`);
    }
  };

  const handlePasswordSubmit = () => {
    if (!passwordServer || !passwordInput) return;
    
    // Store password for this session
    storePassword(passwordServer.id, passwordInput);
    
    // Close dialog and reload metrics
    setPasswordDialogOpen(false);
    const port = parseInt(passwordPort) || 22;
    loadServerMetrics(passwordServer, passwordInput, port);
    
    // Clear form
    setPasswordInput("");
    setPasswordPort("22");
    setPasswordServer(null);
  };

  const loadDetailedMetrics = async (server: any) => {
    try {
      let response;
      if (server.auth_type === 'password' && server.ip === '127.0.0.1') {
        response = await fetchDetailedMetrics(server.id, 'testpass123', 2222);
      } else if (server.auth_type !== 'password') {
        response = await fetchDetailedMetrics(server.id);
      } else {
        return; // Skip if password auth but not localhost
      }
      setDetailedMetrics(prev => ({ ...prev, [server.id]: response.data }));
    } catch (err) {
      console.error(`Failed to load detailed metrics for server ${server.id}:`, err);
    }
  };

  const handleExecuteCommand = async () => {
    if (!currentServer || !commandInput.trim()) return;
    
    setActionLoading(true);
    try {
      let response;
      if (currentServer.auth_type === 'password' && currentServer.ip === '127.0.0.1') {
        response = await executeServerCommand(currentServer.id, commandInput, 'testpass123', 2222);
      } else if (currentServer.auth_type !== 'password') {
        response = await executeServerCommand(currentServer.id, commandInput);
      } else {
        setCommandResult({ success: false, error: "Password authentication not supported for command execution" });
        setActionLoading(false);
        return;
      }
      setCommandResult(response.data);
    } catch (err: any) {
      setCommandResult({ success: false, error: err?.response?.data?.error || err.message || "Command execution failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestartService = async () => {
    if (!currentServer || !serviceInput.trim()) return;
    
    setActionLoading(true);
    try {
      let response;
      if (currentServer.auth_type === 'password' && currentServer.ip === '127.0.0.1') {
        response = await restartService(currentServer.id, serviceInput, 'testpass123', 2222);
      } else if (currentServer.auth_type !== 'password') {
        response = await restartService(currentServer.id, serviceInput);
      } else {
        setServiceResult({ success: false, error: "Password authentication not supported for service restart" });
        setActionLoading(false);
        return;
      }
      setServiceResult(response.data);
    } catch (err: any) {
      setServiceResult({ success: false, error: err?.response?.data?.error || err.message || "Service restart failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartService = async () => {
    if (!currentServer || !startServiceInput.trim()) return;
    
    setActionLoading(true);
    try {
      let response;
      if (currentServer.auth_type === 'password' && currentServer.ip === '127.0.0.1') {
        response = await startService(currentServer.id, startServiceInput, 'testpass123', 2222);
      } else if (currentServer.auth_type !== 'password') {
        response = await startService(currentServer.id, startServiceInput);
      } else {
        setStartServiceResult({ success: false, error: "Password authentication not supported for service start" });
        setActionLoading(false);
        return;
      }
      setStartServiceResult(response.data);
    } catch (err: any) {
      setStartServiceResult({ success: false, error: err?.response?.data?.error || err.message || "Service start failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopService = async () => {
    if (!currentServer || !stopServiceInput.trim()) return;
    
    setActionLoading(true);
    try {
      let response;
      if (currentServer.auth_type === 'password' && currentServer.ip === '127.0.0.1') {
        response = await stopService(currentServer.id, stopServiceInput, 'testpass123', 2222);
      } else if (currentServer.auth_type !== 'password') {
        response = await stopService(currentServer.id, stopServiceInput);
      } else {
        setStopServiceResult({ success: false, error: "Password authentication not supported for service stop" });
        setActionLoading(false);
        return;
      }
      setStopServiceResult(response.data);
    } catch (err: any) {
      setStopServiceResult({ success: false, error: err?.response?.data?.error || err.message || "Service stop failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleHealthCheck = async () => {
    if (!currentServer) return;
    
    setActionLoading(true);
    try {
      let response;
      if (currentServer.auth_type === 'password' && currentServer.ip === '127.0.0.1') {
        response = await runHealthCheck(currentServer.id, 'testpass123', 2222);
      } else if (currentServer.auth_type !== 'password') {
        response = await runHealthCheck(currentServer.id);
      } else {
        setHealthCheckResult({ error: "Password authentication not supported for health check" });
        setActionLoading(false);
        return;
      }
      setHealthCheckResult(response.data);
    } catch (err: any) {
      setHealthCheckResult({ error: err?.response?.data?.error || err.message || "Health check failed" });
    } finally {
      setActionLoading(false);
    }
  };

  const loadServers = async (showLoading: boolean = true, loadMetrics: boolean = false) => {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      const response = await fetchServers();
      setServers(response.data);
      serversRef.current = response.data; // Update ref with latest servers
      
      // Only load metrics if explicitly requested (not on every searchParams change)
      if (loadMetrics) {
        for (const server of response.data) {
          await loadServerMetrics(server);
        }
      }
      
      // Auto-expand specific server if server ID is in URL
      const serverId = searchParams.get('server');
      if (serverId) {
        setExpanded(`panel${serverId}`);
        // Scroll to the server after a brief delay to ensure rendering
        setTimeout(() => {
          const element = document.getElementById(`server-${serverId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to load servers");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const togglePolling = (serverId: number) => {
    setPollingEnabled(prev => {
      const newSet = new Set(prev);
      
      // Update ref immediately
      pollingEnabledRef.current = new Set(prev);
      
      if (newSet.has(serverId)) {
        // Disable polling - STOP all intervals for this server
        console.log(`[Polling] Disabling polling for server ${serverId}`);
        newSet.delete(serverId);
        pollingEnabledRef.current.delete(serverId);
        
        // Clear ALL intervals for this server (in case multiple were created)
        if (pollingIntervalsRef.current[serverId]) {
          console.log(`[Polling] Clearing interval for server ${serverId}`);
          clearInterval(pollingIntervalsRef.current[serverId]);
          delete pollingIntervalsRef.current[serverId];
        }
        
        // Double-check: clear any remaining intervals
        Object.keys(pollingIntervalsRef.current).forEach(key => {
          const id = parseInt(key);
          if (id === serverId && pollingIntervalsRef.current[id]) {
            console.log(`[Polling] Force clearing interval for server ${serverId}`);
            clearInterval(pollingIntervalsRef.current[id]);
            delete pollingIntervalsRef.current[id];
          }
        });
      } else {
        // Enable polling
        console.log(`[Polling] Enabling polling for server ${serverId}`);
        
        // First, make sure any existing interval is cleared
        if (pollingIntervalsRef.current[serverId]) {
          console.log(`[Polling] Clearing existing interval before creating new one for server ${serverId}`);
          clearInterval(pollingIntervalsRef.current[serverId]);
          delete pollingIntervalsRef.current[serverId];
        }
        
        newSet.add(serverId);
        pollingEnabledRef.current.add(serverId);
        
        // Find the server from ref (always up-to-date)
        const server = serversRef.current.find(s => s.id === serverId);
        if (server) {
          // Start polling every 5 seconds
          const interval = setInterval(() => {
            // Check if polling is still enabled for this server using ref (always current)
            if (!pollingEnabledRef.current.has(serverId)) {
              console.log(`[Polling] Polling disabled for server ${serverId}, stopping interval`);
              clearInterval(interval);
              delete pollingIntervalsRef.current[serverId];
              return;
            }
            
            // Get fresh server data from ref
            const currentServer = serversRef.current.find(s => s.id === serverId);
            if (currentServer) {
              console.log(`[Polling] Fetching metrics for server ${serverId}`);
              loadServerMetrics(currentServer);
            }
          }, 5000);
          pollingIntervalsRef.current[serverId] = interval;
          console.log(`[Polling] Created interval for server ${serverId}`);
        }
      }
      return newSet;
    });
  };

  const isInitialMount = useRef(true);

  useEffect(() => {
    // On initial mount, only load server list (NO metrics)
    // On searchParams change, only reload server list (not metrics)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadServers(true, false); // Load servers list only, NO metrics on initial mount
    } else {
      loadServers(false, false); // Only reload server list, no metrics, no loading spinner
    }
  }, [searchParams]);

  // Cleanup all intervals on unmount
  useEffect(() => {
    return () => {
      // Cleanup all polling intervals when component unmounts
      Object.values(pollingIntervalsRef.current).forEach(interval => {
        if (interval) clearInterval(interval);
      });
      pollingIntervalsRef.current = {};
    };
  }, []);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const getHealthStatus = (value: number) => {
    if (value < 50) return { status: 'Healthy', color: 'success' };
    if (value < 80) return { status: 'Warning', color: 'warning' };
    return { status: 'Critical', color: 'error' };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Server Metrics...
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          Server Metrics & Analytics
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => loadServers(false, true)}
        >
          Refresh Data
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
        Individual Server Metrics
      </Typography>

      {/* Server Accordions */}
      {servers.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 8, textAlign: 'center' }}>
            <Timeline sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
            <Typography variant="h5" gutterBottom fontWeight="600">
              No Metrics Available
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
              Register servers to start collecting and analyzing their performance metrics, resource usage, and health data.
            </Typography>
            <Button
              component={Link}
              to="/register"
              variant="contained"
              size="large"
              startIcon={<Add />}
            >
              Register a Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        servers.map((server) => {
        const serverMetrics = metrics[server.id];
        const serverStatus = server.status || 'unknown';
        const statusColor = serverStatus === 'online' ? 'success' : (serverStatus === 'offline' ? 'error' : 'warning');
        const cpuHealth = getHealthStatus(serverMetrics?.cpu?.usage_percent || 0);
        const memoryHealth = getHealthStatus(serverMetrics?.memory?.usage_percent || 0);
        const diskHealth = getHealthStatus(serverMetrics?.disk?.usage_percent || 0);

        return (
          <Accordion
            key={server.id}
            id={`server-${server.id}`}
            expanded={expanded === `panel${server.id}`}
            onChange={handleChange(`panel${server.id}`)}
            sx={{ mb: 2 }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore />}
              aria-controls={`panel${server.id}bh-content`}
              id={`panel${server.id}bh-header`}
            >
              <Box display="flex" alignItems="center" width="100%" gap={2}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Computer />
                </Avatar>
                <Box flex={1}>
                  <Typography variant="h6">
                    {server.name || server.hostname}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {server.ip} • {server.os_type}
                  </Typography>
                </Box>
                <Chip
                  label={serverStatus}
                  color={statusColor}
                  size="small"
                  icon={serverStatus === 'online' ? <CheckCircle /> : <Warning />}
                />
                <Box display="flex" alignItems="center" gap={1}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadServerMetrics(server);
                    }}
                    title="Refresh metrics"
                  >
                    <Refresh fontSize="small" />
                  </IconButton>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={pollingEnabled.has(server.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          togglePolling(server.id);
                        }}
                        size="small"
                      />
                    }
                    label={pollingEnabled.has(server.id) ? "Polling ON" : "Polling OFF"}
                    onClick={(e) => e.stopPropagation()}
                    sx={{ m: 0 }}
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3} sx={{ width: '100%' }}>
                {/* CPU Metrics */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Speed sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="h6">CPU Usage</Typography>
                      </Box>
                      <Typography variant="h3" color={cpuHealth.color}>
                        {serverMetrics?.cpu?.usage_percent?.toFixed(1) || 0}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={serverMetrics?.cpu?.usage_percent || 0}
                        color={cpuHealth.color as any}
                        sx={{ height: 8, borderRadius: 4, my: 2 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Cores: {Array.isArray(serverMetrics?.cpu?.cores) 
                          ? serverMetrics.cpu.cores.length 
                          : serverMetrics?.cpu?.cores || 'N/A'}
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          label={cpuHealth.status}
                          color={cpuHealth.color as any}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Memory Metrics */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Memory sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="h6">Memory Usage</Typography>
                      </Box>
                      <Typography variant="h3" color={memoryHealth.color}>
                        {serverMetrics?.memory?.usage_percent?.toFixed(1) || 0}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={serverMetrics?.memory?.usage_percent || 0}
                        color={memoryHealth.color as any}
                        sx={{ height: 8, borderRadius: 4, my: 2 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Used: {(serverMetrics?.memory?.used_gb || 0).toFixed(2)} GB / {(serverMetrics?.memory?.total_gb || 0).toFixed(2)} GB
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          label={memoryHealth.status}
                          color={memoryHealth.color as any}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Disk Metrics */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <HardDrive sx={{ color: 'primary.main', mr: 1 }} />
                        <Typography variant="h6">Disk Usage</Typography>
                      </Box>
                      <Typography variant="h3" color={diskHealth.color}>
                        {serverMetrics?.disk?.usage_percent?.toFixed(1) || 0}%
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={serverMetrics?.disk?.usage_percent || 0}
                        color={diskHealth.color as any}
                        sx={{ height: 8, borderRadius: 4, my: 2 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        Used: {(serverMetrics?.disk?.used_gb || 0).toFixed(2)} GB / {(serverMetrics?.disk?.total_gb || 0).toFixed(2)} GB
                      </Typography>
                      <Box mt={1}>
                        <Chip
                          label={diskHealth.status}
                          color={diskHealth.color as any}
                          size="small"
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Network Metrics */}
                {serverMetrics?.network && (
                  <Grid item xs={12}>
                    <Card>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <NetworkCheck sx={{ color: 'primary.main', mr: 1 }} />
                          <Typography variant="h6">Network Activity</Typography>
                        </Box>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Bytes Sent
                            </Typography>
                            <Typography variant="h6">
                              {serverMetrics?.network?.bytes_sent 
                                ? (serverMetrics.network.bytes_sent / 1024 / 1024).toFixed(2) 
                                : '0.00'} MB
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Bytes Received
                            </Typography>
                            <Typography variant="h6">
                              {serverMetrics?.network?.bytes_recv 
                                ? (serverMetrics.network.bytes_recv / 1024 / 1024).toFixed(2) 
                                : '0.00'} MB
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

                {/* Quick Actions */}
                <Grid item xs={12} sx={{ width: '100%', flexBasis: '100%', maxWidth: '100%' }}>
                  <Accordion
                    expanded={quickActionsExpanded[server.id] || false}
                    onChange={(e, isExpanded) => {
                      setQuickActionsExpanded(prev => ({ ...prev, [server.id]: isExpanded }));
                    }}
                    sx={{ 
                      mb: 2,
                      '&:before': { display: 'none' },
                      boxShadow: 1,
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMore />}
                      sx={{
                        px: 2,
                        py: 1.5,
                        '&:hover': { bgcolor: 'action.hover' },
                        minHeight: 56,
                        '&.Mui-expanded': { minHeight: 56 }
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <PlayArrow sx={{ color: 'primary.main', fontSize: 24 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Quick Actions
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 3, py: 3, bgcolor: 'background.default' }}>
                      <Grid container spacing={2.5}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Terminal />}
                            onClick={() => {
                              setCurrentServer(server);
                              setCommandInput("");
                              setCommandResult(null);
                              setCommandDialogOpen(true);
                            }}
                            disabled={server.os_type !== 'linux'}
                            sx={{
                              py: 1.5,
                              fontSize: '0.95rem',
                              fontWeight: 500,
                              textTransform: 'none',
                              boxShadow: 2,
                              '&:hover': { boxShadow: 4 }
                            }}
                          >
                            Execute Command
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="success"
                            startIcon={<PlayCircle />}
                            onClick={() => {
                              setCurrentServer(server);
                              setStartServiceInput("");
                              setStartServiceResult(null);
                              setStartServiceDialogOpen(true);
                            }}
                            disabled={server.os_type !== 'linux'}
                            sx={{
                              py: 1.5,
                              fontSize: '0.95rem',
                              fontWeight: 500,
                              textTransform: 'none',
                              boxShadow: 2,
                              '&:hover': { boxShadow: 4 }
                            }}
                          >
                            Start Service
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="error"
                            startIcon={<StopCircle />}
                            onClick={() => {
                              setCurrentServer(server);
                              setStopServiceInput("");
                              setStopServiceResult(null);
                              setStopServiceDialogOpen(true);
                            }}
                            disabled={server.os_type !== 'linux'}
                            sx={{
                              py: 1.5,
                              fontSize: '0.95rem',
                              fontWeight: 500,
                              textTransform: 'none',
                              boxShadow: 2,
                              '&:hover': { boxShadow: 4 }
                            }}
                          >
                            Stop Service
                          </Button>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="secondary"
                            startIcon={<RestartAlt />}
                            onClick={() => {
                              setCurrentServer(server);
                              setServiceInput("");
                              setServiceResult(null);
                              setServiceDialogOpen(true);
                            }}
                            disabled={server.os_type !== 'linux'}
                            sx={{
                              py: 1.5,
                              fontSize: '0.95rem',
                              fontWeight: 500,
                              textTransform: 'none',
                              boxShadow: 2,
                              '&:hover': { boxShadow: 4 }
                            }}
                          >
                            Restart Service
                          </Button>
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            fullWidth
                            variant="contained"
                            color="info"
                            startIcon={<HealthAndSafety />}
                            onClick={async () => {
                              setCurrentServer(server);
                              setHealthCheckResult(null);
                              setHealthCheckDialogOpen(true);
                              setActionLoading(true);
                              try {
                                let response;
                                if (server.auth_type === 'password' && server.ip === '127.0.0.1') {
                                  response = await runHealthCheck(server.id, 'testpass123', 2222);
                                } else if (server.auth_type !== 'password') {
                                  response = await runHealthCheck(server.id);
                                } else {
                                  setHealthCheckResult({ error: "Password authentication not supported for health check" });
                                  setActionLoading(false);
                                  return;
                                }
                                setHealthCheckResult(response.data);
                              } catch (err: any) {
                                setHealthCheckResult({ error: err?.response?.data?.error || err.message || "Health check failed" });
                              } finally {
                                setActionLoading(false);
                              }
                            }}
                            disabled={server.os_type !== 'linux'}
                            sx={{
                              py: 1.5,
                              fontSize: '0.95rem',
                              fontWeight: 500,
                              textTransform: 'none',
                              boxShadow: 2,
                              '&:hover': { boxShadow: 4 }
                            }}
                          >
                            Health Check
                          </Button>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Detailed Metrics */}
                <Grid item xs={12} sx={{ width: '100%', flexBasis: '100%', maxWidth: '100%' }}>
                  <Accordion
                    expanded={detailedMetricsExpanded[server.id] || false}
                    onChange={(e, isExpanded) => {
                      setDetailedMetricsExpanded(prev => ({ ...prev, [server.id]: isExpanded }));
                      // Auto-load detailed metrics when expanded for the first time
                      if (isExpanded && !detailedMetrics[server.id]) {
                        loadDetailedMetrics(server);
                      }
                    }}
                    sx={{ 
                      mb: 2,
                      '&:before': { display: 'none' },
                      boxShadow: 1,
                      borderRadius: 2,
                      overflow: 'hidden'
                    }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMore />}
                      sx={{
                        px: 2,
                        py: 1.5,
                        '&:hover': { bgcolor: 'action.hover' },
                        minHeight: 56,
                        '&.Mui-expanded': { minHeight: 56 }
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={2}>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <TableChart sx={{ color: 'primary.main', fontSize: 24 }} />
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            Detailed Metrics
                          </Typography>
                        </Box>
                        {detailedMetrics[server.id] && (
                          <Button
                            size="small"
                            startIcon={<Refresh />}
                            onClick={(e) => {
                              e.stopPropagation();
                              loadDetailedMetrics(server);
                            }}
                            variant="outlined"
                            sx={{
                              textTransform: 'none',
                              fontWeight: 500
                            }}
                          >
                            Refresh
                          </Button>
                        )}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ px: 0, py: 0, bgcolor: 'background.default' }}>
                      {detailedMetrics[server.id] ? (
                        <Box sx={{ px: 3, py: 2 }}>
                          <Tabs
                            value={detailedMetricsTab[server.id] || 0}
                            onChange={(e, newValue) => setDetailedMetricsTab(prev => ({ ...prev, [server.id]: newValue }))}
                            sx={{ 
                              mb: 3,
                              borderBottom: 1,
                              borderColor: 'divider',
                              '& .MuiTab-root': {
                                textTransform: 'none',
                                fontWeight: 500,
                                fontSize: '0.95rem',
                                minHeight: 48
                              }
                            }}
                          >
                            <Tab label="Top Processes" />
                            <Tab label="Network Interfaces" />
                            <Tab label="Disk Partitions" />
                            <Tab label="System Info" />
                          </Tabs>
                          
                          {/* Top Processes Tab */}
                          {detailedMetricsTab[server.id] === 0 && (
                            <TableContainer sx={{ borderRadius: 1, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>PID</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">CPU %</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Memory %</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {detailedMetrics[server.id]?.top_processes?.length > 0 ? (
                                    detailedMetrics[server.id].top_processes.map((proc: any, idx: number) => (
                                      <TableRow 
                                        key={idx}
                                        sx={{ 
                                          '&:hover': { bgcolor: 'action.hover' },
                                          '&:nth-of-type(even)': { bgcolor: 'action.selected' }
                                        }}
                                      >
                                        <TableCell>{proc.pid}</TableCell>
                                        <TableCell sx={{ fontWeight: 500 }}>{proc.name}</TableCell>
                                        <TableCell align="right">
                                          <Chip 
                                            label={`${proc.cpu?.toFixed(1)}%`} 
                                            size="small" 
                                            color={proc.cpu > 50 ? 'error' : proc.cpu > 20 ? 'warning' : 'default'}
                                          />
                                        </TableCell>
                                        <TableCell align="right">
                                          <Chip 
                                            label={`${proc.memory?.toFixed(1)}%`} 
                                            size="small" 
                                            color={proc.memory > 50 ? 'error' : proc.memory > 20 ? 'warning' : 'default'}
                                          />
                                        </TableCell>
                                        <TableCell>{proc.user}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          No processes found
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}

                          {/* Network Interfaces Tab */}
                          {detailedMetricsTab[server.id] === 1 && (
                            <TableContainer sx={{ borderRadius: 1, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Interface</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">RX Bytes</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">TX Bytes</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">RX Packets</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">TX Packets</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {detailedMetrics[server.id]?.network_interfaces?.length > 0 ? (
                                    detailedMetrics[server.id].network_interfaces.map((iface: any, idx: number) => (
                                      <TableRow 
                                        key={idx}
                                        sx={{ 
                                          '&:hover': { bgcolor: 'action.hover' },
                                          '&:nth-of-type(even)': { bgcolor: 'action.selected' }
                                        }}
                                      >
                                        <TableCell sx={{ fontWeight: 500 }}>{iface.name}</TableCell>
                                        <TableCell>
                                          <Chip 
                                            label={iface.ip || 'N/A'} 
                                            size="small" 
                                            variant="outlined"
                                            color={iface.ip && iface.ip !== 'N/A' ? 'primary' : 'default'}
                                          />
                                        </TableCell>
                                        <TableCell align="right">{(iface.rx_bytes / 1024 / 1024).toFixed(2)} MB</TableCell>
                                        <TableCell align="right">{(iface.tx_bytes / 1024 / 1024).toFixed(2)} MB</TableCell>
                                        <TableCell align="right">{iface.rx_packets?.toLocaleString()}</TableCell>
                                        <TableCell align="right">{iface.tx_packets?.toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          No interfaces found
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}

                          {/* Disk Partitions Tab */}
                          {detailedMetricsTab[server.id] === 2 && (
                            <TableContainer sx={{ borderRadius: 1, border: 1, borderColor: 'divider', overflow: 'hidden' }}>
                              <Table size="small">
                                <TableHead>
                                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                                    <TableCell sx={{ fontWeight: 600 }}>Filesystem</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>Mount Point</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Total (GB)</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Used (GB)</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Available (GB)</TableCell>
                                    <TableCell sx={{ fontWeight: 600 }} align="right">Usage %</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {detailedMetrics[server.id]?.disk_partitions?.length > 0 ? (
                                    detailedMetrics[server.id].disk_partitions.map((part: any, idx: number) => (
                                      <TableRow 
                                        key={idx}
                                        sx={{ 
                                          '&:hover': { bgcolor: 'action.hover' },
                                          '&:nth-of-type(even)': { bgcolor: 'action.selected' }
                                        }}
                                      >
                                        <TableCell sx={{ fontWeight: 500 }}>{part.filesystem}</TableCell>
                                        <TableCell>{part.mount}</TableCell>
                                        <TableCell align="right">{part.total_gb?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{part.used_gb?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{part.available_gb?.toFixed(2)}</TableCell>
                                        <TableCell align="right">
                                          <Chip
                                            label={`${part.usage_percent?.toFixed(1)}%`}
                                            color={part.usage_percent > 90 ? 'error' : part.usage_percent > 80 ? 'warning' : 'success'}
                                            size="small"
                                          />
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  ) : (
                                    <TableRow>
                                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">
                                          No partitions found
                                        </Typography>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          )}

                          {/* System Info Tab */}
                          {detailedMetricsTab[server.id] === 3 && (
                            <Grid container spacing={2.5}>
                              <Grid item xs={12} sm={6}>
                                <Card variant="outlined" sx={{ height: '100%', '&:hover': { boxShadow: 2 } }}>
                                  <CardContent>
                                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                                      <Info sx={{ color: 'primary.main', fontSize: 20 }} />
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Operating System
                                      </Typography>
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                      {detailedMetrics[server.id]?.system_info?.os || 'N/A'}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Card variant="outlined" sx={{ height: '100%', '&:hover': { boxShadow: 2 } }}>
                                  <CardContent>
                                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                                      <Info sx={{ color: 'primary.main', fontSize: 20 }} />
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Kernel Version
                                      </Typography>
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                      {detailedMetrics[server.id]?.system_info?.kernel || 'N/A'}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Card variant="outlined" sx={{ height: '100%', '&:hover': { boxShadow: 2 } }}>
                                  <CardContent>
                                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                                      <Info sx={{ color: 'primary.main', fontSize: 20 }} />
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Hostname
                                      </Typography>
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 500 }}>
                                      {detailedMetrics[server.id]?.system_info?.hostname || 'N/A'}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Card variant="outlined" sx={{ height: '100%', '&:hover': { boxShadow: 2 } }}>
                                  <CardContent>
                                    <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                                      <Timeline sx={{ color: 'primary.main', fontSize: 20 }} />
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Uptime
                                      </Typography>
                                    </Box>
                                    <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
                                      {detailedMetrics[server.id]?.system_info?.uptime_days || 0} days
                                    </Typography>
                                    {detailedMetrics[server.id]?.system_info?.uptime_since && (
                                      <Typography variant="caption" color="text.secondary">
                                        Since: {detailedMetrics[server.id].system_info.uptime_since}
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                            </Grid>
                          )}
                        </Box>
                      ) : (
                        <Box textAlign="center" py={6} px={3}>
                          <CircularProgress size={32} sx={{ mb: 2 }} />
                          <Typography variant="body2" color="text.secondary">
                            Loading detailed metrics...
                          </Typography>
                        </Box>
                      )}
                    </AccordionDetails>
                  </Accordion>
                </Grid>

                {/* Additional Server Info */}
                <Grid item xs={12}>
                  <Paper sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Server Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Hostname
                        </Typography>
                        <Typography variant="body2">
                          {server.hostname}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          IP Address
                        </Typography>
                        <Typography variant="body2">
                          {server.ip}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          OS Type
                        </Typography>
                        <Typography variant="body2">
                          {server.os_type}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption" color="text.secondary">
                          Last Updated
                        </Typography>
                        <Typography variant="body2">
                          {new Date().toLocaleTimeString()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })
      )}

      {/* Old empty state removed - now handled by ternary above */}
      {false && (
        <Box textAlign="center" py={8}>
          <Computer sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No servers found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Register a server to view its metrics
          </Typography>
          <Button
            component={Link}
            to="/register"
            variant="contained"
            sx={{ mt: 2 }}
          >
            Register Server
          </Button>
        </Box>
      )}

      {/* Execute Command Dialog */}
      <Dialog open={commandDialogOpen} onClose={() => setCommandDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Execute Command</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              Common Commands:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2, fontSize: '0.875rem' }}>
              <li><code>ps aux</code> - List all processes</li>
              <li><code>ps aux | grep &lt;name&gt;</code> - Find process by name</li>
              <li><code>kill &lt;pid&gt;</code> - Kill process by PID (e.g., <code>kill 1234</code>)</li>
              <li><code>kill -9 &lt;pid&gt;</code> - Force kill process (e.g., <code>kill -9 1234</code>)</li>
              <li><code>pkill &lt;name&gt;</code> - Kill process by name (e.g., <code>pkill nginx</code>)</li>
              <li><code>df -h</code> - Show disk usage</li>
              <li><code>free -h</code> - Show memory usage</li>
              <li><code>top -bn1</code> - Show system stats</li>
            </Box>
            <Alert severity="warning" sx={{ mt: 1.5, fontSize: '0.875rem' }}>
              <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                <strong>Note:</strong> To kill a process, first find its PID using <code>ps aux | grep &lt;name&gt;</code>, then use <code>kill &lt;pid&gt;</code>.
              </Typography>
            </Alert>
          </Alert>
          <TextField
            fullWidth
            label="Command"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="e.g., ps aux | grep nginx, kill 1234, df -h"
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleExecuteCommand();
              }
            }}
          />
          {commandResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Result:
              </Typography>
              {commandResult.success ? (
                <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {commandResult.output || 'Command executed successfully'}
                  </Typography>
                </Paper>
              ) : (
                <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'error.contrastText' }}>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                    {commandResult.error || 'Command execution failed'}
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCommandDialogOpen(false);
            setCommandInput("");
            setCommandResult(null);
          }}>
            Close
          </Button>
          <Button onClick={handleExecuteCommand} variant="contained" disabled={!commandInput.trim() || actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Execute'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restart Service Dialog */}
      <Dialog open={serviceDialogOpen} onClose={() => setServiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Restart Service</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              What is a service name?
            </Typography>
            <Typography variant="body2">
              A service name is the name of a systemd service running on your Linux server. Common examples:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              <li><code>ssh</code> - SSH server</li>
              <li><code>nginx</code> - Nginx web server</li>
              <li><code>apache2</code> - Apache web server</li>
              <li><code>mysql</code> - MySQL database</li>
              <li><code>docker</code> - Docker daemon</li>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
              You can list all services with: <code>systemctl list-units --type=service</code>
            </Typography>
          </Alert>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              <strong>Note:</strong> Docker containers typically don't support service management. 
              If you get an error, use "Execute Command" instead to manage processes directly.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="Service Name"
            value={serviceInput}
            onChange={(e) => setServiceInput(e.target.value)}
            placeholder="e.g., ssh, nginx, apache2, mysql"
            helperText="Enter the name of the systemd service you want to restart"
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleRestartService();
              }
            }}
          />
          {serviceResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Result:
              </Typography>
              {serviceResult.success ? (
                <Alert severity="success">
                  Service restarted successfully. Status: {serviceResult.status}
                </Alert>
              ) : (
                <Alert severity="error">
                  {serviceResult.error || 'Service restart failed'}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setServiceDialogOpen(false);
            setServiceInput("");
            setServiceResult(null);
          }}>
            Close
          </Button>
          <Button onClick={handleRestartService} variant="contained" disabled={!serviceInput.trim() || actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Restart'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Start Service Dialog */}
      <Dialog open={startServiceDialogOpen} onClose={() => setStartServiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Start Service</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              What is a service name?
            </Typography>
            <Typography variant="body2">
              A service name is the name of a systemd service running on your Linux server. Common examples:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              <li><code>ssh</code> - SSH server</li>
              <li><code>nginx</code> - Nginx web server</li>
              <li><code>apache2</code> - Apache web server</li>
              <li><code>mysql</code> - MySQL database</li>
              <li><code>docker</code> - Docker daemon</li>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
              You can list all services with: <code>systemctl list-units --type=service</code>
            </Typography>
          </Alert>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              <strong>Note:</strong> Docker containers typically don't support service management. 
              If you get an error, use "Execute Command" instead to manage processes directly.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="Service Name"
            value={startServiceInput}
            onChange={(e) => setStartServiceInput(e.target.value)}
            placeholder="e.g., ssh, nginx, apache2, mysql"
            helperText="Enter the name of the systemd service you want to start"
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleStartService();
              }
            }}
          />
          {startServiceResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Result:
              </Typography>
              {startServiceResult.success ? (
                <Alert severity="success">
                  Service started successfully. Status: {startServiceResult.status}
                </Alert>
              ) : (
                <Alert severity="error">
                  {startServiceResult.error || 'Service start failed'}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStartServiceDialogOpen(false);
            setStartServiceInput("");
            setStartServiceResult(null);
          }}>
            Close
          </Button>
          <Button onClick={handleStartService} variant="contained" color="success" disabled={!startServiceInput.trim() || actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Start'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Stop Service Dialog */}
      <Dialog open={stopServiceDialogOpen} onClose={() => setStopServiceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Stop Service</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              What is a service name?
            </Typography>
            <Typography variant="body2">
              A service name is the name of a systemd service running on your Linux server. Common examples:
            </Typography>
            <Box component="ul" sx={{ mt: 1, mb: 0, pl: 2 }}>
              <li><code>ssh</code> - SSH server</li>
              <li><code>nginx</code> - Nginx web server</li>
              <li><code>apache2</code> - Apache web server</li>
              <li><code>mysql</code> - MySQL database</li>
              <li><code>docker</code> - Docker daemon</li>
            </Box>
            <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
              You can list all services with: <code>systemctl list-units --type=service</code>
            </Typography>
          </Alert>
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
              <strong>Note:</strong> Docker containers typically don't support service management. 
              If you get an error, use "Execute Command" instead to manage processes directly.
            </Typography>
          </Alert>
          <TextField
            fullWidth
            label="Service Name"
            value={stopServiceInput}
            onChange={(e) => setStopServiceInput(e.target.value)}
            placeholder="e.g., ssh, nginx, apache2, mysql"
            helperText="Enter the name of the systemd service you want to stop"
            sx={{ mt: 1 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleStopService();
              }
            }}
          />
          {stopServiceResult && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Result:
              </Typography>
              {stopServiceResult.success ? (
                <Alert severity="success">
                  Service stopped successfully. Status: {stopServiceResult.status}
                </Alert>
              ) : (
                <Alert severity="error">
                  {stopServiceResult.error || 'Service stop failed'}
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStopServiceDialogOpen(false);
            setStopServiceInput("");
            setStopServiceResult(null);
          }}>
            Close
          </Button>
          <Button onClick={handleStopService} variant="contained" color="error" disabled={!stopServiceInput.trim() || actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Stop'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => {
        setPasswordDialogOpen(false);
        setPasswordInput("");
        setPasswordPort("22");
        setPasswordServer(null);
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Enter SSH Password</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {passwordServer && (
                <>Server <strong>{passwordServer.name || passwordServer.hostname}</strong> ({passwordServer.ip}) requires password authentication.</>
              )}
              {!passwordServer && "This server requires password authentication."}
            </Typography>
            
            <TextField
              fullWidth
              type="number"
              label="SSH Port"
              value={passwordPort}
              onChange={(e) => setPasswordPort(e.target.value)}
              sx={{ mb: 2 }}
              helperText="SSH port (default: 22). Port 2222 is typically for Docker/test servers."
              inputProps={{ min: 1, max: 65535 }}
              defaultValue="22"
            />
            
            <TextField
              fullWidth
              type="password"
              label="SSH Password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              helperText="Password will be stored in session storage for this browser session"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && passwordInput) {
                  e.preventDefault();
                  handlePasswordSubmit();
                }
              }}
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                The password will be stored temporarily in your browser's session storage and will be cleared when you close the browser tab.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setPasswordInput("");
            setPasswordPort("22");
            setPasswordServer(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handlePasswordSubmit} 
            variant="contained" 
            disabled={!passwordInput.trim()}
          >
            Connect
          </Button>
        </DialogActions>
      </Dialog>

      {/* Health Check Dialog */}
      <Dialog open={healthCheckDialogOpen} onClose={() => setHealthCheckDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>System Health Check</DialogTitle>
        <DialogContent>
          {actionLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : healthCheckResult ? (
            <Box>
              {healthCheckResult.error ? (
                <Alert severity="error">{healthCheckResult.error}</Alert>
              ) : (
                <Grid container spacing={2}>
                  {healthCheckResult.disk && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6">Disk</Typography>
                            <Chip
                              label={healthCheckResult.disk.status}
                              color={
                                healthCheckResult.disk.status === 'ok' ? 'success' :
                                healthCheckResult.disk.status === 'warning' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {healthCheckResult.disk.message}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {healthCheckResult.memory && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6">Memory</Typography>
                            <Chip
                              label={healthCheckResult.memory.status}
                              color={
                                healthCheckResult.memory.status === 'ok' ? 'success' :
                                healthCheckResult.memory.status === 'warning' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {healthCheckResult.memory.message}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                  {healthCheckResult.load && (
                    <Grid item xs={12}>
                      <Card>
                        <CardContent>
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6">Load Average</Typography>
                            <Chip
                              label={healthCheckResult.load.status}
                              color={
                                healthCheckResult.load.status === 'ok' ? 'success' :
                                healthCheckResult.load.status === 'warning' ? 'warning' : 'error'
                              }
                            />
                          </Box>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {healthCheckResult.load.message}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setHealthCheckDialogOpen(false);
            setHealthCheckResult(null);
          }}>
            Close
          </Button>
          <Button onClick={handleHealthCheck} variant="contained" disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={20} /> : 'Run Again'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import React, { useState, useEffect } from "react";
import { Link } from "react-router";
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
} from "@mui/icons-material";
import { fetchServers, fetchServerMetrics } from "./api";

export default function Metrics() {
  const [servers, setServers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ [id: string]: any }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | false>(false);

  const loadServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchServers();
      setServers(response.data);
      
      // Load metrics for all servers
      for (const server of response.data) {
        try {
          const metricsResponse = await fetchServerMetrics(server.id);
          setMetrics(prev => ({ ...prev, [server.id]: metricsResponse.data }));
        } catch (err) {
          console.error(`Failed to load metrics for server ${server.id}:`, err);
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
          onClick={loadServers}
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
      {servers.map((server) => {
        const serverMetrics = metrics[server.id];
        const serverStatus = server.status || 'unknown';
        const statusColor = serverStatus === 'online' ? 'success' : (serverStatus === 'offline' ? 'error' : 'warning');
        const cpuHealth = getHealthStatus(serverMetrics?.cpu?.usage_percent || 0);
        const memoryHealth = getHealthStatus(serverMetrics?.memory?.usage_percent || 0);
        const diskHealth = getHealthStatus(serverMetrics?.disk?.usage_percent || 0);

        return (
          <Accordion
            key={server.id}
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
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
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
                        Cores: {serverMetrics?.cpu?.cores || 'N/A'}
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
                              {(serverMetrics?.network?.bytes_sent / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                              Bytes Received
                            </Typography>
                            <Typography variant="h6">
                              {(serverMetrics?.network?.bytes_recv / 1024 / 1024).toFixed(2)} MB
                            </Typography>
                          </Grid>
                        </Grid>
                      </CardContent>
                    </Card>
                  </Grid>
                )}

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
      })}

      {servers.length === 0 && !loading && (
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
    </Box>
  );
}

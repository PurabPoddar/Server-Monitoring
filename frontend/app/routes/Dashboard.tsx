import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  LinearProgress,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Computer,
  Memory,
  Storage,
  NetworkCheck,
  Group,
  TrendingUp,
  TrendingDown,
  Warning,
  CheckCircle,
  Refresh,
  Timeline,
  Speed,
  Storage as HardDrive,
} from "@mui/icons-material";
import { fetchServers, fetchServerMetrics } from "./api";

export default function Dashboard() {
  const [servers, setServers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{ [id: string]: any }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Calculate dashboard statistics
  const totalServers = servers.length;
  const onlineServers = servers.filter(s => s.status === 'online').length;
  const offlineServers = totalServers - onlineServers;
  
  const avgCpuUsage = Object.values(metrics).reduce((sum, m) => sum + (m?.cpu?.usage_percent || 0), 0) / Object.keys(metrics).length || 0;
  const avgMemoryUsage = Object.values(metrics).reduce((sum, m) => sum + (m?.memory?.usage_percent || 0), 0) / Object.keys(metrics).length || 0;
  const avgDiskUsage = Object.values(metrics).reduce((sum, m) => sum + (m?.disk?.usage_percent || 0), 0) / Object.keys(metrics).length || 0;

  const getHealthStatus = (usage: number) => {
    if (usage < 50) return { color: 'success', icon: <CheckCircle />, text: 'Healthy' };
    if (usage < 80) return { color: 'warning', icon: <Warning />, text: 'Warning' };
    return { color: 'error', icon: <Warning />, text: 'Critical' };
  };

  // Generate mock historical data for charts
  const generateHistoricalData = () => {
    if (Object.keys(metrics).length === 0) return [];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => ({
      hour: `${hour}:00`,
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      disk: Math.random() * 100,
    }));
  };

  const historicalData = generateHistoricalData();
  const hasData = historicalData.length > 0 && Object.keys(metrics).length > 0;

  // Custom Chart Component
  const MetricChart = ({ data, title, color, icon }: any) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" mb={2}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1 }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ height: 200, position: 'relative' }}>
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '100%',
              display: 'flex',
              alignItems: 'end',
              gap: 0.5,
            }}
          >
            {data.map((point: any, index: number) => (
              <Box
                key={index}
                sx={{
                  flex: 1,
                  height: `${point}%`,
                  backgroundColor: color,
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.8,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    opacity: 1,
                    transform: 'scaleY(1.1)',
                  },
                }}
              />
            ))}
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Last 24 hours
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading Dashboard...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={loadServers}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" gutterBottom>
          Professional Monitoring Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadServers}
        >
          Refresh Data
        </Button>
      </Box>

      {/* Overview Statistics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 4 }}>
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ color: 'white' }}>
                  {totalServers}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Total Servers
                </Typography>
              </Box>
              <Computer sx={{ fontSize: 40, color: 'white' }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ color: 'white' }}>
                  {onlineServers}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Online Servers
                </Typography>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ background: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ color: 'white' }}>
                  {offlineServers}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Offline Servers
                </Typography>
              </Box>
              <Warning sx={{ fontSize: 40, color: 'white' }} />
            </Box>
          </CardContent>
        </Card>
        
        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <CardContent>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h4" sx={{ color: 'white' }}>
                  {onlineServers > 0 ? Math.round((onlineServers / totalServers) * 100) : 0}%
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                  Uptime Rate
                </Typography>
              </Box>
              <TrendingUp sx={{ fontSize: 40, color: 'white' }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {hasData ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 4 }}>
          <MetricChart
            data={historicalData.map(d => d.cpu)}
            title="CPU Usage Trend"
            color="#ff6b6b"
            icon={<Speed sx={{ color: 'primary.main' }} />}
          />
          
          <MetricChart
            data={historicalData.map(d => d.memory)}
            title="Memory Usage Trend"
            color="#4ecdc4"
            icon={<Memory sx={{ color: 'primary.main' }} />}
          />
          
          <MetricChart
            data={historicalData.map(d => d.disk)}
            title="Disk Usage Trend"
            color="#45b7d1"
            icon={<HardDrive sx={{ color: 'primary.main' }} />}
          />
        </Box>
      ) : (
        <Card sx={{ mb: 4 }}>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Timeline sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Server Data Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {servers.length === 0 
                ? "Add servers to start monitoring system metrics and trends." 
                : "Loading server metrics..."}
            </Typography>
            <Button
              component={Link}
              to="/register"
              variant="contained"
              sx={{ mt: 2 }}
            >
              Register Your First Server
            </Button>
          </CardContent>
        </Card>
      )}

      {/* System Health Overview */}

      {/* System Health Overview */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Memory sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Average CPU Usage</Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h4" color={`${getHealthStatus(avgCpuUsage).color}.main`}>
                {avgCpuUsage.toFixed(1)}%
              </Typography>
              <Box ml="auto">
                {getHealthStatus(avgCpuUsage).icon}
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={avgCpuUsage}
              color={getHealthStatus(avgCpuUsage).color as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Status: {getHealthStatus(avgCpuUsage).text}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Storage sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Average Memory Usage</Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h4" color={`${getHealthStatus(avgMemoryUsage).color}.main`}>
                {avgMemoryUsage.toFixed(1)}%
              </Typography>
              <Box ml="auto">
                {getHealthStatus(avgMemoryUsage).icon}
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={avgMemoryUsage}
              color={getHealthStatus(avgMemoryUsage).color as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Status: {getHealthStatus(avgMemoryUsage).text}
            </Typography>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <NetworkCheck sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6">Average Disk Usage</Typography>
            </Box>
            <Box display="flex" alignItems="center" mb={1}>
              <Typography variant="h4" color={`${getHealthStatus(avgDiskUsage).color}.main`}>
                {avgDiskUsage.toFixed(1)}%
              </Typography>
              <Box ml="auto">
                {getHealthStatus(avgDiskUsage).icon}
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={avgDiskUsage}
              color={getHealthStatus(avgDiskUsage).color as any}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Status: {getHealthStatus(avgDiskUsage).text}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Detailed Server Performance Table */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Server Performance Details
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Server</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>CPU Usage</TableCell>
                  <TableCell>Memory Usage</TableCell>
                  <TableCell>Disk Usage</TableCell>
                  <TableCell>OS Type</TableCell>
                  <TableCell>Last Updated</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {servers.map((server) => {
                  const serverMetrics = metrics[server.id];
                  const serverStatus = server.status || 'unknown';
                  const statusColor = serverStatus === 'online' ? 'success' : (serverStatus === 'offline' ? 'error' : 'warning');
                  const statusIcon = serverStatus === 'online' ? <CheckCircle /> : <Warning />;
                  
                  return (
                    <TableRow key={server.id}>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            <Computer />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {server.name || server.hostname}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {server.ip}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={serverStatus}
                          color={statusColor}
                          size="small"
                          icon={statusIcon}
                        />
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={serverMetrics?.cpu?.usage_percent || 0}
                            color={getHealthStatus(serverMetrics?.cpu?.usage_percent || 0).color as any}
                            sx={{ width: 60, mr: 1 }}
                          />
                          <Typography variant="body2">
                            {serverMetrics?.cpu?.usage_percent?.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={serverMetrics?.memory?.usage_percent || 0}
                            color={getHealthStatus(serverMetrics?.memory?.usage_percent || 0).color as any}
                            sx={{ width: 60, mr: 1 }}
                          />
                          <Typography variant="body2">
                            {serverMetrics?.memory?.usage_percent?.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <LinearProgress
                            variant="determinate"
                            value={serverMetrics?.disk?.usage_percent || 0}
                            color={getHealthStatus(serverMetrics?.disk?.usage_percent || 0).color as any}
                            sx={{ width: 60, mr: 1 }}
                          />
                          <Typography variant="body2">
                            {serverMetrics?.disk?.usage_percent?.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={server.os_type} 
                          size="small" 
                          color={server.os_type === 'linux' ? 'primary' : 'secondary'}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date().toLocaleTimeString()}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Server Status Overview */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Server Status Overview
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
            {servers.map((server) => {
              const serverMetrics = metrics[server.id];
              const serverStatus = server.status || 'unknown';
              const statusColor = serverStatus === 'online' ? 'success' : (serverStatus === 'offline' ? 'error' : 'warning');
              const statusIcon = serverStatus === 'online' ? <CheckCircle /> : <Warning />;
              
              return (
                <Paper sx={{ p: 2, height: '100%' }} key={server.id}>
                  <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                    <Typography variant="h6" component="div">
                      {server.name || server.hostname}
                    </Typography>
                    <Chip
                      label={serverStatus}
                      color={statusColor}
                      size="small"
                      icon={statusIcon}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {server.ip} • {server.os_type}
                  </Typography>
                  {serverMetrics && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        CPU: {serverMetrics.cpu?.usage_percent?.toFixed(1)}% | 
                        Memory: {serverMetrics.memory?.usage_percent?.toFixed(1)}% | 
                        Disk: {serverMetrics.disk?.usage_percent?.toFixed(1)}%
                      </Typography>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
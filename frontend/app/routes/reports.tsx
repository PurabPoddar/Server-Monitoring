import React, { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Grid,
} from "@mui/material";
import {
  Download,
  Assessment,
  Computer,
  InsertDriveFile,
  PictureAsPdf,
  TableChart,
  Add,
} from "@mui/icons-material";
import { fetchServers, fetchServerMetrics } from "./api";

export default function Reports() {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("csv");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchServers();
      setServers(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to load servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleDownloadReport = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get server data
      let serverData: any[] = [];
      if (selectedServer === "all") {
        // Download all servers
        for (const server of servers) {
          try {
            const metricsResponse = await fetchServerMetrics(server.id);
            serverData.push({
              ...server,
              metrics: metricsResponse.data,
            });
          } catch (err) {
            console.error(`Failed to load metrics for server ${server.id}:`, err);
          }
        }
      } else {
        // Download specific server
        const server = servers.find((s) => s.id === parseInt(selectedServer));
        if (server) {
          const metricsResponse = await fetchServerMetrics(server.id);
          serverData.push({
            ...server,
            metrics: metricsResponse.data,
          });
        }
      }

      // Generate and download file
      if (reportType === "csv") {
        downloadCSV(serverData);
      } else if (reportType === "json") {
        downloadJSON(serverData);
      }
    } catch (err: any) {
      setError("Failed to generate report: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = (data: any[]) => {
    // Create CSV content
    const headers = [
      "Server ID",
      "Name",
      "Hostname",
      "IP Address",
      "OS Type",
      "Status",
      "CPU Usage (%)",
      "Memory Usage (%)",
      "Disk Usage (%)",
      "Network Sent (MB)",
      "Network Received (MB)",
    ];

    const rows = data.map((server) => [
      server.id,
      server.name || server.hostname,
      server.hostname,
      server.ip,
      server.os_type,
      server.status,
      server.metrics?.cpu?.usage_percent?.toFixed(2) || "N/A",
      server.metrics?.memory?.usage_percent?.toFixed(2) || "N/A",
      server.metrics?.disk?.usage_percent?.toFixed(2) || "N/A",
      server.metrics?.network?.bytes_sent
        ? (server.metrics.network.bytes_sent / 1024 / 1024).toFixed(2)
        : "N/A",
      server.metrics?.network?.bytes_recv
        ? (server.metrics.network.bytes_recv / 1024 / 1024).toFixed(2)
        : "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `server_report_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = (data: any[]) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `server_report_${new Date().toISOString().split("T")[0]}.json`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && servers.length === 0) {
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
      <Typography variant="h4" gutterBottom>
        Server Reports
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 4 }}>
        Download server data and metrics reports in various formats
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Report Configuration */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <Assessment sx={{ color: "primary.main", mr: 1 }} />
                <Typography variant="h6">Generate Report</Typography>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Server</InputLabel>
                <Select
                  value={selectedServer}
                  label="Select Server"
                  onChange={(e) => setSelectedServer(e.target.value)}
                >
                  <MenuItem value="all">All Servers</MenuItem>
                  {servers.map((server) => (
                    <MenuItem key={server.id} value={server.id.toString()}>
                      {server.name || server.hostname} ({server.ip})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Report Format</InputLabel>
                <Select
                  value={reportType}
                  label="Report Format"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="csv">
                    <Box display="flex" alignItems="center">
                      <TableChart sx={{ mr: 1, fontSize: 20 }} />
                      CSV (Comma Separated Values)
                    </Box>
                  </MenuItem>
                  <MenuItem value="json">
                    <Box display="flex" alignItems="center">
                      <InsertDriveFile sx={{ mr: 1, fontSize: 20 }} />
                      JSON (JavaScript Object Notation)
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={loading ? <CircularProgress size={20} /> : <Download />}
                onClick={handleDownloadReport}
                disabled={loading || servers.length === 0}
              >
                {loading ? "Generating Report..." : "Download Report"}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Report Information
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Download comprehensive server reports including:
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  Server details (name, IP, OS type, status)
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  CPU usage metrics
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Memory utilization
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Disk usage statistics
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  Network activity data
                </Typography>
              </Box>
              <Box mt={2}>
                <Chip label={`${servers.length} Servers Available`} color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Available Servers Preview */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Available Servers
          </Typography>
          <TableContainer component={Paper} sx={{ mt: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Server Name</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>OS Type</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {servers.map((server) => (
                  <TableRow key={server.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <Computer sx={{ mr: 1, color: "primary.main" }} />
                        {server.name || server.hostname}
                      </Box>
                    </TableCell>
                    <TableCell>{server.ip}</TableCell>
                    <TableCell>
                      <Chip label={server.os_type} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={server.status || 'unknown'}
                        color={server.status === "online" ? "success" : (server.status === "offline" ? "error" : "warning")}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {servers.length === 0 && (
            <Box textAlign="center" py={8}>
              <Assessment sx={{ fontSize: 80, color: 'text.secondary', mb: 3 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Servers to Report
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Register servers to generate detailed reports of their performance and health metrics.
              </Typography>
              <Button
                component={Link}
                to="/register"
                variant="contained"
                startIcon={<Add />}
              >
                Register a Server
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}


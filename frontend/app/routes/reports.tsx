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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
            // Try to fetch metrics using stored credentials
            // Backend will automatically use stored password/port if available
            let metricsResponse;
            
            // For localhost test servers with password auth, use default password
            if (server.auth_type === 'password' && server.ip === '127.0.0.1') {
              const ports = [2222, 2223];
              let success = false;
              for (const port of ports) {
                try {
                  metricsResponse = await fetchServerMetrics(server.id, 'testpass123', port);
                  if (metricsResponse && metricsResponse.data) {
                    success = true;
                    break;
                  }
                } catch (portErr) {
                  continue;
                }
              }
              if (!success) {
                console.error(`Failed to load metrics for server ${server.id} on any port`);
                continue;
              }
            } else {
              // For all other servers, use stored credentials automatically
              // Backend will use stored password/port if available
              try {
                metricsResponse = await fetchServerMetrics(server.id);
                
                // Check if response has error
                if (metricsResponse?.data?.error) {
                  console.error(`Server ${server.id} (${server.name || server.hostname}) metrics error:`, metricsResponse.data.error);
                  // Check if it's a credential issue
                  if (process.env.NODE_ENV === 'development') {
                    if (metricsResponse.data.error.toLowerCase().includes('password') || 
                        metricsResponse.data.error.toLowerCase().includes('credential')) {
                      console.warn(`Server ${server.id} needs credentials. Has stored password: ${server.has_password}, Has key_path: ${!!server.key_path}`);
                    }
                  }
                  continue;
                }
              } catch (err: any) {
                if (process.env.NODE_ENV === 'development') {
                  console.error(`Failed to load metrics for server ${server.id} (${server.name || server.hostname}):`, err);
                }
                // Continue to next server instead of failing completely
                continue;
              }
            }
            
            // Only add if we have valid metrics data
            if (metricsResponse && metricsResponse.data && !metricsResponse.data.error) {
              serverData.push({
                ...server,
                metrics: metricsResponse.data,
              });
            } else if (process.env.NODE_ENV === 'development') {
              console.warn(`Server ${server.id} (${server.name || server.hostname}) - No valid metrics data:`, {
                hasResponse: !!metricsResponse,
                hasData: !!metricsResponse?.data,
                hasError: !!metricsResponse?.data?.error,
                error: metricsResponse?.data?.error
              });
            }
          } catch (err) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`Failed to load metrics for server ${server.id}:`, err);
            }
            // Continue to next server instead of failing completely
          }
        }
      } else {
        // Download specific server
        const server = servers.find((s) => s.id === parseInt(selectedServer));
        if (server) {
          let metricsResponse;
          
          // For localhost test servers with password auth, use default password
          if (server.auth_type === 'password' && server.ip === '127.0.0.1') {
            const ports = [2222, 2223];
            let success = false;
            for (const port of ports) {
              try {
                metricsResponse = await fetchServerMetrics(server.id, 'testpass123', port);
                if (metricsResponse && metricsResponse.data) {
                  success = true;
                  break;
                }
              } catch (portErr) {
                continue;
              }
            }
            if (!success) {
              throw new Error(`Failed to load metrics for server ${server.id} on any port`);
            }
          } else {
            // Use stored credentials automatically
            // Backend will use stored password/port if available
            try {
              metricsResponse = await fetchServerMetrics(server.id);
              
              // Check if response has error
              if (metricsResponse?.data?.error) {
                const errorMsg = metricsResponse.data.error;
                console.error(`Server ${server.id} metrics error:`, errorMsg);
                
                // Provide helpful error message
                if (errorMsg.toLowerCase().includes('password') || 
                    errorMsg.toLowerCase().includes('credential')) {
                  const hasCreds = server.has_password || server.key_path;
                  throw new Error(
                    `Failed to load metrics: ${errorMsg}. ` +
                    `Server ${hasCreds ? 'has' : 'does not have'} stored credentials. ` +
                    `Please test connection from the Servers page to save/update credentials.`
                  );
                } else {
                  throw new Error(`Failed to load metrics: ${errorMsg}`);
                }
              }
            } catch (err: any) {
              console.error(`Failed to load metrics for server ${server.id}:`, err);
              if (err?.response?.data?.error) {
                throw new Error(`Failed to load metrics: ${err.response.data.error}`);
              }
              throw err;
            }
          }
          
          if (metricsResponse && metricsResponse.data && !metricsResponse.data.error) {
            serverData.push({
              ...server,
              metrics: metricsResponse.data,
            });
          } else {
            throw new Error(`No valid metrics data received for server ${server.name || server.hostname}`);
          }
        }
      }

      // Check if we have any data
      if (serverData.length === 0) {
        const totalServers = selectedServer === "all" ? servers.length : 1;
        if (totalServers === 0) {
          setError("No servers available. Please register servers first.");
        } else {
          // Check if servers have stored credentials
          const serversWithoutCredentials = servers.filter(s => 
            !s.has_password && 
            !s.key_path && 
            s.os_type !== 'linux' // Linux can work with just key_path
          );
          
          let errorMsg = `No server data available to download. ` +
            `Tried to fetch metrics from ${totalServers} server(s) but none returned data.\n\n`;
          
          if (serversWithoutCredentials.length > 0) {
            errorMsg += `⚠️ ${serversWithoutCredentials.length} server(s) don't have stored credentials:\n`;
            serversWithoutCredentials.forEach(s => {
              errorMsg += `  • ${s.name || s.hostname} (${s.ip}) - ${s.os_type}\n`;
            });
            errorMsg += `\nPlease test the connection during registration or from the Servers page to save credentials.`;
          } else {
            errorMsg += `Possible issues:\n` +
              `  • Servers may be offline or unreachable\n` +
              `  • Network connectivity issues\n` +
              `  • Credentials may have expired\n\n` +
              `Try testing connections from the Servers page first.`;
          }
          
          setError(errorMsg);
        }
        return;
      }

      // Generate and download file
      if (reportType === "csv") {
        downloadCSV(serverData);
      } else if (reportType === "json") {
        downloadJSON(serverData);
      } else if (reportType === "pdf") {
        downloadPDF(serverData);
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

  const downloadPDF = (data: any[]) => {
    const doc = new jsPDF();
    const date = new Date().toISOString().split("T")[0];
    
    // Title
    doc.setFontSize(20);
    doc.text("Server Monitoring Report", 14, 20);
    
    // Date and summary
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Servers: ${data.length}`, 14, 36);
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    // Prepare table data
    const tableData = data.map((server) => [
      server.id.toString(),
      server.name || server.hostname,
      server.hostname,
      server.ip,
      server.os_type,
      server.status || "unknown",
      server.metrics?.cpu?.usage_percent?.toFixed(2) + "%" || "N/A",
      server.metrics?.memory?.usage_percent?.toFixed(2) + "%" || "N/A",
      server.metrics?.disk?.usage_percent?.toFixed(2) + "%" || "N/A",
      server.metrics?.network?.bytes_sent
        ? (server.metrics.network.bytes_sent / 1024 / 1024).toFixed(2) + " MB"
        : "N/A",
      server.metrics?.network?.bytes_recv
        ? (server.metrics.network.bytes_recv / 1024 / 1024).toFixed(2) + " MB"
        : "N/A",
    ]);

    // Add table
    autoTable(doc, {
      head: [
        [
          "ID",
          "Name",
          "Hostname",
          "IP Address",
          "OS Type",
          "Status",
          "CPU %",
          "Memory %",
          "Disk %",
          "Network Sent",
          "Network Recv",
        ],
      ],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: {
        0: { cellWidth: 15 }, // ID
        1: { cellWidth: 30 }, // Name
        2: { cellWidth: 30 }, // Hostname
        3: { cellWidth: 25 }, // IP
        4: { cellWidth: 20 }, // OS Type
        5: { cellWidth: 20 }, // Status
        6: { cellWidth: 18 }, // CPU
        7: { cellWidth: 20 }, // Memory
        8: { cellWidth: 18 }, // Disk
        9: { cellWidth: 25 }, // Network Sent
        10: { cellWidth: 25 }, // Network Recv
      },
    });

    // Add summary statistics
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    let yPos = finalY + 15;
    
    doc.setFontSize(14);
    doc.text("Summary Statistics", 14, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    const avgCpu = data.reduce((sum, s) => sum + (s.metrics?.cpu?.usage_percent || 0), 0) / data.length;
    const avgMemory = data.reduce((sum, s) => sum + (s.metrics?.memory?.usage_percent || 0), 0) / data.length;
    const avgDisk = data.reduce((sum, s) => sum + (s.metrics?.disk?.usage_percent || 0), 0) / data.length;
    const onlineCount = data.filter((s) => s.status === "online").length;
    
    doc.text(`Average CPU Usage: ${avgCpu.toFixed(2)}%`, 14, yPos);
    yPos += 6;
    doc.text(`Average Memory Usage: ${avgMemory.toFixed(2)}%`, 14, yPos);
    yPos += 6;
    doc.text(`Average Disk Usage: ${avgDisk.toFixed(2)}%`, 14, yPos);
    yPos += 6;
    doc.text(`Online Servers: ${onlineCount} / ${data.length}`, 14, yPos);
    
    // Save PDF
    doc.save(`server_report_${date}.pdf`);
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
                  <MenuItem value="pdf">
                    <Box display="flex" alignItems="center">
                      <PictureAsPdf sx={{ mr: 1, fontSize: 20 }} />
                      PDF (Portable Document Format)
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


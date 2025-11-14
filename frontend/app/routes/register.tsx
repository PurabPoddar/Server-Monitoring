import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  Paper,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  Computer,
  ArrowBack,
  Save,
  NetworkCheck,
} from "@mui/icons-material";
import { registerServer, testConnectionDirect } from "./api";

export default function RegisterServer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    hostname: "",
    ip: "",
    os_type: "linux",
    username: "ubuntu",
    auth_type: "key",
    key_path: "",
    password: "",
    port: "22",
    winrm_port: "5985",
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value as string }));
    // Clear connection test result when form changes
    if (connectionTestResult) {
      setConnectionTestResult(null);
    }
  };

  const handleTestConnection = async () => {
    // Validate required fields
    if (!form.ip || !form.username) {
      setConnectionTestResult({
        success: false,
        message: "Please fill in IP address and username first"
      });
      return;
    }

    // Validate Windows password
    if (form.os_type === "windows" && !form.password) {
      setConnectionTestResult({
        success: false,
        message: "Password is required for Windows servers"
      });
      return;
    }

    // Validate Linux credentials
    if (form.os_type === "linux" && form.auth_type === "password" && !form.password) {
      setConnectionTestResult({
        success: false,
        message: "Password is required for password authentication"
      });
      return;
    }

    if (form.os_type === "linux" && form.auth_type === "key" && !form.key_path) {
      setConnectionTestResult({
        success: false,
        message: "SSH key path is required for key authentication"
      });
      return;
    }

    setTestingConnection(true);
    setConnectionTestResult(null);
    setError(null);

    try {
      const testData: any = {
        ip: form.ip,
        os_type: form.os_type,
        username: form.username,
      };

      if (form.os_type === "windows") {
        testData.password = form.password;
        testData.winrm_port = parseInt(form.winrm_port) || 5985;
      } else {
        if (form.auth_type === "password") {
          testData.password = form.password;
        } else {
          testData.key_path = form.key_path;
        }
        testData.port = parseInt(form.port) || 22;
      }

      const response = await testConnectionDirect(testData);
      setConnectionTestResult({
        success: response.data.success,
        message: response.data.message || "Connection test completed"
      });
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Connection test failed";
      setConnectionTestResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setWarning(null);

    // Validate required fields
    if (!form.hostname || !form.ip || !form.username) {
      setError("Please fill in all required fields: Hostname, IP Address, and Username");
      setLoading(false);
      return;
    }

    // Validate Windows password
    if (form.os_type === "windows" && !form.password) {
      setError("Password is required for Windows servers");
      setLoading(false);
      return;
    }

    try {
      const response = await registerServer(form);
      const responseData = response.data;
      
      // Check if connection test was performed
      if (responseData.connection_test) {
        if (responseData.connection_test.success) {
          setSuccess(`Server registered successfully! Connection test passed. ${responseData.initial_metrics ? 'Initial metrics loaded.' : ''}`);
          setWarning(null);
        } else {
          // Show warning but still success - server is registered
          const errorMsg = responseData.connection_test.message || 'Unknown error';
          setSuccess("Server registered successfully!");
          setWarning(`Connection test failed: ${errorMsg}. You can test the connection later from the servers page.`);
        }
      } else {
        setSuccess("Server registered successfully!");
        setWarning(null);
      }
      
      setForm({
        name: "",
        hostname: "",
        ip: "",
        os_type: "linux",
        username: "ubuntu",
        auth_type: "key",
        key_path: "",
        password: "",
        port: "22",
        winrm_port: "5985",
        notes: ""
      });
      
      // Redirect to servers page after 2 seconds
      setTimeout(() => {
        navigate("/servers");
      }, 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      console.error("Error details:", {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
        code: err?.code
      });
      
      // Provide more detailed error messages
      let errorMessage = "Failed to register server";
      
      if (err?.code === "ECONNREFUSED" || err?.code === "ERR_NETWORK") {
        errorMessage = "Cannot connect to backend server. Make sure the backend is running on http://localhost:5001";
      } else if (err?.response?.status === 400) {
        const errorData = err?.response?.data;
        if (errorData?.missing_fields) {
          errorMessage = `Missing required fields: ${errorData.missing_fields.join(", ")}. Please fill in all required fields.`;
        } else {
          errorMessage = errorData?.error || errorData?.message || "Invalid request. Please check all fields.";
        }
      } else if (err?.response?.status === 500) {
        errorMessage = err?.response?.data?.error || err?.response?.data?.message || "Server error. Please try again.";
      } else if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4}>
          <Box display="flex" alignItems="center" mb={4}>
            <Typography variant="h4">
              Register New Server
            </Typography>
          </Box>

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: 2 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Server Information
              </Typography>
              
              <Box component="form" onSubmit={handleSubmit}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3 }}>
                  <TextField
                    fullWidth
                    label="Server Name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    helperText="Display name for the server"
                  />
                  
                  <TextField
                    fullWidth
                    label="Hostname"
                    name="hostname"
                    value={form.hostname}
                    onChange={handleChange}
                    required
                    helperText="Server hostname"
                  />
                  
                  <TextField
                    fullWidth
                    label="IP Address"
                    name="ip"
                    value={form.ip}
                    onChange={handleChange}
                    required
                    helperText="Server IP address"
                    placeholder="192.168.1.100"
                  />
                  
                  <TextField
                    fullWidth
                    select
                    label="Operating System"
                    name="os_type"
                    value={form.os_type}
                    onChange={handleChange}
                    SelectProps={{ native: true }}
                    required
                  >
                    <option value="linux">Linux</option>
                    <option value="windows">Windows</option>
                  </TextField>
                  
                  <TextField
                    fullWidth
                    label="Username"
                    name="username"
                    value={form.username}
                    onChange={handleChange}
                    required
                    helperText="SSH username for Linux or Windows username"
                  />
                  
                  {form.os_type === "linux" && (
                    <FormControl fullWidth>
                      <InputLabel>Authentication Type</InputLabel>
                      <Select
                        name="auth_type"
                        value={form.auth_type}
                        label="Authentication Type"
                        onChange={handleChange}
                      >
                        <MenuItem value="key">SSH Key</MenuItem>
                        <MenuItem value="password">Password</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                  
                  {form.os_type === "linux" && form.auth_type === "key" && (
                    <TextField
                      fullWidth
                      label="SSH Key Path"
                      name="key_path"
                      value={form.key_path}
                      onChange={handleChange}
                      helperText="Path to SSH private key"
                      placeholder="/home/user/.ssh/id_rsa"
                    />
                  )}
                  
                  {form.os_type === "linux" && form.auth_type === "password" && (
                    <>
                      <TextField
                        fullWidth
                        type="password"
                        label="SSH Password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        helperText="SSH password for authentication (will be stored encrypted after successful test connection)"
                        required={form.auth_type === "password"}
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="SSH Port"
                        name="port"
                        value={form.port}
                        onChange={handleChange}
                        helperText="SSH port (default: 22)"
                        inputProps={{ min: 1, max: 65535 }}
                      />
                    </>
                  )}
                  
                  {form.os_type === "linux" && form.auth_type === "key" && (
                    <TextField
                      fullWidth
                      type="number"
                      label="SSH Port"
                      name="port"
                      value={form.port}
                      onChange={handleChange}
                      helperText="SSH port (default: 22)"
                      inputProps={{ min: 1, max: 65535 }}
                    />
                  )}
                  
                  {form.os_type === "windows" && (
                    <>
                      <TextField
                        fullWidth
                        type="password"
                        label="Windows Password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        helperText="Windows administrator password (will be stored encrypted after successful test connection)"
                        required
                      />
                      <TextField
                        fullWidth
                        type="number"
                        label="WinRM Port"
                        name="winrm_port"
                        value={form.winrm_port}
                        onChange={handleChange}
                        helperText="WinRM port (5985 for HTTP, 5986 for HTTPS)"
                        inputProps={{ min: 1, max: 65535 }}
                      />
                    </>
                  )}
                  
                  <TextField
                    fullWidth
                    label="Notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    multiline
                    rows={3}
                    helperText="Optional notes about this server"
                    sx={{ gridColumn: '1 / -1' }}
                  />
                </Box>

                {/* Test Connection Section */}
                <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Test Connection
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Test the connection before registering. If successful, credentials will be saved automatically during registration.
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !form.ip || !form.username}
                    startIcon={testingConnection ? <CircularProgress size={20} /> : <NetworkCheck />}
                    sx={{ mb: 2 }}
                  >
                    {testingConnection ? "Testing Connection..." : "Test Connection"}
                  </Button>

                  {connectionTestResult && (
                    <Alert 
                      severity={connectionTestResult.success ? "success" : "error"} 
                      sx={{ mt: 2 }}
                    >
                      {connectionTestResult.success ? (
                        <>
                          {connectionTestResult.message}
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            ✓ Connection successful! Credentials will be saved when you register the server.
                          </Typography>
                        </>
                      ) : (
                        <Box>
                          <Typography variant="body2" component="div" sx={{ whiteSpace: 'pre-line' }}>
                            {connectionTestResult.message}
                          </Typography>
                        </Box>
                      )}
                    </Alert>
                  )}
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    {error}
                  </Alert>
                )}

                {warning && (
                  <Alert severity="warning" sx={{ mt: 3 }}>
                    {warning}
                  </Alert>
                )}

                {success && (
                  <Alert severity="success" sx={{ mt: 3 }}>
                    {success}
                  </Alert>
                )}

                <Box display="flex" gap={2} mt={3}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                  >
                    {loading ? "Registering..." : "Register Server"}
                  </Button>
                  
                  <Button
                    component={Link}
                    to="/servers"
                    variant="outlined"
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
        
        <Box sx={{ flex: 1 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Registration Help
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Required Fields:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Server Name - Display name<br/>
                  • Hostname - Server hostname<br/>
                  • IP Address - Server IP<br/>
                  • OS Type - Linux or Windows<br/>
                  • Username - Login username
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  For Linux Servers:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Choose authentication: SSH Key or Password<br/>
                  • SSH Key: Provide path to private key<br/>
                  • Password: Provide SSH password<br/>
                  • Ensure SSH access is configured<br/>
                  • Default username: ubuntu
                </Typography>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  For Windows Servers:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • WinRM must be enabled<br/>
                  • Provide Windows username<br/>
                  • Password is required and will be stored encrypted<br/>
                  • Metrics will be automatically loaded if password is provided<br/>
                  • Default WinRM port: 5985 (HTTP) or 5986 (HTTPS)
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

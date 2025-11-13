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
} from "@mui/icons-material";
import { registerServer } from "./api";

export default function RegisterServer() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    hostname: "",
    ip: "",
    os_type: "linux",
    username: "ubuntu",
    auth_type: "key",
    key_path: "",
    password: "",
    notes: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: unknown } }) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value as string }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await registerServer(form);
      setSuccess("Server registered successfully!");
      setForm({
        name: "",
        hostname: "",
        ip: "",
        os_type: "linux",
        username: "ubuntu",
        auth_type: "key",
        key_path: "",
        password: "",
        notes: ""
      });
      
      // Redirect to servers page after 2 seconds
      setTimeout(() => {
        navigate("/servers");
      }, 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to register server");
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
                    <TextField
                      fullWidth
                      type="password"
                      label="SSH Password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      helperText="SSH password for authentication"
                      required={form.auth_type === "password"}
                    />
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

                {error && (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    {error}
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
                  • Password will be required for actions
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}

import { useState, useEffect } from "react";
import { Box, Typography, Paper, TextField, Button, Stack, Alert, CircularProgress, IconButton, List, ListItem, ListItemText, ListItemSecondaryAction, Snackbar } from "@mui/material";
import DeleteIcon from '@mui/icons-material/Delete';
import { registerServer, fetchServers, fetchServerMetrics, fetchServerUsers, addServerUser, deleteServerUser, startVM, stopVM } from "./api";

export default function Dashboard() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", ip: "" });
  const [registering, setRegistering] = useState(false);
  const [metrics, setMetrics] = useState<{ [id: string]: any }>({});
  const [metricsLoading, setMetricsLoading] = useState<{ [id: string]: boolean }>({});
  const [metricsError, setMetricsError] = useState<{ [id: string]: string | null }>({});
  const [users, setUsers] = useState<{ [id: string]: any[] }>({});
  const [usersLoading, setUsersLoading] = useState<{ [id: string]: boolean }>({});
  const [usersError, setUsersError] = useState<{ [id: string]: string | null }>({});
  const [addUserForm, setAddUserForm] = useState<{ [id: string]: { username: string } }>({});
  const [addUserLoading, setAddUserLoading] = useState<{ [id: string]: boolean }>({});
  const [addUserError, setAddUserError] = useState<{ [id: string]: string | null }>({});
  const [deleteUserLoading, setDeleteUserLoading] = useState<{ [id: string]: { [username: string]: boolean } }>({});
  const [vmLoading, setVmLoading] = useState<{ [id: string]: { start?: boolean; stop?: boolean } }>({});
  const [vmError, setVmError] = useState<{ [id: string]: string | null }>({});
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string }>({ open: false, message: "" });

  const loadServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchServers();
      setServers(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to fetch servers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    setError(null);
    try {
      await registerServer(form);
      setForm({ name: "", ip: "" });
      await loadServers();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || "Failed to register server");
    } finally {
      setRegistering(false);
    }
  };

  const handleFetchMetrics = async (id: string) => {
    setMetricsLoading((prev) => ({ ...prev, [id]: true }));
    setMetricsError((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetchServerMetrics(id);
      setMetrics((prev) => ({ ...prev, [id]: res.data }));
    } catch (err: any) {
      setMetricsError((prev) => ({ ...prev, [id]: err?.response?.data?.message || err.message || "Failed to fetch metrics" }));
    } finally {
      setMetricsLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleLoadUsers = async (id: string) => {
    setUsersLoading((prev) => ({ ...prev, [id]: true }));
    setUsersError((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetchServerUsers(id);
      setUsers((prev) => ({ ...prev, [id]: res.data }));
    } catch (err: any) {
      setUsersError((prev) => ({ ...prev, [id]: err?.response?.data?.message || err.message || "Failed to fetch users" }));
    } finally {
      setUsersLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleAddUserChange = (
    id: string,
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAddUserForm((prev) => ({ ...prev, [id]: { ...prev[id], [e.target.name]: e.target.value } }));
  };

  const handleAddUser = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    setAddUserLoading((prev) => ({ ...prev, [id]: true }));
    setAddUserError((prev) => ({ ...prev, [id]: null }));
    try {
      await addServerUser(id, addUserForm[id]);
      setAddUserForm((prev) => ({ ...prev, [id]: { username: "" } }));
      await handleLoadUsers(id);
    } catch (err: any) {
      setAddUserError((prev) => ({ ...prev, [id]: err?.response?.data?.message || err.message || "Failed to add user" }));
    } finally {
      setAddUserLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteUser = async (id: string, username: string) => {
    setDeleteUserLoading((prev) => ({ ...prev, [id]: { ...prev[id], [username]: true } }));
    try {
      await deleteServerUser(id, username);
      await handleLoadUsers(id);
    } catch (err) {
      // Optionally handle error
    } finally {
      setDeleteUserLoading((prev) => ({ ...prev, [id]: { ...prev[id], [username]: false } }));
    }
  };

  const handleVmAction = async (id: string, name: string, action: 'start' | 'stop') => {
    setVmLoading((prev) => ({ ...prev, [id]: { ...prev[id], [action]: true } }));
    setVmError((prev) => ({ ...prev, [id]: null }));
    try {
      if (action === 'start') {
        await startVM(name);
        setSnackbar({ open: true, message: `VM ${name} started successfully.` });
      } else {
        await stopVM(name);
        setSnackbar({ open: true, message: `VM ${name} stopped successfully.` });
      }
    } catch (err: any) {
      setVmError((prev) => ({ ...prev, [id]: err?.response?.data?.message || err.message || `Failed to ${action} VM` }));
    } finally {
      setVmLoading((prev) => ({ ...prev, [id]: { ...prev[id], [action]: false } }));
    }
  };

  return (
    <Box p={4}>
      <Typography variant="h4" gutterBottom>
        Server Portal Dashboard
      </Typography>
      <Paper sx={{ p: 3, mt: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Register New Server
        </Typography>
        <Box component="form" onSubmit={handleRegister} display="flex" gap={2} alignItems="center">
          <TextField
            label="Server Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            size="small"
          />
          <TextField
            label="IP Address"
            name="ip"
            value={form.ip}
            onChange={handleChange}
            required
            size="small"
          />
          <Button type="submit" variant="contained" color="primary" disabled={registering}>
            {registering ? <CircularProgress size={20} /> : "Register"}
          </Button>
        </Box>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Registered Servers
        </Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <Stack spacing={2}>
            {servers.length === 0 ? (
              <Typography color="text.secondary">No servers registered yet.</Typography>
            ) : (
              servers.map((server) => (
                <Paper key={server.id || server.name} sx={{ p: 2, mb: 2 }}>
                  <Typography>{server.name} ({server.ip})</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1, mb: 1, mr: 2 }}
                    onClick={() => handleFetchMetrics(server.id || server.name)}
                    disabled={metricsLoading[server.id || server.name]}
                  >
                    {metricsLoading[server.id || server.name] ? <CircularProgress size={16} /> : "Fetch Metrics"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ mt: 1, mb: 1, mr: 2 }}
                    onClick={() => handleLoadUsers(server.id || server.name)}
                  >
                    Show Users
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    size="small"
                    sx={{ mt: 1, mb: 1, mr: 2 }}
                    onClick={() => handleVmAction(server.id || server.name, server.name, 'start')}
                    disabled={vmLoading[server.id || server.name]?.start}
                  >
                    {vmLoading[server.id || server.name]?.start ? <CircularProgress size={16} /> : "Start VM"}
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    sx={{ mt: 1, mb: 1, mr: 2 }}
                    onClick={() => handleVmAction(server.id || server.name, server.name, 'stop')}
                    disabled={vmLoading[server.id || server.name]?.stop}
                  >
                    {vmLoading[server.id || server.name]?.stop ? <CircularProgress size={16} /> : "Stop VM"}
                  </Button>
                  {vmError[server.id || server.name] && (
                    <Alert severity="error" sx={{ mt: 1 }}>{vmError[server.id || server.name]}</Alert>
                  )}
                  {metricsError[server.id || server.name] && (
                    <Alert severity="error" sx={{ mt: 1 }}>{metricsError[server.id || server.name]}</Alert>
                  )}
                  {metrics[server.id || server.name] && (
                    <Box sx={{ mt: 1, bgcolor: 'background.paper', p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle2">Metrics:</Typography>
                      <pre style={{ margin: 0, fontSize: 14 }}>
                        {JSON.stringify(metrics[server.id || server.name], null, 2)}
                      </pre>
                    </Box>
                  )}
                  {usersLoading[server.id || server.name] && <CircularProgress size={16} sx={{ ml: 2 }} />}
                  {usersError[server.id || server.name] && (
                    <Alert severity="error" sx={{ mt: 1 }}>{usersError[server.id || server.name]}</Alert>
                  )}
                  {users[server.id || server.name] && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2">Users:</Typography>
                      <List dense>
                        {users[server.id || server.name].map((user) => (
                          <ListItem key={user.username}>
                            <ListItemText primary={user.username} />
                            <ListItemSecondaryAction>
                              <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteUser(server.id || server.name, user.username)} disabled={deleteUserLoading[server.id || server.name]?.[user.username]}>
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                      <Box component="form" onSubmit={(e) => handleAddUser(server.id || server.name, e)} display="flex" gap={1} alignItems="center" mt={1}>
                        <TextField
                          label="Username"
                          name="username"
                          value={addUserForm[server.id || server.name]?.username || ""}
                          onChange={(e) => handleAddUserChange(server.id || server.name, e)}
                          size="small"
                          required
                        />
                        <Button type="submit" variant="contained" size="small" disabled={addUserLoading[server.id || server.name]}>
                          {addUserLoading[server.id || server.name] ? <CircularProgress size={16} /> : "Add User"}
                        </Button>
                      </Box>
                      {addUserError[server.id || server.name] && (
                        <Alert severity="error" sx={{ mt: 1 }}>{addUserError[server.id || server.name]}</Alert>
                      )}
                    </Box>
                  )}
                </Paper>
              ))
            )}
          </Stack>
        )}
      </Paper>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ open: false, message: "" })}
        message={snackbar.message}
      />
    </Box>
  );
}

import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  TextField,
  Button,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { fetchServers } from './api';

export default function Profile() {
  const [serverCount, setServerCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: '',
  });

  useEffect(() => {
    // Load user from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setFormData({
            username: userData.username || '',
            email: userData.email || '',
            role: userData.role || '',
          });
        } catch (err) {
          console.error('Failed to parse user data:', err);
          setError('Failed to load user data');
        }
      } else {
        setError('No user data found. Please login again.');
      }
    }
    setLoading(false);
  }, []);

  // Fetch server count for statistics
  useEffect(() => {
    const loadServerCount = async () => {
      try {
        const response = await fetchServers();
        setServerCount(response.data.length);
      } catch (err) {
        console.error('Failed to load server count:', err);
      }
    };
    loadServerCount();
  }, []);

  const handleEdit = () => {
    setEditing(true);
    setSuccess('');
    setError('');
  };

  const handleCancel = () => {
    setEditing(false);
    // Reset form to original user data
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        role: user.role || '',
      });
    }
  };

  const handleSave = () => {
    // Update user in localStorage (client-side only)
    const updatedUser = { ...user, ...formData };
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    setUser(updatedUser);
    setEditing(false);
    setSuccess('Profile updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">No user data found. Please login again.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 1 }}>
          My Profile
        </Typography>
        <Typography variant="body1" color="text.secondary">
          View and manage your personal information
        </Typography>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: 3 }}>
        {/* Profile Card */}
        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" flexDirection="column" alignItems="center" sx={{ py: 2 }}>
                <Avatar
                  sx={{
                    width: 140,
                    height: 140,
                    bgcolor: 'primary.main',
                    fontSize: '4rem',
                    fontWeight: 'bold',
                    mb: 2.5,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  }}
                >
                  {user.username?.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="h5" fontWeight="bold" gutterBottom>
                  {user.username}
                </Typography>
                <Chip
                  label={user.role || 'user'}
                  color={user.role === 'admin' ? 'error' : 'primary'}
                  icon={user.role === 'admin' ? <AdminIcon /> : <PersonIcon />}
                  sx={{ mb: 2, fontWeight: 600 }}
                />
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                  {user.email || 'No email provided'}
                </Typography>
              </Box>

              <Divider sx={{ my: 3 }} />

              <Box>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom sx={{ mb: 2 }}>
                  Account Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box display="flex" alignItems="flex-start" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1.5, mt: 0.5, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        User ID
                      </Typography>
                      <Typography variant="body2" fontWeight="500">#{user.id}</Typography>
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="flex-start" sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <EmailIcon fontSize="small" sx={{ mr: 1.5, mt: 0.5, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Email Address
                      </Typography>
                      <Typography variant="body2" fontWeight="500">{user.email || 'Not set'}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Edit Profile Form */}
        <Box>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} sx={{ mb: 3 }}>
                <Typography variant="h6" fontWeight="bold">
                  Profile Details
                </Typography>
                {!editing ? (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                    sx={{ px: 3 }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      color="inherit"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSave}
                      sx={{ px: 3 }}
                    >
                      Save Changes
                    </Button>
                  </Box>
                )}
              </Box>

              <Divider sx={{ mb: 4 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
                <TextField
                  fullWidth
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={!editing}
                  InputProps={{
                    startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                  }}
                />
                <Box sx={{ gridColumn: { xs: '1', sm: '1 / -1' } }}>
                  <TextField
                    fullWidth
                    label="Role"
                    name="role"
                    value={formData.role}
                    disabled
                    helperText="Role cannot be changed"
                    InputProps={{
                      startAdornment: <AdminIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 4 }} />

              <Box>
                <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mb: 3 }}>
                  Account Statistics
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      borderColor: 'primary.main',
                      borderWidth: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(144, 202, 249, 0.25)',
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="h3" color="primary.main" fontWeight="bold" sx={{ mb: 1 }}>
                        {serverCount}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight="500">
                        Servers Managed
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      borderColor: 'success.main',
                      borderWidth: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(76, 175, 80, 0.25)',
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="h3" color="success.main" fontWeight="bold" sx={{ mb: 1 }}>
                        {serverCount > 0 ? serverCount : 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight="500">
                        Active Servers
                      </Typography>
                    </CardContent>
                  </Card>
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      height: '100%',
                      borderColor: 'warning.main',
                      borderWidth: 2,
                      transition: 'all 0.3s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(255, 152, 0, 0.25)',
                      }
                    }}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="h3" color="warning.main" fontWeight="bold" sx={{ mb: 1 }}>
                        0
                      </Typography>
                      <Typography variant="body2" color="text.secondary" fontWeight="500">
                        Alerts Today
                      </Typography>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}


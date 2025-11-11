import { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Switch,
  FormControlLabel,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Palette as PaletteIcon,
  Language as LanguageIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  DataUsage as DataUsageIcon,
  CloudQueue as LiveIcon,
  Science as DemoIcon,
} from '@mui/icons-material';

export default function Settings() {
  const [success, setSuccess] = useState('');
  const [expanded, setExpanded] = useState<string | false>('dataMode');

  // Data Mode Settings (Demo vs Live)
  const [dataMode, setDataMode] = useState<'demo' | 'live'>('demo');

  // General Settings
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');

  // Notification Settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState('immediate');

  // Security Settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // Appearance Settings
  const [theme, setTheme] = useState('dark');
  const [compactMode, setCompactMode] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        if (settings.dataMode) setDataMode(settings.dataMode);
        if (settings.general) {
          setLanguage(settings.general.language || 'en');
          setTimezone(settings.general.timezone || 'UTC');
        }
        if (settings.notifications) {
          setEmailNotifications(settings.notifications.emailNotifications ?? true);
          setPushNotifications(settings.notifications.pushNotifications ?? false);
          setAlertFrequency(settings.notifications.alertFrequency || 'immediate');
        }
        if (settings.security) {
          setTwoFactorAuth(settings.security.twoFactorAuth ?? false);
          setSessionTimeout(settings.security.sessionTimeout || '30');
        }
        if (settings.appearance) {
          setTheme(settings.appearance.theme || 'dark');
          setCompactMode(settings.appearance.compactMode ?? false);
        }
      }
    }
  }, []);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage (client-side only)
    const settings = {
      dataMode,
      general: { language, timezone },
      notifications: { emailNotifications, pushNotifications, alertFrequency },
      security: { twoFactorAuth, sessionTimeout },
      appearance: { theme, compactMode },
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('userSettings', JSON.stringify(settings));
    }
    setSuccess('Settings saved successfully! The page will reload to apply changes.');
    setTimeout(() => {
      setSuccess('');
      window.location.reload(); // Reload to apply data mode changes
    }, 2000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
        <SettingsIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight="bold">
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your application preferences and configurations
          </Typography>
        </Box>
      </Box>

      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Data Mode Settings - Most Important */}
      <Accordion expanded={expanded === 'dataMode'} onChange={handleAccordionChange('dataMode')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center" sx={{ width: '100%' }}>
            <DataUsageIcon sx={{ mr: 2, color: 'info.main' }} />
            <Box>
              <Typography variant="h6">Data Mode</Typography>
              <Typography variant="caption" color="text.secondary">
                Switch between demo data and live server monitoring
              </Typography>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            <Chip
              icon={dataMode === 'demo' ? <DemoIcon /> : <LiveIcon />}
              label={dataMode === 'demo' ? 'Demo Mode' : 'Live Mode'}
              color={dataMode === 'demo' ? 'warning' : 'success'}
              sx={{ mr: 2 }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ width: '100%' }}>
            <Card variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'action.hover', borderColor: 'divider' }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                ℹ️ What is Data Mode?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                This setting controls whether the application displays demo/mock data or connects to real servers for live monitoring.
              </Typography>
            </Card>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
              {/* Demo Mode Card */}
              <Box>
              <Card
                variant="outlined"
                onClick={() => setDataMode('demo')}
                sx={{
                  p: 3,
                  height: '100%',
                  cursor: 'pointer',
                  border: dataMode === 'demo' ? 2 : 1,
                  borderColor: dataMode === 'demo' ? 'warning.main' : 'divider',
                  backgroundColor: dataMode === 'demo' ? 'rgba(255, 152, 0, 0.08)' : 'background.paper',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'warning.main',
                    backgroundColor: 'rgba(255, 152, 0, 0.12)',
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
              >
                <Box display="flex" alignItems="center" mb={2}>
                  <DemoIcon sx={{ fontSize: 40, mr: 2, color: 'warning.main' }} />
                  <Box>
                    <Typography variant="h6">Demo Mode</Typography>
                    {dataMode === 'demo' && (
                      <Chip label="Active" size="small" color="warning" sx={{ mt: 0.5 }} />
                    )}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Perfect for testing, presentations, and demos. Shows realistic mock data without requiring actual server connections.
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                  <Typography component="li" variant="caption" color="text.secondary">
                    ✅ No server setup required
                  </Typography>
                  <Typography component="li" variant="caption" color="text.secondary">
                    ✅ Safe for demonstrations
                  </Typography>
                  <Typography component="li" variant="caption" color="text.secondary">
                    ✅ Consistent test data
                  </Typography>
                  <Typography component="li" variant="caption" color="text.secondary">
                    ✅ Great for development
                  </Typography>
                </Box>
              </Card>
              </Box>

              {/* Live Mode Card */}
              <Box>
              <Card
                variant="outlined"
                onClick={() => setDataMode('live')}
                sx={{
                  p: 3,
                  height: '100%',
                  cursor: 'pointer',
                  border: dataMode === 'live' ? 2 : 1,
                  borderColor: dataMode === 'live' ? 'success.main' : 'divider',
                  backgroundColor: dataMode === 'live' ? 'rgba(76, 175, 80, 0.08)' : 'background.paper',
                  transition: 'all 0.3s',
                  '&:hover': {
                    borderColor: 'success.main',
                    backgroundColor: 'rgba(76, 175, 80, 0.12)',
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
              >
                <Box display="flex" alignItems="center" mb={2}>
                  <LiveIcon sx={{ fontSize: 40, mr: 2, color: 'success.main' }} />
                  <Box>
                    <Typography variant="h6">Live Mode</Typography>
                    {dataMode === 'live' && (
                      <Chip label="Active" size="small" color="success" sx={{ mt: 0.5 }} />
                    )}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Connect to real servers and monitor actual system metrics in real-time. Requires proper server configuration.
                </Typography>
                <Box component="ul" sx={{ pl: 2, mt: 1 }}>
                  <Typography component="li" variant="caption" color="text.secondary">
                    📊 Real-time server data
                  </Typography>
                  <Typography component="li" variant="caption" color="text.secondary">
                    🔄 Live metric updates
                  </Typography>
                  <Typography component="li" variant="caption" color="text.secondary">
                    ⚠️ Requires server access
                  </Typography>
                  <Typography component="li" variant="caption" color="text.secondary">
                    🔐 Production monitoring
                  </Typography>
                </Box>
              </Card>
              </Box>
            </Box>

            <Alert severity="info">
              <Typography variant="body2">
                <strong>Note:</strong> After changing the data mode, the page will reload to apply the changes. All your other settings will be preserved.
              </Typography>
            </Alert>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* General Settings */}
      <Accordion expanded={expanded === 'general'} onChange={handleAccordionChange('general')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center">
            <LanguageIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Box>
              <Typography variant="h6">General Settings</Typography>
              <Typography variant="caption" color="text.secondary">
                Language, timezone, and regional preferences
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Language</InputLabel>
                <Select
                  value={language}
                  label="Language"
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="es">Spanish</MenuItem>
                  <MenuItem value="fr">French</MenuItem>
                  <MenuItem value="de">German</MenuItem>
                  <MenuItem value="ja">Japanese</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select
                  value={timezone}
                  label="Timezone"
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <MenuItem value="UTC">UTC (Coordinated Universal Time)</MenuItem>
                  <MenuItem value="EST">EST (Eastern Standard Time)</MenuItem>
                  <MenuItem value="PST">PST (Pacific Standard Time)</MenuItem>
                  <MenuItem value="GMT">GMT (Greenwich Mean Time)</MenuItem>
                  <MenuItem value="IST">IST (Indian Standard Time)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Notifications */}
      <Accordion expanded={expanded === 'notifications'} onChange={handleAccordionChange('notifications')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center">
            <NotificationsIcon sx={{ mr: 2, color: 'warning.main' }} />
            <Box>
              <Typography variant="h6">Notification Settings</Typography>
              <Typography variant="caption" color="text.secondary">
                Configure how you receive alerts and updates
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    color="primary"
                  />
                }
                label="Email Notifications"
              />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                Receive server alerts and updates via email
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={pushNotifications}
                    onChange={(e) => setPushNotifications(e.target.checked)}
                    color="primary"
                  />
                }
                label="Push Notifications"
              />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                Get real-time push notifications in your browser
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Alert Frequency</InputLabel>
                <Select
                  value={alertFrequency}
                  label="Alert Frequency"
                  onChange={(e) => setAlertFrequency(e.target.value)}
                >
                  <MenuItem value="immediate">Immediate</MenuItem>
                  <MenuItem value="hourly">Hourly Digest</MenuItem>
                  <MenuItem value="daily">Daily Digest</MenuItem>
                  <MenuItem value="weekly">Weekly Summary</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Security */}
      <Accordion expanded={expanded === 'security'} onChange={handleAccordionChange('security')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center">
            <SecurityIcon sx={{ mr: 2, color: 'error.main' }} />
            <Box>
              <Typography variant="h6">Security Settings</Typography>
              <Typography variant="caption" color="text.secondary">
                Manage authentication and security preferences
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={twoFactorAuth}
                    onChange={(e) => setTwoFactorAuth(e.target.checked)}
                    color="primary"
                  />
                }
                label="Two-Factor Authentication (2FA)"
              />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                Add an extra layer of security to your account
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Session Timeout</InputLabel>
                <Select
                  value={sessionTimeout}
                  label="Session Timeout"
                  onChange={(e) => setSessionTimeout(e.target.value)}
                >
                  <MenuItem value="15">15 minutes</MenuItem>
                  <MenuItem value="30">30 minutes</MenuItem>
                  <MenuItem value="60">1 hour</MenuItem>
                  <MenuItem value="240">4 hours</MenuItem>
                  <MenuItem value="never">Never</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                Password Management
              </Typography>
              <Button variant="outlined" sx={{ mt: 1 }}>
                Change Password
              </Button>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Appearance */}
      <Accordion expanded={expanded === 'appearance'} onChange={handleAccordionChange('appearance')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box display="flex" alignItems="center">
            <PaletteIcon sx={{ mr: 2, color: 'success.main' }} />
            <Box>
              <Typography variant="h6">Appearance Settings</Typography>
              <Typography variant="caption" color="text.secondary">
                Customize the look and feel of your dashboard
              </Typography>
            </Box>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={theme}
                  label="Theme"
                  onChange={(e) => setTheme(e.target.value)}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto (System)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={compactMode}
                    onChange={(e) => setCompactMode(e.target.checked)}
                    color="primary"
                  />
                }
                label="Compact Mode"
              />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                Reduce spacing and padding for a more compact interface
              </Typography>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Save Button */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
        >
          Save All Settings
        </Button>
      </Box>
    </Box>
  );
}


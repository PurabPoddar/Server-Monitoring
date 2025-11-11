import React, { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Button,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  ListItemIcon,
  Chip,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Login as LoginIcon,
  AccountCircle,
  Settings as SettingsIcon,
} from "@mui/icons-material";
import Sidebar, { drawerWidth } from "./Sidebar";
import Logo from "../assets/logo.svg";

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const isMenuOpen = Boolean(anchorEl);

  useEffect(() => {
    // Load sidebar state from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('sidebarOpen');
      if (savedState !== null) {
        setSidebarOpen(JSON.parse(savedState));
      }
    }
  }, []);

  useEffect(() => {
    // Load user from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (err) {
          console.error('Failed to parse user data:', err);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Save sidebar state to localStorage (client-side only)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
    }
  }, [sidebarOpen]);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
    setUser(null);
    handleMenuClose();
    navigate('/login');
  };

  const handleLogin = () => {
    handleMenuClose();
    navigate('/login');
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate('/settings');
  };

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          boxShadow: 'none',
          zIndex: 1400,
          width: '100%',
          top: 0,
          left: 0,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle sidebar"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ 
              mr: 2, 
              color: 'text.primary',
              backgroundColor: sidebarOpen ? 'primary.main' : 'action.hover',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: sidebarOpen ? 'primary.dark' : 'action.selected',
              }
            }}
          >
            <MenuIcon sx={{ fontSize: '1.5rem' }} />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ color: 'text.primary', flexGrow: 1 }}>
            Server Monitoring Portal
          </Typography>

          {/* User Profile Section */}
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.primary' }}>
                  {user.username}
                </Typography>
                {user.role && (
                  <Chip 
                    label={user.role} 
                    size="small" 
                    color="primary" 
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Box>
              <IconButton
                onClick={handleProfileMenuOpen}
                size="small"
                sx={{ ml: 1 }}
                aria-controls={isMenuOpen ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={isMenuOpen ? 'true' : undefined}
              >
                <Avatar 
                  sx={{ 
                    width: 36, 
                    height: 36, 
                    bgcolor: 'primary.main',
                    fontSize: '1rem',
                    fontWeight: 'bold'
                  }}
                >
                  {user.username?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Box>
          ) : (
            <Button
              color="inherit"
              startIcon={<LoginIcon />}
              onClick={handleLogin}
              sx={{ 
                color: 'text.primary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                }
              }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={isMenuOpen}
        onClose={handleMenuClose}
        onClick={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            minWidth: 200,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
            '&:before': {
              content: '""',
              display: 'block',
              position: 'absolute',
              top: 0,
              right: 14,
              width: 10,
              height: 10,
              bgcolor: 'background.paper',
              transform: 'translateY(-50%) rotate(45deg)',
              zIndex: 0,
            },
          },
        }}
      >
        {/* User Info Header */}
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" fontWeight="bold">
            {user?.username || 'User'}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {user?.email || 'No email'}
          </Typography>
          {user?.role && (
            <Chip 
              label={user.role} 
              size="small" 
              color="primary" 
              sx={{ mt: 0.5, height: 18, fontSize: '0.65rem' }}
            />
          )}
        </Box>

        <Divider />

        {/* Menu Items */}
        <MenuItem onClick={handleProfile}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          My Profile
        </MenuItem>
        <MenuItem onClick={handleSettings}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen} 
        onClose={handleDrawerToggle}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          backgroundColor: 'background.default',
          marginLeft: sidebarOpen ? `${drawerWidth}px` : 0,
          transition: 'margin-left 0.3s ease-in-out',
          paddingTop: '64px', // Account for fixed AppBar height
          marginTop: 0,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

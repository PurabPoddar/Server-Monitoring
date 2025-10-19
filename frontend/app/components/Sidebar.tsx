import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Home,
  Dashboard,
  Analytics,
  Computer,
  Add,
  Menu as MenuIcon,
  Close as CloseIcon,
  PushPin,
  PushPinOutlined,
  Assessment,
} from "@mui/icons-material";
import Logo from "../assets/logo.svg";

const drawerWidth = 280;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('xl'));



  const navigationItems = [
    {
      text: 'Home',
      icon: <Home />,
      path: '/',
    },
    {
      text: 'Dashboard',
      icon: <Dashboard />,
      path: '/dashboard',
    },
    {
      text: 'Metrics & Analytics',
      icon: <Analytics />,
      path: '/metrics',
    },
    {
      text: 'Server Management',
      icon: <Computer />,
      path: '/servers',
    },
    {
      text: 'Register Server',
      icon: <Add />,
      path: '/register',
    },
    {
      text: 'Reports',
      icon: <Assessment />,
      path: '/reports',
    },
  ];

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <Box sx={{ flex: 1, overflow: 'auto', pt: '64px' }}>
        <List sx={{ px: 2, py: 1, pt: 3 }}>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  sx={{
                    borderRadius: 2,
                    backgroundColor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'primary.contrastText' : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.dark' : 'action.hover',
                    },
                    transition: 'all 0.2s ease-in-out',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      minWidth: 40,
                      fontSize: '1.2rem',
                      '& .MuiSvgIcon-root': {
                        fontSize: '1.2rem',
                      },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontWeight: isActive ? 600 : 400,
                        fontSize: '0.95rem',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Footer */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
          Server Monitoring Portal v1.0
        </Typography>
        <Typography variant="caption" color="text.secondary" textAlign="center" display="block" sx={{ mt: 0.5 }}>
          Professional Server Management
        </Typography>
      </Box>
    </Box>
  );

  // Render sidebar when open
  if (open) {
    return (
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: drawerWidth,
          height: '100vh',
          backgroundColor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          zIndex: 1200,
          overflow: 'auto',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
        }}
      >
        {drawerContent}
      </Box>
    );
  }
  
  return null;
}

export { drawerWidth };

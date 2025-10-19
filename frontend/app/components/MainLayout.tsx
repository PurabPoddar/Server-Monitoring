import React, { useState, useEffect } from "react";
import { Outlet } from "react-router";
import {
  Box,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import Sidebar, { drawerWidth } from "./Sidebar";
import Logo from "../assets/logo.svg";

export default function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('xl'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
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
              backgroundColor: mobileOpen ? 'primary.main' : 'action.hover',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: mobileOpen ? 'primary.dark' : 'action.selected',
              }
            }}
          >
            <MenuIcon sx={{ fontSize: '1.5rem' }} />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ color: 'text.primary' }}>
            Server Monitoring Portal
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Sidebar 
        open={mobileOpen} 
        onClose={handleDrawerToggle}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: '100vh',
          backgroundColor: 'background.default',
          marginLeft: mobileOpen ? `${drawerWidth}px` : 0,
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

import React from "react";
import { Link } from "react-router";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Container,
} from "@mui/material";
import {
  Computer,
  Dashboard,
  Storage,
  Security,
  Analytics,
} from "@mui/icons-material";

export default function Home() {
  return (
    <Container maxWidth="lg">
      <Box py={8}>
        {/* Hero Section */}
        <Box textAlign="center" mb={8}>
          <Typography variant="h2" component="h1" gutterBottom color="primary">
            Server Monitoring Portal
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Professional server monitoring and management solution
          </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
                Monitor your servers' performance, manage users, and track system metrics 
                with our comprehensive monitoring platform. Use the sidebar navigation to 
                explore different sections of the portal.
              </Typography>
        </Box>

        {/* Features Section */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 4, mb: 8 }}>
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <Computer sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Server Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Register and manage multiple servers with support for both Linux and Windows systems.
                Monitor server status, performance metrics, and system health in real-time.
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <Dashboard sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Professional Dashboard
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Comprehensive dashboard with professional charts and graphs showing 
                CPU usage, memory consumption, disk utilization, and network statistics.
              </Typography>
            </CardContent>
          </Card>
          
          <Card sx={{ height: '100%', textAlign: 'center' }}>
            <CardContent>
              <Security sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                User Management
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Manage user accounts across your servers. Add, remove, and monitor 
                user access with secure authentication and authorization controls.
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* About Section */}
        <Card>
          <CardContent>
            <Typography variant="h4" gutterBottom textAlign="center">
              About Server Monitoring Portal
            </Typography>
            <Typography variant="body1" paragraph>
              Our Server Monitoring Portal is designed to provide IT administrators and system 
              managers with comprehensive tools for monitoring and managing their server infrastructure. 
              Whether you're managing a small business network or a large enterprise environment, 
              our platform offers the insights and control you need.
            </Typography>
            <Typography variant="body1" paragraph>
              The platform supports both Linux and Windows servers, providing real-time monitoring 
              of critical system metrics including CPU usage, memory consumption, disk utilization, 
              and network performance. Our professional dashboard presents this data in clear, 
              actionable visualizations that help you make informed decisions about your infrastructure.
            </Typography>
            <Typography variant="body1">
              Built with modern web technologies and a focus on user experience, the Server 
              Monitoring Portal combines powerful functionality with an intuitive interface, 
              making server management accessible to both technical and non-technical users.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
}

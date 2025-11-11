import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("signup", "routes/signup.tsx"),
  index("routes/home.tsx"),
  route("dashboard", "routes/dashboard.tsx"),
  route("servers", "routes/servers.tsx"),
  route("register", "routes/register.tsx"),
  route("metrics", "routes/metrics.tsx"),
  route("reports", "routes/reports.tsx"),
  route("profile", "routes/profile.tsx"),
  route("settings", "routes/settings.tsx"),
] satisfies RouteConfig;

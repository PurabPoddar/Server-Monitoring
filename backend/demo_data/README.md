# Demo Data Module

This module contains organized demo/mock data for the Server Monitoring application.

## Purpose

The demo data module provides realistic test data that can be used:
- **For demonstrations and presentations**
- **During development without real servers**
- **For UI/UX testing**
- **For onboarding and training**

## Structure

### `__init__.py`
Main package file that exports all demo data functions.

### `servers.py`
Contains demo server data including:
- 10 pre-configured demo servers
- Various server types (web, database, API, cache, etc.)
- Different statuses (online, offline, warning)
- Multiple OS types (Linux, Windows)
- Different locations (US-East, US-West, EU-Central)

**Functions:**
- `get_demo_servers()` - Returns list of all demo servers
- `get_demo_server_by_id(server_id)` - Get a specific server

### `metrics.py`
Generates realistic server metrics:
- CPU usage (with per-core breakdown)
- Memory utilization
- Disk usage
- Network activity (bytes sent/received, packets)
- Network interfaces
- Timestamps

**Functions:**
- `generate_demo_metrics(server)` - Generate metrics for a server
- `generate_demo_historical_metrics(server, days)` - Generate historical data

### `users.py`
Manages demo user data:
- Linux users (root, admin, deploy, webapp, etc.)
- Windows users (Administrator, admin, deploy, etc.)
- User metadata (UID, home directory, status, last login)
- Customized users based on server type

**Functions:**
- `get_demo_users(server)` - Get users for a server
- `get_demo_user_by_username(server, username)` - Get specific user

## Usage

### Backend Usage

```python
from demo_data import get_demo_servers, generate_demo_metrics, get_demo_users

# Get all demo servers
servers = get_demo_servers()

# Generate metrics for a server
metrics = generate_demo_metrics(servers[0])

# Get users for a server
users = get_demo_users(servers[0])
```

### API Integration

The backend automatically uses demo data when:
- The `X-Data-Mode: demo` header is present
- The `mode=demo` query parameter is set
- Demo mode is enabled in settings (default)

## Demo Data Characteristics

### Servers
- **Total Count:** 10 servers
- **Status Distribution:** 7 online, 1 warning, 1 offline, 1 staging
- **OS Distribution:** 9 Linux, 1 Windows
- **Locations:** US-East, US-West, EU-Central

### Metrics
- **CPU:** 5-95% usage, realistic per-core variance
- **Memory:** 10-95% usage, varies by server type
- **Disk:** 15-95% usage, higher for backup servers
- **Network:** Realistic traffic patterns (5-15 GB)

### Users
- **Linux Servers:** 3-5 users (root, admin, service accounts)
- **Windows Servers:** 3-4 users (Administrator, admin, deploy)
- **Status:** 90% active, 10% inactive
- **Last Login:** Random timestamps (0-30 days ago)

## Customization

To customize demo data:

1. **Add/Modify Servers:** Edit `DEMO_SERVERS` in `servers.py`
2. **Adjust Metrics:** Modify ranges in `generate_demo_metrics()` in `metrics.py`
3. **Update Users:** Edit user lists in `users.py`

## Benefits

✅ **No Server Setup Required** - Works out of the box  
✅ **Consistent Data** - Same data across sessions  
✅ **Safe Testing** - No risk to production systems  
✅ **Realistic Patterns** - Mimics real server behavior  
✅ **Easy to Customize** - Simple Python dictionaries  
✅ **Isolated Code** - Separate from live data logic  

## Live Mode

When switching to **Live Mode** in settings:
- All demo data is ignored
- Real servers from database are used
- Actual SSH/WinRM connections are made
- Real-time metrics are collected

## Transition Path

Demo Mode → Live Mode:
1. Go to Settings → Data Mode
2. Select "Live Mode"
3. Configure real servers in "Register Server"
4. Monitor actual infrastructure

Live Mode → Demo Mode:
1. Go to Settings → Data Mode
2. Select "Demo Mode"
3. Use pre-configured demo servers
4. No server credentials needed


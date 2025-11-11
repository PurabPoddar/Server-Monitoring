"""
Demo Server Data
Contains mock server information for demo mode
"""

DEMO_SERVERS = [
    {
        "id": 1,
        "name": "Production Web Server",
        "ip": "192.168.1.100",
        "os_type": "linux",
        "status": "online",
        "cpu_count": 8,
        "total_memory": 16384,  # MB
        "total_disk": 512000,  # MB
        "location": "US-East",
        "description": "Main production web server"
    },
    {
        "id": 2,
        "name": "Database Server",
        "ip": "192.168.1.101",
        "os_type": "linux",
        "status": "online",
        "cpu_count": 16,
        "total_memory": 32768,
        "total_disk": 1024000,
        "location": "US-West",
        "description": "Primary database server"
    },
    {
        "id": 3,
        "name": "Development Server",
        "ip": "192.168.1.102",
        "os_type": "linux",
        "status": "online",
        "cpu_count": 4,
        "total_memory": 8192,
        "total_disk": 256000,
        "location": "EU-Central",
        "description": "Development and testing environment"
    },
    {
        "id": 4,
        "name": "API Gateway",
        "ip": "192.168.1.103",
        "os_type": "linux",
        "status": "online",
        "cpu_count": 8,
        "total_memory": 16384,
        "total_disk": 256000,
        "location": "US-East",
        "description": "API gateway and load balancer"
    },
    {
        "id": 5,
        "name": "Cache Server",
        "ip": "192.168.1.104",
        "os_type": "linux",
        "status": "online",
        "cpu_count": 4,
        "total_memory": 32768,
        "total_disk": 128000,
        "location": "US-East",
        "description": "Redis cache server"
    },
    {
        "id": 6,
        "name": "Backup Server",
        "ip": "192.168.1.105",
        "os_type": "linux",
        "status": "warning",
        "cpu_count": 8,
        "total_memory": 16384,
        "total_disk": 2048000,
        "location": "US-West",
        "description": "Backup and disaster recovery"
    },
    {
        "id": 7,
        "name": "Monitoring Server",
        "ip": "192.168.1.106",
        "os_type": "linux",
        "status": "online",
        "cpu_count": 4,
        "total_memory": 8192,
        "total_disk": 512000,
        "location": "EU-Central",
        "description": "Monitoring and logging server"
    },
    {
        "id": 8,
        "name": "Windows App Server",
        "ip": "192.168.1.107",
        "os_type": "windows",
        "status": "online",
        "cpu_count": 8,
        "total_memory": 16384,
        "total_disk": 512000,
        "location": "US-East",
        "description": "Windows application server"
    },
    {
        "id": 9,
        "name": "Test Server",
        "ip": "192.168.1.108",
        "os_type": "linux",
        "status": "offline",
        "cpu_count": 2,
        "total_memory": 4096,
        "total_disk": 128000,
        "location": "EU-Central",
        "description": "Testing environment"
    },
    {
        "id": 10,
        "name": "Staging Server",
        "ip": "192.168.1.109",
        "os_type": "linux",
        "status": "online",
        "cpu_count": 8,
        "total_memory": 16384,
        "total_disk": 512000,
        "location": "US-West",
        "description": "Staging environment"
    }
]


def get_demo_servers():
    """Return list of demo servers"""
    return DEMO_SERVERS.copy()


def get_demo_server_by_id(server_id):
    """Get a specific demo server by ID"""
    for server in DEMO_SERVERS:
        if server['id'] == server_id:
            return server.copy()
    return None


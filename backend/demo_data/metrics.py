"""
Demo Metrics Data
Contains mock metrics generation for demo mode
"""

import random
from datetime import datetime


def generate_demo_metrics(server):
    """
    Generate realistic demo metrics for a server
    
    Args:
        server: Server object with id, name, os_type, status, etc.
    
    Returns:
        Dictionary containing CPU, memory, disk, and network metrics
    """
    
    # Determine metric ranges based on server status
    if server.get('status') == 'offline':
        return {
            "cpu": {"usage": 0, "cores": []},
            "memory": {"used": 0, "total": server.get('total_memory', 8192), "percent": 0},
            "disk": {"used": 0, "total": server.get('total_disk', 256000), "percent": 0},
            "network": {
                "bytes_sent": 0,
                "bytes_recv": 0,
                "packets_sent": 0,
                "packets_recv": 0,
                "interfaces": []
            }
        }
    
    # Generate realistic CPU metrics based on server type
    cpu_base = 30
    if 'database' in server.get('name', '').lower():
        cpu_base = 60
    elif 'cache' in server.get('name', '').lower():
        cpu_base = 40
    elif 'backup' in server.get('name', '').lower():
        cpu_base = 75
    
    cpu_usage = min(95, max(5, cpu_base + random.randint(-15, 25)))
    
    # Generate per-core CPU usage
    cpu_cores = []
    cpu_count = server.get('cpu_count', 4)
    for i in range(cpu_count):
        core_usage = min(100, max(0, cpu_usage + random.randint(-20, 20)))
        cpu_cores.append({"core": i, "usage": core_usage})
    
    # Generate memory metrics
    total_memory = server.get('total_memory', 8192)
    memory_base = 40
    if 'database' in server.get('name', '').lower():
        memory_base = 70
    elif 'cache' in server.get('name', '').lower():
        memory_base = 80
    
    memory_percent = min(95, max(10, memory_base + random.randint(-10, 15)))
    memory_used = int(total_memory * memory_percent / 100)
    
    # Generate disk metrics
    total_disk = server.get('total_disk', 256000)
    disk_base = 45
    if 'backup' in server.get('name', '').lower():
        disk_base = 85
    elif 'database' in server.get('name', '').lower():
        disk_base = 65
    
    disk_percent = min(95, max(15, disk_base + random.randint(-10, 15)))
    disk_used = int(total_disk * disk_percent / 100)
    
    # Generate network metrics
    network_base = 5000000000  # 5 GB
    if 'api' in server.get('name', '').lower() or 'web' in server.get('name', '').lower():
        network_base = 15000000000  # 15 GB
    
    bytes_sent = random.randint(int(network_base * 0.8), int(network_base * 1.5))
    bytes_recv = random.randint(int(network_base * 0.8), int(network_base * 1.5))
    
    # Generate network interface data
    interface_name = "eth0" if server.get('os_type') == 'linux' else "Ethernet"
    interfaces = [
        {
            "name": interface_name,
            "ip": server.get('ip', '192.168.1.1'),
            "bytes_sent": random.randint(1000000, 50000000),
            "bytes_received": random.randint(1000000, 50000000),
            "packets_sent": random.randint(10000, 100000),
            "packets_received": random.randint(10000, 100000)
        }
    ]
    
    # Add secondary interface for some servers
    if random.random() > 0.5:
        interfaces.append({
            "name": "eth1" if server.get('os_type') == 'linux' else "Ethernet 2",
            "ip": f"10.0.0.{random.randint(1, 254)}",
            "bytes_sent": random.randint(500000, 10000000),
            "bytes_received": random.randint(500000, 10000000),
            "packets_sent": random.randint(5000, 50000),
            "packets_received": random.randint(5000, 50000)
        })
    
    return {
        "cpu": {
            "usage": cpu_usage,
            "usage_percent": cpu_usage,  # For compatibility
            "cores": cpu_cores,
            "load_avg": [round(random.uniform(0.5, 2.0), 2) for _ in range(3)]
        },
        "memory": {
            "used": memory_used,
            "used_gb": round(memory_used / 1024, 1),
            "total": total_memory,
            "total_gb": round(total_memory / 1024, 1),
            "percent": memory_percent,
            "usage_percent": memory_percent,  # For compatibility
            "available_gb": round((total_memory - memory_used) / 1024, 1)
        },
        "disk": {
            "used": disk_used,
            "used_gb": round(disk_used / 1024, 1),
            "total": total_disk,
            "total_gb": round(total_disk / 1024, 1),
            "percent": disk_percent,
            "usage_percent": disk_percent,  # For compatibility
            "mount_point": "/" if server.get('os_type') == 'linux' else "C:"
        },
        "network": {
            "bytes_sent": bytes_sent,
            "bytes_recv": bytes_recv,
            "packets_sent": random.randint(100000, 5000000),
            "packets_recv": random.randint(100000, 5000000),
            "interfaces": interfaces
        },
        "uptime": {
            "days": random.randint(1, 365),
            "hours": random.randint(0, 23),
            "minutes": random.randint(0, 59)
        },
        "processes": {
            "total": random.randint(50, 300),
            "running": random.randint(1, 20),
            "sleeping": random.randint(40, 250)
        },
        "timestamp": datetime.utcnow().isoformat(),
        "server_id": server.get('id'),
        "hostname": server.get('name'),
        "status": server.get('status', 'online')
    }


def generate_demo_historical_metrics(server, days=7):
    """
    Generate historical metrics data for charts
    
    Args:
        server: Server object
        days: Number of days of historical data
    
    Returns:
        List of metric snapshots over time
    """
    historical_data = []
    
    for day in range(days):
        for hour in range(0, 24, 2):  # Every 2 hours
            metrics = generate_demo_metrics(server)
            metrics['timestamp'] = f"Day {day}, {hour:02d}:00"
            historical_data.append(metrics)
    
    return historical_data


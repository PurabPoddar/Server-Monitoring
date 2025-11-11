"""
Demo Users Data
Contains mock user information for servers in demo mode
"""

import random
from datetime import datetime, timedelta


# Common usernames for different server types
LINUX_USERS = [
    {"username": "root", "uid": "0", "home_directory": "/root", "status": "active"},
    {"username": "admin", "uid": "1000", "home_directory": "/home/admin", "status": "active"},
    {"username": "deploy", "uid": "1001", "home_directory": "/home/deploy", "status": "active"},
    {"username": "webapp", "uid": "1002", "home_directory": "/var/www", "status": "active"},
    {"username": "dbuser", "uid": "1003", "home_directory": "/home/dbuser", "status": "active"},
    {"username": "nginx", "uid": "33", "home_directory": "/var/www", "status": "active"},
    {"username": "postgres", "uid": "999", "home_directory": "/var/lib/postgresql", "status": "active"},
    {"username": "redis", "uid": "998", "home_directory": "/var/lib/redis", "status": "active"},
]

WINDOWS_USERS = [
    {"username": "Administrator", "uid": "500", "home_directory": "C:\\Users\\Administrator", "status": "active"},
    {"username": "admin", "uid": "1000", "home_directory": "C:\\Users\\admin", "status": "active"},
    {"username": "deploy", "uid": "1001", "home_directory": "C:\\Users\\deploy", "status": "active"},
    {"username": "webapp", "uid": "1002", "home_directory": "C:\\inetpub\\webapp", "status": "active"},
]


def generate_last_login():
    """Generate a realistic last login timestamp"""
    days_ago = random.randint(0, 30)
    hours_ago = random.randint(0, 23)
    minutes_ago = random.randint(0, 59)
    
    last_login = datetime.utcnow() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
    
    if days_ago == 0:
        if hours_ago == 0:
            return f"{minutes_ago} minutes ago"
        return f"{hours_ago} hours ago"
    elif days_ago == 1:
        return "1 day ago"
    elif days_ago < 7:
        return f"{days_ago} days ago"
    else:
        return last_login.strftime("%Y-%m-%d %H:%M")


def get_demo_users(server):
    """
    Get demo users for a specific server
    
    Args:
        server: Server object with id, name, os_type, etc.
    
    Returns:
        List of user dictionaries
    """
    
    # Return empty list for offline servers
    if server.get('status') == 'offline':
        return []
    
    os_type = server.get('os_type', 'linux')
    
    # Select appropriate user set based on OS
    if os_type == 'windows':
        base_users = WINDOWS_USERS.copy()
    else:
        base_users = LINUX_USERS.copy()
    
    # Customize users based on server type
    server_name = server.get('name', '').lower()
    users = []
    
    if 'database' in server_name:
        # Database servers have DB-related users
        users = [u for u in base_users if u['username'] in ['root', 'admin', 'dbuser', 'postgres']]
    elif 'web' in server_name or 'api' in server_name:
        # Web servers have web-related users
        users = [u for u in base_users if u['username'] in ['root', 'admin', 'deploy', 'webapp', 'nginx']]
    elif 'cache' in server_name:
        # Cache servers have cache-related users
        users = [u for u in base_users if u['username'] in ['root', 'admin', 'redis']]
    else:
        # Default: select random 3-5 users
        num_users = random.randint(3, min(5, len(base_users)))
        users = random.sample(base_users, num_users)
    
    # Add last login times
    for user in users:
        user['last_login'] = generate_last_login()
        
        # Some users might be inactive
        if random.random() < 0.1:  # 10% chance
            user['status'] = 'inactive'
    
    return users


def get_demo_user_by_username(server, username):
    """
    Get a specific user from a server
    
    Args:
        server: Server object
        username: Username to find
    
    Returns:
        User dictionary or None
    """
    users = get_demo_users(server)
    for user in users:
        if user['username'] == username:
            return user
    return None


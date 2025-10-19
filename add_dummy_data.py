#!/usr/bin/env python3
"""
Script to add dummy data to the database for testing the UI.
"""
from backend.app import app
from backend.db import db
from backend.models import Server
from datetime import datetime, timedelta
import random

def add_dummy_data():
    with app.app_context():
        # Clear existing data
        Server.query.delete()
        db.session.commit()
        
        # Create dummy servers
        dummy_servers = [
            {
                "hostname": "web-server-01",
                "name": "Production Web Server",
                "ip": "192.168.1.100",
                "os_type": "linux",
                "username": "ubuntu",
                "auth_type": "key",
                "key_path": "/home/user/.ssh/id_rsa",
                "status": "online",
                "last_seen": datetime.utcnow() - timedelta(minutes=5),
                "notes": "Main production web server running Apache"
            },
            {
                "hostname": "db-server-01",
                "name": "Database Server",
                "ip": "192.168.1.101",
                "os_type": "linux",
                "username": "postgres",
                "auth_type": "key",
                "key_path": "/home/user/.ssh/db_key",
                "status": "online",
                "last_seen": datetime.utcnow() - timedelta(minutes=2),
                "notes": "PostgreSQL database server"
            },
            {
                "hostname": "WIN-SERVER-01",
                "name": "Windows File Server",
                "ip": "192.168.1.102",
                "os_type": "windows",
                "username": "Administrator",
                "auth_type": "password",
                "key_path": None,
                "status": "online",
                "last_seen": datetime.utcnow() - timedelta(minutes=1),
                "notes": "Windows Server 2019 file sharing"
            },
            {
                "hostname": "monitoring-01",
                "name": "Monitoring Server",
                "ip": "192.168.1.103",
                "os_type": "linux",
                "username": "monitor",
                "auth_type": "key",
                "key_path": "/home/user/.ssh/monitor_key",
                "status": "offline",
                "last_seen": datetime.utcnow() - timedelta(hours=2),
                "notes": "Nagios monitoring server - currently offline"
            },
            {
                "hostname": "backup-server-01",
                "name": "Backup Server",
                "ip": "192.168.1.104",
                "os_type": "linux",
                "username": "backup",
                "auth_type": "key",
                "key_path": "/home/user/.ssh/backup_key",
                "status": "online",
                "last_seen": datetime.utcnow() - timedelta(minutes=10),
                "notes": "Daily backup server with 2TB storage"
            },
            {
                "hostname": "DEV-SERVER-01",
                "name": "Development Server",
                "ip": "192.168.1.105",
                "os_type": "windows",
                "username": "developer",
                "auth_type": "password",
                "key_path": None,
                "status": "online",
                "last_seen": datetime.utcnow() - timedelta(minutes=3),
                "notes": "Windows development environment"
            }
        ]
        
        # Add servers to database
        for server_data in dummy_servers:
            server = Server(**server_data)
            db.session.add(server)
        
        db.session.commit()
        print(f"✅ Added {len(dummy_servers)} dummy servers to the database!")
        
        # Print the added servers
        servers = Server.query.all()
        print("\n📋 Added servers:")
        for server in servers:
            print(f"  - {server.name} ({server.hostname}) - {server.ip} - {server.status}")

if __name__ == "__main__":
    add_dummy_data()

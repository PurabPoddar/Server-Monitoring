import os
import subprocess
from flask import Blueprint, jsonify, request

from ..db import db
from ..models import Server
from ..handlers.linux_handler import (
    get_basic_metrics as linux_metrics,
    create_user as linux_create_user,
    list_users as linux_list_users,
    delete_user as linux_delete_user,
    test_connection as linux_test_connection,
    get_detailed_metrics as linux_detailed_metrics,
    execute_command as linux_execute_command,
    restart_service as linux_restart_service,
    start_service as linux_start_service,
    stop_service as linux_stop_service,
    run_health_check as linux_health_check,
)
from ..handlers.windows_handler import (
    get_basic_metrics as windows_metrics,
    create_windows_user,
    list_users as windows_list_users,
    delete_user as windows_delete_user,
)

# Import demo data
from ..demo_data import get_demo_servers, generate_demo_metrics, get_demo_users


server_bp = Blueprint("server_bp", __name__)


def _require_admin():
    token = request.headers.get("X-Admin-Token")
    expected = os.getenv("ADMIN_TOKEN")
    if expected and token != expected:
        return False
    return True


def _is_demo_mode():
    """Check if the request is in demo mode - returns True for demo, False for live"""
    # Check header first (case-insensitive)
    mode_header = request.headers.get("X-Data-Mode") or request.headers.get("x-data-mode", "")
    mode_header = mode_header.strip().lower() if mode_header else ""
    
    # Check query param
    mode_query = request.args.get("mode", "").strip().lower()
    
    # Check body (for POST requests)
    mode_body = ""
    if request.is_json:
        data = request.get_json(silent=True) or {}
        mode_body = str(data.get("mode", "")).strip().lower()
    
    # Determine mode: "live" takes priority, then "demo", then default to demo
    if mode_header == "live" or mode_query == "live" or mode_body == "live":
        return False  # LIVE MODE - return False (not demo)
    
    if mode_header == "demo" or mode_query == "demo" or mode_body == "demo":
        return True  # DEMO MODE - return True (is demo)
    
    # Default to demo mode if nothing specified (safer default)
    return True


@server_bp.route("/servers", methods=["POST"])
def register_server():
    data = request.get_json(force=True)
    required = ["hostname", "ip", "os_type", "username"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400

    # Determine if this is a demo or live server based on the request mode
    is_demo = _is_demo_mode()

    server = Server(
        hostname=data["hostname"],
        name=data.get("name"),
        ip=data["ip"],
        os_type=data["os_type"].lower(),
        username=data["username"],
        auth_type=data.get("auth_type"),
        key_path=data.get("key_path"),
        notes=data.get("notes"),
        is_demo=is_demo,
    )
    db.session.add(server)
    db.session.commit()
    return jsonify({"id": server.id}), 201


@server_bp.route("/servers", methods=["GET"])
def list_servers():
    """List servers - returns demo data in demo mode, real data in live mode"""
    is_demo = _is_demo_mode()
    mode_header = request.headers.get("X-Data-Mode") or request.headers.get("x-data-mode", "NOT-SET")
    
    # LIVE MODE - return ONLY live servers from database (is_demo=False), NEVER demo data
    if not is_demo:
        servers = Server.query.filter_by(is_demo=False).order_by(Server.id.desc()).all()
        server_list = [s.to_dict() for s in servers]
        return jsonify(server_list)
    
    # DEMO MODE - return ONLY demo servers, NEVER real data
    demo_servers = get_demo_servers()
    for server in demo_servers:
        server['metrics'] = generate_demo_metrics(server)
    return jsonify(demo_servers)


@server_bp.route("/servers/<int:server_id>/metrics", methods=["GET"])  # credentials via query/body
def fetch_metrics(server_id: int):
    """Fetch metrics for a specific server"""
    is_demo = _is_demo_mode()
    data = request.get_json(silent=True) or {}
    # Support query params for GET requests
    if not data:
        data = request.args.to_dict()

    # DEMO MODE - return ONLY demo metrics
    if is_demo:
        from ..demo_data.servers import get_demo_server_by_id
        demo_server = get_demo_server_by_id(server_id)
        if not demo_server:
            return jsonify({"error": "Server not found"}), 404
        metrics = generate_demo_metrics(demo_server)
        return jsonify(metrics)
    
    # LIVE MODE - fetch real server and metrics, NEVER demo data
    server = Server.query.get_or_404(server_id)
    
    # In live mode, reject demo servers
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    # Check for legacy mock mode parameter for backward compatibility
    mock_mode = data.get("mock", "false").lower() == "true"
    if mock_mode:
        import random
        import time
        
        # Generate realistic mock data based on server status
        if server.status == "offline":
            return jsonify({
                "error": "Server is offline",
                "status": "offline",
                "last_check": time.time()
            }), 503
        
        # Mock metrics for online servers
        cpu_usage = random.uniform(20, 80) if server.status == "online" else random.uniform(80, 100)
        memory_usage = random.uniform(30, 90) if server.status == "online" else random.uniform(90, 100)
        
        mock_metrics = {
            "server_id": server_id,
            "hostname": server.hostname,
            "status": server.status,
            "timestamp": time.time(),
            "cpu": {
                "usage_percent": round(cpu_usage, 1),
                "cores": 4 if server.os_type == "linux" else 8,
                "load_avg": [round(random.uniform(0.5, 2.0), 2) for _ in range(3)]
            },
            "memory": {
                "total_gb": 16 if server.os_type == "linux" else 32,
                "used_gb": round(memory_usage * 0.16, 1) if server.os_type == "linux" else round(memory_usage * 0.32, 1),
                "usage_percent": round(memory_usage, 1),
                "available_gb": round((100 - memory_usage) * 0.16, 1) if server.os_type == "linux" else round((100 - memory_usage) * 0.32, 1)
            },
            "disk": {
                "total_gb": 500,
                "used_gb": round(random.uniform(100, 400), 1),
                "usage_percent": round(random.uniform(20, 80), 1),
                "mount_point": "/" if server.os_type == "linux" else "C:"
            },
            "network": {
                "bytes_sent": random.randint(1000000000, 10000000000),
                "bytes_recv": random.randint(1000000000, 10000000000),
                "packets_sent": random.randint(100000, 1000000),
                "packets_recv": random.randint(100000, 1000000),
                "interfaces": [
                    {
                        "name": "eth0" if server.os_type == "linux" else "Ethernet",
                        "ip": server.ip,
                        "bytes_sent": random.randint(1000000, 10000000),
                        "bytes_received": random.randint(1000000, 10000000),
                        "packets_sent": random.randint(1000, 10000),
                        "packets_received": random.randint(1000, 10000)
                    }
                ]
            },
            "uptime": {
                "days": random.randint(1, 30),
                "hours": random.randint(0, 23),
                "minutes": random.randint(0, 59)
            },
            "processes": {
                "total": random.randint(50, 200),
                "running": random.randint(1, 10),
                "sleeping": random.randint(40, 180)
            }
        }
        return jsonify(mock_metrics)

    # Real metrics (original code)
    if server.os_type == "linux":
        host = server.ip
        user = server.username
        # Support both key-based and password-based auth
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        
        # Check if we have either key_path or password
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        # Get port (default 22)
        port = int(data.get("port", 22))
        
        try:
            metrics = linux_metrics(host, user, key_path, password, port)
            # Update server status and last_seen on successful connection
            server.status = "online"
            from datetime import datetime
            server.last_seen = datetime.utcnow()
            db.session.commit()
            return jsonify(metrics)
        except Exception as exc:  # noqa: WPS429
            # Update server status to offline on connection failure
            server.status = "offline"
            db.session.commit()
            return jsonify({"error": str(exc)}), 500
    elif server.os_type == "windows":
        host = server.ip
        username = server.username
        password = data.get("password")
        if not password:
            return jsonify({"error": "password required for windows"}), 400
        try:
            metrics = windows_metrics(host, username, password)
            return jsonify(metrics)
        except Exception as exc:  # noqa: WPS429
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Unsupported os_type"}), 400


@server_bp.route("/servers/<int:server_id>/users", methods=["GET"])  # list users on remote host
def list_remote_users(server_id: int):
    """List users on a remote server"""
    is_demo = _is_demo_mode()
    data = request.get_json(silent=True) or {}
    if not data:
        data = request.args.to_dict()

    # DEMO MODE - return ONLY demo users
    if is_demo:
        from ..demo_data.servers import get_demo_server_by_id
        demo_server = get_demo_server_by_id(server_id)
        if not demo_server:
            return jsonify({"error": "Server not found"}), 404
        users = get_demo_users(demo_server)
        return jsonify({"users": users})
    
    # LIVE MODE - fetch real server and users, NEVER demo data
    server = Server.query.get_or_404(server_id)
    
    # In live mode, reject demo servers
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    # Check for legacy mock mode parameter for backward compatibility
    mock_mode = data.get("mock", "false").lower() == "true"
    if mock_mode:
        import random
        
        # Generate realistic mock users based on server type and status
        if server.status == "offline":
            return jsonify({
                "error": "Server is offline",
                "status": "offline",
                "users": []
            }), 503
        
        # Mock users for different server types
        if server.os_type == "linux":
            base_users = ["root", "ubuntu", "www-data", "postgres", "nginx", "redis"]
            additional_users = ["developer", "admin", "monitor", "backup", "deploy"]
        else:  # windows
            base_users = ["Administrator", "SYSTEM", "Guest"]
            additional_users = ["developer", "admin", "service_account", "backup_user"]
        
        # Randomly select users (always include base users, randomly add more)
        mock_users = base_users.copy()
        if random.choice([True, False]):  # 50% chance to add more users
            mock_users.extend(random.sample(additional_users, random.randint(1, 3)))
        
        # Add some random user IDs and additional info
        users_with_info = []
        for user in mock_users:
            user_info = {
                "username": user,
                "uid": random.randint(1000, 9999) if server.os_type == "linux" else None,
                "home_directory": f"/home/{user}" if server.os_type == "linux" else f"C:\\Users\\{user}",
                "shell": "/bin/bash" if server.os_type == "linux" else None,
                "last_login": f"{random.randint(1, 30)} days ago",
                "groups": ["sudo", "docker"] if server.os_type == "linux" and user in ["ubuntu", "developer"] else ["users"],
                "status": "active" if random.choice([True, True, True, False]) else "inactive"  # 75% active
            }
            users_with_info.append(user_info)
        
        return jsonify({
            "server_id": server_id,
            "server_name": server.name or server.hostname,
            "os_type": server.os_type,
            "total_users": len(users_with_info),
            "active_users": len([u for u in users_with_info if u["status"] == "active"]),
            "users": users_with_info
        })

    # Real users (original code)
    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        port = int(data.get("port", 22))
        
        try:
            out = linux_list_users(server.ip, server.username, key_path, password, port)
            users = [u for u in out.splitlines() if u.strip()]
            return jsonify({"users": users})
        except Exception as exc:  # noqa: WPS429
            return jsonify({"error": str(exc)}), 500
    elif server.os_type == "windows":
        password = data.get("password")
        if not password:
            return jsonify({"error": "password required for windows"}), 400
        try:
            out = windows_list_users(server.ip, server.username, password)
            users = [u.strip() for u in out.splitlines()[1:] if u.strip()]
            return jsonify({"users": users})
        except Exception as exc:  # noqa: WPS429
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Unsupported os_type"}), 400


@server_bp.route("/servers/<int:server_id>/users", methods=["POST"])  # add user on remote host
def add_remote_user(server_id: int):
    is_demo = _is_demo_mode()
    if is_demo:
        return jsonify({"error": "Cannot add users in demo mode"}), 403
    
    server = Server.query.get_or_404(server_id)
    
    # In live mode, reject demo servers
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    data = request.get_json(force=True) or {}
    newuser = data.get("newuser")
    newpass = data.get("newpass")
    if not newuser or not newpass:
        return jsonify({"error": "newuser and newpass required"}), 400

    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        port = int(data.get("port", 22))
        
        try:
            linux_create_user(server.ip, server.username, newuser, newpass, key_path, password, port)
            return jsonify({"status": "created"}), 201
        except Exception as exc:  # noqa: WPS429
            return jsonify({"error": str(exc)}), 500
    elif server.os_type == "windows":
        password = data.get("password")
        if not password:
            return jsonify({"error": "password required for windows"}), 400
        try:
            out = create_windows_user(server.ip, server.username, password, newuser, newpass)
            return jsonify({"status": "created", "output": out}), 201
        except Exception as exc:  # noqa: WPS429
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Unsupported os_type"}), 400


@server_bp.route("/servers/<int:server_id>/users/<username>", methods=["DELETE"])  # delete user
def delete_remote_user(server_id: int, username: str):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401
    
    is_demo = _is_demo_mode()
    if is_demo:
        return jsonify({"error": "Cannot delete users in demo mode"}), 403
    
    server = Server.query.get_or_404(server_id)
    
    # In live mode, reject demo servers
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    data = request.get_json(silent=True) or {}
    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        port = int(data.get("port", 22))
        
        try:
            linux_delete_user(server.ip, server.username, username, key_path, password, port)
            return jsonify({"status": "deleted"})
        except Exception as exc:  # noqa: WPS429
            return jsonify({"error": str(exc)}), 500
    elif server.os_type == "windows":
        password = data.get("password")
        if not password:
            return jsonify({"error": "password required for windows"}), 400
        try:
            windows_delete_user(server.ip, server.username, password, username)
            return jsonify({"status": "deleted"})
        except Exception as exc:  # noqa: WPS429
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Unsupported os_type"}), 400


@server_bp.route("/servers/<int:server_id>/test-connection", methods=["POST"])
def test_server_connection(server_id: int):
    """Test SSH connection to a server"""
    is_demo = _is_demo_mode()
    
    if is_demo:
        return jsonify({"success": True, "message": "Demo mode - connection test skipped"}), 200
    
    server = Server.query.get_or_404(server_id)
    
    # In live mode, reject demo servers
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    data = request.get_json(silent=True) or {}
    
    if server.os_type != "linux":
        return jsonify({"error": "Connection testing currently only supported for Linux servers"}), 400
    
    # Get authentication credentials
    key_path = data.get("key_path") or server.key_path
    password = data.get("password")
    
    if not key_path and not password:
        return jsonify({"error": "key_path or password required"}), 400
    
    port = int(data.get("port", 22))
    
    try:
        success, message = linux_test_connection(server.ip, server.username, key_path, password, port)
        
        # Update server status based on connection test result
        from datetime import datetime
        if success:
            server.status = "online"
            server.last_seen = datetime.utcnow()
        else:
            server.status = "offline"
        
        db.session.commit()
        
        return jsonify({
            "success": success,
            "message": message,
            "status": server.status
        }), 200 if success else 500
    except Exception as exc:
        server.status = "offline"
        db.session.commit()
        return jsonify({"success": False, "error": str(exc)}), 500


@server_bp.route("/servers/<int:server_id>/status", methods=["PATCH"])
def update_server_status(server_id: int):
    """Manually update server status"""
    is_demo = _is_demo_mode()
    
    if is_demo:
        return jsonify({"error": "Cannot update status in demo mode"}), 400
    
    server = Server.query.get_or_404(server_id)
    
    # In live mode, reject demo servers
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    data = request.get_json(silent=True) or {}
    
    new_status = data.get("status")
    if new_status not in ["online", "offline", "warning"]:
        return jsonify({"error": "Invalid status. Must be 'online', 'offline', or 'warning'"}), 400
    
    server.status = new_status
    if new_status == "online":
        from datetime import datetime
        server.last_seen = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify({
        "id": server.id,
        "status": server.status,
        "last_seen": server.last_seen.isoformat() + "Z" if server.last_seen else None
    }), 200


@server_bp.route("/servers/<int:server_id>/detailed-metrics", methods=["GET"])
def get_detailed_metrics(server_id: int):
    """Get detailed metrics including top processes, network interfaces, disk partitions, and system info"""
    is_demo = _is_demo_mode()
    
    # DEMO MODE - return demo detailed metrics
    if is_demo:
        from ..demo_data.servers import get_demo_server_by_id
        demo_server = get_demo_server_by_id(server_id)
        if not demo_server:
            return jsonify({"error": "Server not found"}), 404
        # Return mock detailed metrics for demo
        return jsonify({
            "top_processes": [
                {"pid": 1234, "name": "nginx", "cpu": 5.2, "memory": 2.1, "user": "www-data"},
                {"pid": 5678, "name": "mysql", "cpu": 3.1, "memory": 8.5, "user": "mysql"}
            ],
            "network_interfaces": [
                {"name": "eth0", "ip": "192.168.1.100", "rx_bytes": 1000000, "tx_bytes": 2000000, "rx_packets": 1000, "tx_packets": 2000}
            ],
            "disk_partitions": [
                {"filesystem": "/dev/sda1", "total_gb": 100, "used_gb": 50, "available_gb": 50, "usage_percent": 50, "mount": "/"}
            ],
            "system_info": {
                "os": "Ubuntu 22.04 LTS",
                "kernel": "5.15.0",
                "hostname": demo_server.get("hostname", "demo-server"),
                "uptime_days": 10
            }
        })
    
    # LIVE MODE - fetch real detailed metrics
    server = Server.query.get_or_404(server_id)
    
    # In live mode, reject demo servers
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    if server.os_type == "linux":
        data = request.get_json(silent=True) or {}
        if not data:
            data = request.args.to_dict()
        
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        port = int(data.get("port", 22))
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        try:
            detailed_metrics = linux_detailed_metrics(server.ip, server.username, key_path, password, port)
            return jsonify(detailed_metrics)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Detailed metrics only supported for Linux servers"}), 400


@server_bp.route("/servers/<int:server_id>/execute-command", methods=["POST"])
def execute_server_command(server_id: int):
    """Execute a custom command on the server"""
    is_demo = _is_demo_mode()
    
    if is_demo:
        return jsonify({"error": "Command execution not available in demo mode"}), 403
    
    server = Server.query.get_or_404(server_id)
    
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    data = request.get_json(force=True)
    command = data.get("command")
    
    if not command:
        return jsonify({"error": "command is required"}), 400
    
    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        port = int(data.get("port", 22))
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        try:
            result = linux_execute_command(server.ip, server.username, command, key_path, password, port)
            return jsonify(result)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Command execution only supported for Linux servers"}), 400


@server_bp.route("/servers/<int:server_id>/quick-actions/restart-service", methods=["POST"])
def restart_server_service(server_id: int):
    """Restart a systemd service on the server"""
    is_demo = _is_demo_mode()
    
    if is_demo:
        return jsonify({"error": "Service restart not available in demo mode"}), 403
    
    server = Server.query.get_or_404(server_id)
    
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    data = request.get_json(force=True)
    service_name = data.get("service_name")
    
    if not service_name:
        return jsonify({"error": "service_name is required"}), 400
    
    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        port = int(data.get("port", 22))
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        try:
            result = linux_restart_service(server.ip, server.username, service_name, key_path, password, port)
            return jsonify(result)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Service restart only supported for Linux servers"}), 400


@server_bp.route("/servers/<int:server_id>/quick-actions/start-service", methods=["POST"])
def start_server_service(server_id: int):
    """Start a systemd service on the server"""
    is_demo = _is_demo_mode()
    
    if is_demo:
        return jsonify({"error": "Service start not available in demo mode"}), 403
    
    server = Server.query.get_or_404(server_id)
    
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    data = request.get_json(force=True)
    service_name = data.get("service_name")
    
    if not service_name:
        return jsonify({"error": "service_name is required"}), 400
    
    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        port = int(data.get("port", 22))
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        try:
            result = linux_start_service(server.ip, server.username, service_name, key_path, password, port)
            return jsonify(result)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Service start only supported for Linux servers"}), 400


@server_bp.route("/servers/<int:server_id>/quick-actions/stop-service", methods=["POST"])
def stop_server_service(server_id: int):
    """Stop a systemd service on the server"""
    is_demo = _is_demo_mode()
    
    if is_demo:
        return jsonify({"error": "Service stop not available in demo mode"}), 403
    
    server = Server.query.get_or_404(server_id)
    
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    data = request.get_json(force=True)
    service_name = data.get("service_name")
    
    if not service_name:
        return jsonify({"error": "service_name is required"}), 400
    
    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        port = int(data.get("port", 22))
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        try:
            result = linux_stop_service(server.ip, server.username, service_name, key_path, password, port)
            return jsonify(result)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Service stop only supported for Linux servers"}), 400


@server_bp.route("/servers/<int:server_id>/quick-actions/health-check", methods=["POST"])
def run_server_health_check(server_id: int):
    """Run system health checks on the server"""
    is_demo = _is_demo_mode()
    
    if is_demo:
        return jsonify({
            "disk": {"status": "ok", "usage_percent": 45, "message": "Disk usage: 45%"},
            "memory": {"status": "ok", "usage_percent": 60, "message": "Memory usage: 60%"},
            "load": {"status": "ok", "load_average": 0.5, "cores": 4, "message": "Load average: 0.5 (cores: 4)"}
        })
    
    server = Server.query.get_or_404(server_id)
    
    if server.is_demo:
        return jsonify({"error": "Demo server not accessible in live mode"}), 403
    
    if server.os_type == "linux":
        data = request.get_json(silent=True) or {}
        if not data:
            data = request.args.to_dict()
        
        key_path = data.get("key_path") or server.key_path
        password = data.get("password")
        port = int(data.get("port", 22))
        
        if not key_path and not password:
            return jsonify({"error": "key_path or password required for linux"}), 400
        
        try:
            health_checks = linux_health_check(server.ip, server.username, key_path, password, port)
            return jsonify(health_checks)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500
    else:
        return jsonify({"error": "Health check only supported for Linux servers"}), 400


# VM control via VBoxManage
def _vbm(*args):
    return subprocess.check_output(["VBoxManage", *args])


@server_bp.route("/vm/<name>/start", methods=["POST"])  # admin-only
def vm_start(name: str):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401
    try:
        subprocess.run(["VBoxManage", "startvm", name, "--type", "headless"], check=True)
        return jsonify({"name": name, "status": "starting"})
    except subprocess.CalledProcessError as exc:
        return jsonify({"error": str(exc)}), 500


@server_bp.route("/vm/<name>/stop", methods=["POST"])  # admin-only
def vm_stop(name: str):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401
    try:
        subprocess.run(["VBoxManage", "controlvm", name, "acpipowerbutton"], check=True)
        return jsonify({"name": name, "status": "stopping"})
    except subprocess.CalledProcessError as exc:
        return jsonify({"error": str(exc)}), 500


@server_bp.route("/vm/<name>/status", methods=["GET"])  # admin-only
def vm_status(name: str):
    if not _require_admin():
        return jsonify({"error": "unauthorized"}), 401
    try:
        out = subprocess.check_output(["VBoxManage", "showvminfo", name, "--machinereadable"]).decode()
        state = "running" if 'VMState="running"' in out else "poweroff"
        return jsonify({"name": name, "state": state})
    except subprocess.CalledProcessError as exc:
        return jsonify({"error": str(exc)}), 500



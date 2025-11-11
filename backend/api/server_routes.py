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
)
from ..handlers.windows_handler import (
    get_basic_metrics as windows_metrics,
    create_windows_user,
    list_users as windows_list_users,
    delete_user as windows_delete_user,
)


server_bp = Blueprint("server_bp", __name__)


def _require_admin():
    token = request.headers.get("X-Admin-Token")
    expected = os.getenv("ADMIN_TOKEN")
    if expected and token != expected:
        return False
    return True


@server_bp.route("/servers", methods=["POST"])
def register_server():
    data = request.get_json(force=True)
    required = ["hostname", "ip", "os_type", "username"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400

    server = Server(
        hostname=data["hostname"],
        name=data.get("name"),
        ip=data["ip"],
        os_type=data["os_type"].lower(),
        username=data["username"],
        auth_type=data.get("auth_type"),
        key_path=data.get("key_path"),
        notes=data.get("notes"),
    )
    db.session.add(server)
    db.session.commit()
    return jsonify({"id": server.id}), 201


@server_bp.route("/servers", methods=["GET"])
def list_servers():
    servers = Server.query.order_by(Server.id.desc()).all()
    return jsonify([s.to_dict() for s in servers])


@server_bp.route("/servers/<int:server_id>/metrics", methods=["GET"])  # credentials via query/body
def fetch_metrics(server_id: int):
    server = Server.query.get_or_404(server_id)
    data = request.get_json(silent=True) or {}
    # Support query params for GET requests
    if not data:
        data = request.args.to_dict()

    # Mock metrics for testing UI (remove this in production)
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
        key_path = data.get("key_path")
        if not key_path:
            return jsonify({"error": "key_path required for linux"}), 400
        try:
            metrics = linux_metrics(host, user, key_path)
            return jsonify(metrics)
        except Exception as exc:  # noqa: WPS429
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
    server = Server.query.get_or_404(server_id)
    data = request.get_json(silent=True) or {}
    if not data:
        data = request.args.to_dict()

    # Mock users for testing UI (remove this in production)
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
        if not key_path:
            return jsonify({"error": "key_path required for linux"}), 400
        try:
            out = linux_list_users(server.ip, server.username, key_path)
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
    server = Server.query.get_or_404(server_id)
    data = request.get_json(force=True) or {}
    newuser = data.get("newuser")
    newpass = data.get("newpass")
    if not newuser or not newpass:
        return jsonify({"error": "newuser and newpass required"}), 400

    if server.os_type == "linux":
        key_path = data.get("key_path")
        if not key_path:
            return jsonify({"error": "key_path required for linux"}), 400
        try:
            linux_create_user(server.ip, server.username, key_path, newuser, newpass)
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
    server = Server.query.get_or_404(server_id)
    data = request.get_json(silent=True) or {}
    if server.os_type == "linux":
        key_path = data.get("key_path") or server.key_path
        if not key_path:
            return jsonify({"error": "key_path required for linux"}), 400
        try:
            linux_delete_user(server.ip, server.username, key_path, username)
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



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



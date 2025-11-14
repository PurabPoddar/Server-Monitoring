from datetime import datetime
import os
import base64
from cryptography.fernet import Fernet
from .db import db


def _get_encryption_key():
    """Get or create encryption key for password storage"""
    key = os.getenv("SERVER_PASSWORD_KEY")
    if not key:
        # Generate a key if not set (for development only - should be set in production)
        key = Fernet.generate_key().decode()
        print(f"WARNING: SERVER_PASSWORD_KEY not set. Generated key: {key}")
        print("Set SERVER_PASSWORD_KEY in .env file for production use!")
    else:
        key = key.encode() if isinstance(key, str) else key
    return key


def encrypt_password(password: str) -> str:
    """Encrypt password for storage"""
    if not password:
        return ""
    try:
        f = Fernet(_get_encryption_key())
        encrypted = f.encrypt(password.encode())
        return base64.b64encode(encrypted).decode()
    except Exception as e:
        print(f"Encryption error: {e}")
        return ""


def decrypt_password(encrypted_password: str) -> str:
    """Decrypt stored password"""
    if not encrypted_password:
        return ""
    try:
        f = Fernet(_get_encryption_key())
        encrypted_bytes = base64.b64decode(encrypted_password.encode())
        decrypted = f.decrypt(encrypted_bytes)
        return decrypted.decode()
    except Exception as e:
        print(f"Decryption error: {e}")
        return ""


class Server(db.Model):
    __tablename__ = "servers"

    id = db.Column(db.Integer, primary_key=True)
    hostname = db.Column(db.String(255), nullable=False)
    # New, preferred display name
    name = db.Column(db.String(255), nullable=True)
    ip = db.Column(db.String(64), nullable=False)
    os_type = db.Column(db.String(32), nullable=False)  # e.g., linux, windows
    username = db.Column(db.String(128), nullable=False)
    # Auth
    auth_type = db.Column(db.String(32), nullable=True)  # key | password
    key_path = db.Column(db.String(1024), nullable=True)
    # Encrypted password storage (for Windows and Linux password auth)
    encrypted_password = db.Column(db.Text, nullable=True)
    # WinRM port for Windows servers
    winrm_port = db.Column(db.Integer, nullable=True, default=5985)
    # SSH port for Linux servers
    ssh_port = db.Column(db.Integer, nullable=True, default=22)
    # Status
    status = db.Column(db.String(64), nullable=True)
    last_seen = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    is_demo = db.Column(db.Boolean, default=False, nullable=False)
    
    def get_password(self) -> str:
        """Get decrypted password"""
        if self.encrypted_password:
            return decrypt_password(self.encrypted_password)
        return ""
    
    def set_password(self, password: str):
        """Set encrypted password"""
        if password:
            self.encrypted_password = encrypt_password(password)
        else:
            self.encrypted_password = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "hostname": self.hostname,
            "name": self.name,
            "ip": self.ip,
            "os_type": self.os_type,
            "username": self.username,
            "auth_type": self.auth_type,
            "key_path": self.key_path,
            "has_password": bool(self.encrypted_password),  # Don't expose actual password
            "winrm_port": self.winrm_port if hasattr(self, 'winrm_port') else None,
            "ssh_port": self.ssh_port if hasattr(self, 'ssh_port') else None,
            "status": self.status,
            "last_seen": self.last_seen.isoformat() + "Z" if self.last_seen else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() + "Z",
            "is_demo": self.is_demo,
        }



from datetime import datetime
from .db import db


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
    # Status
    status = db.Column(db.String(64), nullable=True)
    last_seen = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

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
            "status": self.status,
            "last_seen": self.last_seen.isoformat() + "Z" if self.last_seen else None,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() + "Z",
        }



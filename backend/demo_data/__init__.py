"""
Demo Data Package
Contains all demo/mock data for the Server Monitoring application
"""

from .servers import get_demo_servers
from .metrics import generate_demo_metrics
from .users import get_demo_users

__all__ = ['get_demo_servers', 'generate_demo_metrics', 'get_demo_users']


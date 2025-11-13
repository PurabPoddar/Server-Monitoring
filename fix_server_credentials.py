#!/usr/bin/env python3
"""
Script to help fix server credentials by testing different usernames
and updating the server record if needed.
"""

import sys
import json
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError
import paramiko

API_BASE = "http://localhost:5001/api"

def test_ssh_connection(host, username, password, port=22):
    """Test SSH connection with given credentials"""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        client.connect(
            hostname=host,
            username=username,
            password=password,
            port=port,
            timeout=10,
            allow_agent=False,
            look_for_keys=False
        )
        # Test command
        stdin, stdout, stderr = client.exec_command("echo 'connection_test'")
        result = stdout.read().decode()
        client.close()
        if "connection_test" in result:
            return True, "Connection successful!"
        return False, "Connection test failed"
    except paramiko.AuthenticationException:
        return False, "Authentication failed - wrong username or password"
    except Exception as e:
        return False, f"Connection error: {str(e)}"

def get_server_info(server_id):
    """Get server information from API"""
    url = f"{API_BASE}/servers"
    try:
        req = Request(url, headers={"X-Data-Mode": "live"})
        response = urlopen(req)
        servers = json.loads(response.read().decode())
        return next((s for s in servers if s["id"] == server_id), None)
    except Exception as e:
        print(f"Error getting server info: {e}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python fix_server_credentials.py <server_id> [username_to_test]")
        print("\nExample:")
        print("  python fix_server_credentials.py 14")
        print("  python fix_server_credentials.py 14 root")
        print("  python fix_server_credentials.py 14 admin")
        sys.exit(1)
    
    server_id = int(sys.argv[1])
    test_username = sys.argv[2] if len(sys.argv) > 2 else None
    
    print("=" * 60)
    print("Server Credentials Fixer")
    print("=" * 60)
    
    # Get server info
    server = get_server_info(server_id)
    if not server:
        print(f"❌ Server {server_id} not found")
        sys.exit(1)
    
    print(f"\n📋 Current Server Configuration:")
    print(f"   ID: {server['id']}")
    print(f"   Name: {server.get('name') or server.get('hostname')}")
    print(f"   IP: {server.get('ip')}")
    print(f"   Current Username: {server.get('username')}")
    print(f"   Auth Type: {server.get('auth_type')}")
    
    password = input("\n🔐 Enter SSH password: ").strip()
    if not password:
        print("❌ Password is required")
        sys.exit(1)
    
    # Test with current username
    print(f"\n🔍 Testing connection with current username '{server.get('username')}'...")
    success, message = test_ssh_connection(
        server.get('ip'),
        server.get('username'),
        password,
        22
    )
    
    if success:
        print(f"✅ {message}")
        print("\n✅ Your current credentials are correct!")
        print("   The issue might be elsewhere. Try the connection again in the UI.")
        return
    
    print(f"❌ {message}")
    
    # If test username provided, try it
    if test_username:
        print(f"\n🔍 Testing connection with username '{test_username}'...")
        success, message = test_ssh_connection(
            server.get('ip'),
            test_username,
            password,
            22
        )
        if success:
            print(f"✅ {message}")
            print(f"\n✅ Found correct username: '{test_username}'")
            print("\n⚠️  To fix this, you need to:")
            print("   1. Delete server 14 from the UI")
            print("   2. Re-register it with username: " + test_username)
            print("   3. Use password: " + password)
            return
        else:
            print(f"❌ {message}")
    
    # Try common usernames
    print("\n🔍 Trying common usernames...")
    common_usernames = ["root", "admin", "user", "ubuntu", "debian", "centos"]
    
    for username in common_usernames:
        if username == server.get('username'):
            continue  # Skip already tested
        print(f"   Trying '{username}'...", end=" ")
        success, message = test_ssh_connection(
            server.get('ip'),
            username,
            password,
            22
        )
        if success:
            print(f"✅ SUCCESS!")
            print(f"\n✅ Found correct username: '{username}'")
            print("\n⚠️  To fix this, you need to:")
            print("   1. Delete server 14 from the UI")
            print("   2. Re-register it with username: " + username)
            print("   3. Use password: " + password)
            return
        else:
            print("❌")
    
    print("\n❌ Could not find working credentials.")
    print("\nPlease verify:")
    print("   1. The password is correct")
    print("   2. SSH is enabled on the server")
    print("   3. The server is accessible from this machine")
    print("   4. Check the actual username on your Ubuntu server:")
    print("      - SSH into the server")
    print("      - Run: whoami")
    print("      - Use that username when re-registering")

if __name__ == "__main__":
    main()


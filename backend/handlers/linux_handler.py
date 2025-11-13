import paramiko
from typing import Optional


def run_ssh_command(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, cmd: str = "", port: int = 22) -> str:
    """Execute SSH command using either key-based or password authentication"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        if password:
            # Password-based authentication - disable key-based auth
            client.connect(
                hostname=host, 
                username=user, 
                password=password, 
                port=port, 
                timeout=10,
                allow_agent=False,
                look_for_keys=False
            )
        elif key_path:
            # Key-based authentication
            pkey = paramiko.RSAKey.from_private_key_file(key_path)
            client.connect(hostname=host, username=user, pkey=pkey, port=port, timeout=10)
        else:
            raise ValueError("Either key_path or password must be provided")
        
        stdin, stdout, stderr = client.exec_command(cmd)
        out = stdout.read().decode()
        error = stderr.read().decode()
        
        if error and not out:
            raise Exception(f"SSH command failed: {error}")
        
        return out
    finally:
        client.close()


def test_connection(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> tuple[bool, str]:
    """Test SSH connection to server. Returns (success, message)"""
    try:
        result = run_ssh_command(host, user, key_path, password, "echo 'connection_test'", port)
        if "connection_test" in result:
            return True, "Connection successful"
        return False, "Connection test failed: unexpected response"
    except Exception as e:
        error_msg = str(e)
        # Provide more helpful error messages
        if "Authentication failed" in error_msg or "authentication" in error_msg.lower():
            return False, f"Authentication failed. Please verify:\n1. Username is correct (current: '{user}')\n2. Password is correct\n3. User account exists on the server"
        elif "Unable to connect" in error_msg or "Connection refused" in error_msg:
            return False, f"Connection failed: Unable to connect to {host}:{port}. Check:\n1. Server is running and accessible\n2. SSH service is running on the server\n3. Firewall allows connections on port {port}"
        else:
            return False, f"Connection failed: {error_msg}"


def get_basic_metrics(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Get basic server metrics via SSH and return structured data"""
    import re
    import time
    
    # Get CPU usage percentage
    cpu_cmd = "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'"
    cpu_output = run_ssh_command(host, user, key_path, password, cpu_cmd, port)
    try:
        cpu_usage = float(cpu_output.strip().split('\n')[0])
    except:
        # Fallback method
        cpu_cmd2 = "grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$3+$4+$5)} END {print usage}'"
        cpu_output = run_ssh_command(host, user, key_path, password, cpu_cmd2, port)
        try:
            cpu_usage = float(cpu_output.strip())
        except:
            cpu_usage = 0.0
    
    # Get number of CPU cores
    cores_cmd = "nproc"
    cores_output = run_ssh_command(host, user, key_path, password, cores_cmd, port)
    try:
        cpu_cores = int(cores_output.strip())
    except:
        cpu_cores = 1
    
    # Get load average
    loadavg_cmd = "cat /proc/loadavg | awk '{print $1, $2, $3}'"
    loadavg_output = run_ssh_command(host, user, key_path, password, loadavg_cmd, port)
    load_avg = [float(x) for x in loadavg_output.strip().split()[:3]] if loadavg_output.strip() else [0.0, 0.0, 0.0]
    
    # Get memory usage
    mem_cmd = "free -m | awk 'NR==2{printf \"%.2f\", $3*100/$2}'"
    mem_output = run_ssh_command(host, user, key_path, password, mem_cmd, port)
    try:
        memory_usage = float(mem_output.strip())
    except:
        memory_usage = 0.0
    
    # Get memory details
    mem_details_cmd = "free -m | awk 'NR==2{print $2, $3, $4}'"
    mem_details = run_ssh_command(host, user, key_path, password, mem_details_cmd, port)
    try:
        total_mem, used_mem, available_mem = [float(x) for x in mem_details.strip().split()[:3]]
        total_mem_gb = total_mem / 1024
        used_mem_gb = used_mem / 1024
        available_mem_gb = available_mem / 1024
    except:
        total_mem_gb = 0.0
        used_mem_gb = 0.0
        available_mem_gb = 0.0
    
    # Get disk usage
    disk_cmd = "df -h / | awk 'NR==2 {print $5}' | sed 's/%//'"
    disk_output = run_ssh_command(host, user, key_path, password, disk_cmd, port)
    try:
        disk_usage = float(disk_output.strip())
    except:
        disk_usage = 0.0
    
    # Get disk details
    disk_details_cmd = "df -h / | awk 'NR==2 {print $2, $3, $4}'"
    disk_details = run_ssh_command(host, user, key_path, password, disk_details_cmd, port)
    try:
        parts = disk_details.strip().split()
        total_disk_str = parts[0] if len(parts) > 0 else "0G"
        used_disk_str = parts[1] if len(parts) > 1 else "0G"
        available_disk_str = parts[2] if len(parts) > 2 else "0G"
        
        # Convert to GB
        def to_gb(s):
            s_upper = s.upper()
            try:
                if 'G' in s_upper:
                    val = float(s_upper.replace('G', '').replace('I', ''))
                    return val
                elif 'M' in s_upper:
                    val = float(s_upper.replace('M', '').replace('I', ''))
                    return val / 1024
                elif 'K' in s_upper:
                    val = float(s_upper.replace('K', '').replace('I', ''))
                    return val / (1024 * 1024)
                else:
                    return float(s)
            except:
                return 0.0
        
        total_disk_gb = to_gb(parts[0]) if len(parts) > 0 else 0.0
        used_disk_gb = to_gb(parts[1]) if len(parts) > 1 else 0.0
        available_disk_gb = to_gb(parts[2]) if len(parts) > 2 else 0.0
    except:
        total_disk_gb = 0.0
        used_disk_gb = 0.0
        available_disk_gb = 0.0
    
    # Get uptime
    uptime_cmd = "uptime -p 2>/dev/null || uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1, $2}'"
    uptime_output = run_ssh_command(host, user, key_path, password, uptime_cmd, port)
    
    # Get network stats
    network_cmd = "cat /proc/net/dev | awk 'NR>2 {rx+=$2; tx+=$10} END {print rx, tx}'"
    network_output = run_ssh_command(host, user, key_path, password, network_cmd, port)
    try:
        bytes_recv, bytes_sent = [int(x) for x in network_output.strip().split()[:2]]
    except:
        bytes_recv = 0
        bytes_sent = 0
    
    return {
        "server_id": None,  # Will be set by the route
        "hostname": host,
        "status": "online",
        "timestamp": time.time(),
        "cpu": {
            "usage_percent": round(cpu_usage, 1),
            "cores": cpu_cores,
            "load_avg": [round(x, 2) for x in load_avg]
        },
        "memory": {
            "total_gb": round(total_mem_gb, 2),
            "used_gb": round(used_mem_gb, 2),
            "available_gb": round(available_mem_gb, 2),
            "usage_percent": round(memory_usage, 1)
        },
        "disk": {
            "total_gb": round(total_disk_gb, 2),
            "used_gb": round(used_disk_gb, 2),
            "available_gb": round(available_disk_gb, 2),
            "usage_percent": round(disk_usage, 1),
            "mount_point": "/"
        },
        "network": {
            "bytes_sent": bytes_sent,
            "bytes_recv": bytes_recv,
            "packets_sent": 0,
            "packets_recv": 0,
            "interfaces": []
        },
        "uptime": {
            "text": uptime_output.strip() if uptime_output.strip() else "N/A"
        }
    }


def create_user(host: str, user: str, newuser: str, newpass: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> bool:
    """Create a new user on the remote server"""
    run_ssh_command(host, user, key_path, password, f"sudo useradd -m {newuser}", port)
    run_ssh_command(host, user, key_path, password, f"echo '{newuser}:{newpass}' | sudo chpasswd", port)
    return True


def list_users(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> str:
    """List users on the remote server (UID >= 1000)"""
    return run_ssh_command(host, user, key_path, password, "getent passwd | awk -F: '$3 >= 1000 {print $1}'", port)


def delete_user(host: str, user: str, target_user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> bool:
    """Delete a user from the remote server"""
    run_ssh_command(host, user, key_path, password, f"sudo userdel -r {target_user}", port)
    return True


def execute_command(host: str, user: str, command: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Execute an arbitrary command on the remote server and return output"""
    try:
        output = run_ssh_command(host, user, key_path, password, command, port)
        return {"success": True, "output": output, "error": None}
    except Exception as e:
        return {"success": False, "output": None, "error": str(e)}


def get_top_processes(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22, limit: int = 10) -> list:
    """Get top processes by CPU and Memory usage"""
    # Get top processes by CPU
    cmd = f"ps aux --sort=-%cpu | head -n {limit + 1} | tail -n {limit} | awk '{{print $2, $3, $4, $11, $1}}'"
    try:
        output = run_ssh_command(host, user, key_path, password, cmd, port)
        processes = []
        for line in output.strip().split('\n'):
            if line.strip():
                parts = line.strip().split()
                if len(parts) >= 5:
                    processes.append({
                        "pid": int(parts[0]),
                        "cpu": float(parts[1]),
                        "memory": float(parts[2]),
                        "name": parts[3] if len(parts) > 3 else "unknown",
                        "user": parts[4] if len(parts) > 4 else "unknown"
                    })
        return processes[:limit]
    except:
        return []


def get_network_interfaces(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> list:
    """Get detailed network interface statistics"""
    # Get interface stats from /proc/net/dev
    cmd = "cat /proc/net/dev | awk 'NR>2 {print $1, $2, $10, $3, $11}' | sed 's/://'"
    try:
        output = run_ssh_command(host, user, key_path, password, cmd, port)
        interfaces = []
        for line in output.strip().split('\n'):
            if line.strip():
                parts = line.strip().split()
                if len(parts) >= 5:
                    interface_name = parts[0].replace(':', '')
                    # Get IP address for this interface
                    ip_cmd = f"ip addr show {interface_name} 2>/dev/null | grep 'inet ' | awk '{{print $2}}' | cut -d'/' -f1 | head -1"
                    try:
                        ip_output = run_ssh_command(host, user, key_path, password, ip_cmd, port)
                        ip = ip_output.strip() if ip_output.strip() else "N/A"
                    except:
                        ip = "N/A"
                    
                    interfaces.append({
                        "name": interface_name,
                        "ip": ip,
                        "rx_bytes": int(parts[1]),
                        "tx_bytes": int(parts[2]),
                        "rx_packets": int(parts[3]),
                        "tx_packets": int(parts[4])
                    })
        return interfaces
    except:
        return []


def get_disk_partitions(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> list:
    """Get all disk partitions and mount points"""
    cmd = "df -h | awk 'NR>1 {print $1, $2, $3, $4, $5, $6}'"
    try:
        output = run_ssh_command(host, user, key_path, password, cmd, port)
        partitions = []
        for line in output.strip().split('\n'):
            if line.strip():
                parts = line.strip().split()
                if len(parts) >= 6:
                    def to_gb(s):
                        s_upper = s.upper()
                        try:
                            if 'G' in s_upper:
                                return float(s_upper.replace('G', '').replace('I', ''))
                            elif 'M' in s_upper:
                                return float(s_upper.replace('M', '').replace('I', '')) / 1024
                            elif 'K' in s_upper:
                                return float(s_upper.replace('K', '').replace('I', '')) / (1024 * 1024)
                            else:
                                return float(s)
                        except:
                            return 0.0
                    
                    usage_str = parts[4].replace('%', '')
                    try:
                        usage_percent = float(usage_str)
                    except:
                        usage_percent = 0.0
                    
                    partitions.append({
                        "filesystem": parts[0],
                        "total_gb": round(to_gb(parts[1]), 2),
                        "used_gb": round(to_gb(parts[2]), 2),
                        "available_gb": round(to_gb(parts[3]), 2),
                        "usage_percent": usage_percent,
                        "mount": parts[5]
                    })
        return partitions
    except:
        return []


def get_system_info(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Get system information (OS, kernel, hostname, etc.)"""
    try:
        # Get OS info
        os_cmd = "cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '\"'"
        os_output = run_ssh_command(host, user, key_path, password, os_cmd, port)
        os_name = os_output.strip() if os_output.strip() else "Unknown"
        
        # Get kernel version
        kernel_cmd = "uname -r"
        kernel_output = run_ssh_command(host, user, key_path, password, kernel_cmd, port)
        kernel = kernel_output.strip() if kernel_output.strip() else "Unknown"
        
        # Get hostname
        hostname_cmd = "hostname"
        hostname_output = run_ssh_command(host, user, key_path, password, hostname_cmd, port)
        hostname = hostname_output.strip() if hostname_output.strip() else "Unknown"
        
        # Get uptime in days
        uptime_cmd = "uptime -s 2>/dev/null || echo ''"
        uptime_since = run_ssh_command(host, user, key_path, password, uptime_cmd, port)
        uptime_since_str = uptime_since.strip() if uptime_since.strip() else None
        
        # Calculate uptime days
        uptime_days = 0
        if uptime_since_str:
            try:
                from datetime import datetime
                uptime_date = datetime.strptime(uptime_since_str, "%Y-%m-%d %H:%M:%S")
                uptime_days = (datetime.now() - uptime_date).days
            except:
                pass
        
        return {
            "os": os_name,
            "kernel": kernel,
            "hostname": hostname,
            "uptime_days": uptime_days,
            "uptime_since": uptime_since_str
        }
    except Exception as e:
        return {
            "os": "Unknown",
            "kernel": "Unknown",
            "hostname": "Unknown",
            "uptime_days": 0,
            "uptime_since": None
        }


def get_detailed_metrics(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Get detailed metrics including top processes, network interfaces, disk partitions, and system info"""
    return {
        "top_processes": get_top_processes(host, user, key_path, password, port),
        "network_interfaces": get_network_interfaces(host, user, key_path, password, port),
        "disk_partitions": get_disk_partitions(host, user, key_path, password, port),
        "system_info": get_system_info(host, user, key_path, password, port)
    }


def restart_service(host: str, user: str, service_name: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Restart a service (systemd or service command)"""
    try:
        # Check if we're root or if sudo is available
        try:
            whoami_output = run_ssh_command(host, user, key_path, password, "whoami", port)
            is_root = "root" in whoami_output.strip().lower()
        except:
            is_root = False
        
        # Try with sudo first, fallback to without sudo if not available or if root
        sudo_prefix = "" if is_root else "sudo "
        try:
            # Test if sudo is available (if not root)
            if not is_root:
                run_ssh_command(host, user, key_path, password, "which sudo", port)
        except:
            # sudo not available, try without it
            sudo_prefix = ""
        
        # Check if systemd is available - try to check if systemd is actually running
        use_systemd = False
        try:
            # First check if systemctl command exists
            which_check = run_ssh_command(host, user, key_path, password, "which systemctl 2>/dev/null", port)
            if which_check and "systemctl" in which_check.strip():
                # Then check if systemd is actually running by checking PID 1
                try:
                    # Check if PID 1 is systemd
                    pid1_check = run_ssh_command(host, user, key_path, password, "ps -p 1 -o comm= 2>/dev/null", port)
                    if pid1_check and "systemd" in pid1_check.strip().lower():
                        # Double check with a simple systemctl command that won't fail if systemd is running
                        try:
                            systemctl_check = run_ssh_command(host, user, key_path, password, f"{sudo_prefix}systemctl is-system-running 2>&1", port)
                            # If it doesn't contain the error message about systemd not booted, assume it works
                            if systemctl_check and "not been booted with systemd" not in systemctl_check.lower() and "not booted" not in systemctl_check.lower():
                                use_systemd = True
                        except:
                            # If the check fails, systemd is not available
                            use_systemd = False
                except:
                    # If PID check fails, systemd is not available
                    use_systemd = False
        except:
            # systemctl command doesn't exist or check failed
            use_systemd = False
        
        if use_systemd:
            # Use systemctl
            cmd = f"{sudo_prefix}systemctl restart {service_name}"
            output = run_ssh_command(host, user, key_path, password, cmd, port)
            # Check if service is running
            status_cmd = f"{sudo_prefix}systemctl is-active {service_name}"
            status_output = run_ssh_command(host, user, key_path, password, status_cmd, port)
            is_active = "active" in status_output.lower()
        else:
            # Try using service command as fallback
            try:
                cmd = f"{sudo_prefix}service {service_name} restart"
                output = run_ssh_command(host, user, key_path, password, cmd, port)
                # Check status using service command
                status_cmd = f"{sudo_prefix}service {service_name} status"
                status_output = run_ssh_command(host, user, key_path, password, status_cmd, port)
                is_active = "running" in status_output.lower() or "active" in status_output.lower()
            except Exception as e:
                error_msg = str(e)
                # Provide helpful error message for Docker containers
                if "unrecognized service" in error_msg.lower() or "not been booted with systemd" in error_msg.lower():
                    return {
                        "success": False, 
                        "output": None, 
                        "status": "unknown", 
                        "error": "Service management is not available in this Docker container. Docker containers typically don't support systemd or service commands. Use 'Execute Command' instead to manage processes directly (e.g., 'ps aux | grep <process>', 'kill <pid>', or start processes manually)."
                    }
                return {
                    "success": False, 
                    "output": None, 
                    "status": "unknown", 
                    "error": f"Service management not available. Error: {error_msg}"
                }
        
        return {"success": True, "output": output, "status": "active" if is_active else "inactive", "error": None}
    except Exception as e:
        return {"success": False, "output": None, "status": "unknown", "error": str(e)}


def start_service(host: str, user: str, service_name: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Start a service (systemd or service command)"""
    try:
        # Check if we're root or if sudo is available
        try:
            whoami_output = run_ssh_command(host, user, key_path, password, "whoami", port)
            is_root = "root" in whoami_output.strip().lower()
        except:
            is_root = False
        
        # Try with sudo first, fallback to without sudo if not available or if root
        sudo_prefix = "" if is_root else "sudo "
        try:
            # Test if sudo is available (if not root)
            if not is_root:
                run_ssh_command(host, user, key_path, password, "which sudo", port)
        except:
            # sudo not available, try without it
            sudo_prefix = ""
        
        # Check if systemd is available - try to check if systemd is actually running
        use_systemd = False
        try:
            # First check if systemctl command exists
            which_check = run_ssh_command(host, user, key_path, password, "which systemctl 2>/dev/null", port)
            if which_check and "systemctl" in which_check.strip():
                # Then check if systemd is actually running by checking PID 1
                try:
                    # Check if PID 1 is systemd
                    pid1_check = run_ssh_command(host, user, key_path, password, "ps -p 1 -o comm= 2>/dev/null", port)
                    if pid1_check and "systemd" in pid1_check.strip().lower():
                        # Double check with a simple systemctl command that won't fail if systemd is running
                        try:
                            systemctl_check = run_ssh_command(host, user, key_path, password, f"{sudo_prefix}systemctl is-system-running 2>&1", port)
                            # If it doesn't contain the error message about systemd not booted, assume it works
                            if systemctl_check and "not been booted with systemd" not in systemctl_check.lower() and "not booted" not in systemctl_check.lower():
                                use_systemd = True
                        except:
                            # If the check fails, systemd is not available
                            use_systemd = False
                except:
                    # If PID check fails, systemd is not available
                    use_systemd = False
        except:
            # systemctl command doesn't exist or check failed
            use_systemd = False
        
        if use_systemd:
            # Use systemctl
            cmd = f"{sudo_prefix}systemctl start {service_name}"
            output = run_ssh_command(host, user, key_path, password, cmd, port)
            # Check if service is running
            status_cmd = f"{sudo_prefix}systemctl is-active {service_name}"
            status_output = run_ssh_command(host, user, key_path, password, status_cmd, port)
            is_active = "active" in status_output.lower()
        else:
            # Try using service command as fallback
            try:
                cmd = f"{sudo_prefix}service {service_name} start"
                output = run_ssh_command(host, user, key_path, password, cmd, port)
                # Check status using service command
                status_cmd = f"{sudo_prefix}service {service_name} status"
                status_output = run_ssh_command(host, user, key_path, password, status_cmd, port)
                is_active = "running" in status_output.lower() or "active" in status_output.lower()
            except Exception as e:
                error_msg = str(e)
                # Provide helpful error message for Docker containers
                if "unrecognized service" in error_msg.lower() or "not been booted with systemd" in error_msg.lower():
                    return {
                        "success": False, 
                        "output": None, 
                        "status": "unknown", 
                        "error": "Service management is not available in this Docker container. Docker containers typically don't support systemd or service commands. Use 'Execute Command' instead to manage processes directly (e.g., 'ps aux | grep <process>', 'kill <pid>', or start processes manually)."
                    }
                return {
                    "success": False, 
                    "output": None, 
                    "status": "unknown", 
                    "error": f"Service management not available. Error: {error_msg}"
                }
        
        return {"success": True, "output": output, "status": "active" if is_active else "inactive", "error": None}
    except Exception as e:
        return {"success": False, "output": None, "status": "unknown", "error": str(e)}


def stop_service(host: str, user: str, service_name: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Stop a service (systemd or service command)"""
    try:
        # Check if we're root or if sudo is available
        try:
            whoami_output = run_ssh_command(host, user, key_path, password, "whoami", port)
            is_root = "root" in whoami_output.strip().lower()
        except:
            is_root = False
        
        # Try with sudo first, fallback to without sudo if not available or if root
        sudo_prefix = "" if is_root else "sudo "
        try:
            # Test if sudo is available (if not root)
            if not is_root:
                run_ssh_command(host, user, key_path, password, "which sudo", port)
        except:
            # sudo not available, try without it
            sudo_prefix = ""
        
        # Check if systemd is available - try to check if systemd is actually running
        use_systemd = False
        try:
            # First check if systemctl command exists
            which_check = run_ssh_command(host, user, key_path, password, "which systemctl 2>/dev/null", port)
            if which_check and "systemctl" in which_check.strip():
                # Then check if systemd is actually running by checking PID 1
                try:
                    # Check if PID 1 is systemd
                    pid1_check = run_ssh_command(host, user, key_path, password, "ps -p 1 -o comm= 2>/dev/null", port)
                    if pid1_check and "systemd" in pid1_check.strip().lower():
                        # Double check with a simple systemctl command that won't fail if systemd is running
                        try:
                            systemctl_check = run_ssh_command(host, user, key_path, password, f"{sudo_prefix}systemctl is-system-running 2>&1", port)
                            # If it doesn't contain the error message about systemd not booted, assume it works
                            if systemctl_check and "not been booted with systemd" not in systemctl_check.lower() and "not booted" not in systemctl_check.lower():
                                use_systemd = True
                        except:
                            # If the check fails, systemd is not available
                            use_systemd = False
                except:
                    # If PID check fails, systemd is not available
                    use_systemd = False
        except:
            # systemctl command doesn't exist or check failed
            use_systemd = False
        
        if use_systemd:
            # Use systemctl
            cmd = f"{sudo_prefix}systemctl stop {service_name}"
            output = run_ssh_command(host, user, key_path, password, cmd, port)
            # Check if service is stopped
            status_cmd = f"{sudo_prefix}systemctl is-active {service_name}"
            status_output = run_ssh_command(host, user, key_path, password, status_cmd, port)
            is_inactive = "inactive" in status_output.lower() or "failed" in status_output.lower()
        else:
            # Try using service command as fallback
            try:
                cmd = f"{sudo_prefix}service {service_name} stop"
                output = run_ssh_command(host, user, key_path, password, cmd, port)
                # Check status using service command
                status_cmd = f"{sudo_prefix}service {service_name} status"
                status_output = run_ssh_command(host, user, key_path, password, status_cmd, port)
                is_inactive = "stopped" in status_output.lower() or "inactive" in status_output.lower() or "not running" in status_output.lower()
            except Exception as e:
                error_msg = str(e)
                # Provide helpful error message for Docker containers
                if "unrecognized service" in error_msg.lower() or "not been booted with systemd" in error_msg.lower():
                    return {
                        "success": False, 
                        "output": None, 
                        "status": "unknown", 
                        "error": "Service management is not available in this Docker container. Docker containers typically don't support systemd or service commands. Use 'Execute Command' instead to manage processes directly (e.g., 'ps aux | grep <process>', 'kill <pid>', or start processes manually)."
                    }
                return {
                    "success": False, 
                    "output": None, 
                    "status": "unknown", 
                    "error": f"Service management not available. Error: {error_msg}"
                }
        
        return {"success": True, "output": output, "status": "inactive" if is_inactive else "active", "error": None}
    except Exception as e:
        return {"success": False, "output": None, "status": "unknown", "error": str(e)}


def run_health_check(host: str, user: str, key_path: Optional[str] = None, password: Optional[str] = None, port: int = 22) -> dict:
    """Run system health checks"""
    checks = {}
    
    try:
        # Check disk space
        disk_cmd = "df -h / | awk 'NR==2 {print $5}' | sed 's/%//'"
        disk_output = run_ssh_command(host, user, key_path, password, disk_cmd, port)
        disk_usage = float(disk_output.strip())
        checks["disk"] = {
            "status": "ok" if disk_usage < 80 else "warning" if disk_usage < 90 else "critical",
            "usage_percent": disk_usage,
            "message": f"Disk usage: {disk_usage}%"
        }
    except:
        checks["disk"] = {"status": "unknown", "usage_percent": 0, "message": "Could not check disk"}
    
    try:
        # Check memory
        mem_cmd = "free -m | awk 'NR==2{printf \"%.1f\", $3*100/$2}'"
        mem_output = run_ssh_command(host, user, key_path, password, mem_cmd, port)
        mem_usage = float(mem_output.strip())
        checks["memory"] = {
            "status": "ok" if mem_usage < 80 else "warning" if mem_usage < 90 else "critical",
            "usage_percent": mem_usage,
            "message": f"Memory usage: {mem_usage}%"
        }
    except:
        checks["memory"] = {"status": "unknown", "usage_percent": 0, "message": "Could not check memory"}
    
    try:
        # Check load average
        load_cmd = "uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//'"
        load_output = run_ssh_command(host, user, key_path, password, load_cmd, port)
        load_avg = float(load_output.strip())
        # Get CPU cores for comparison
        cores_cmd = "nproc"
        cores_output = run_ssh_command(host, user, key_path, password, cores_cmd, port)
        cores = int(cores_output.strip())
        load_ratio = load_avg / cores if cores > 0 else load_avg
        checks["load"] = {
            "status": "ok" if load_ratio < 1.0 else "warning" if load_ratio < 2.0 else "critical",
            "load_average": load_avg,
            "cores": cores,
            "message": f"Load average: {load_avg} (cores: {cores})"
        }
    except:
        checks["load"] = {"status": "unknown", "load_average": 0, "cores": 0, "message": "Could not check load"}
    
    return checks



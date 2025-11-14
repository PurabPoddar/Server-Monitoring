import winrm
try:
    from winrm.exceptions import WinRMTransportError
except ImportError:
    # Fallback for older versions of pywinrm
    class WinRMTransportError(Exception):
        pass
from typing import Optional
import time
from datetime import datetime


def run_winrm_command(host: str, username: str, password: str, cmd: str, port: int = 5985, use_ps: bool = False):
    """Execute WinRM command using either CMD or PowerShell
    
    Tries multiple authentication methods and username formats for better compatibility.
    """
    protocol = "https" if port == 5986 else "http"
    url = f"{protocol}://{host}:{port}/wsman"
    
    # Try different authentication methods and username formats
    # Note: Only try username format variations if username doesn't already contain domain/computer
    auth_configs = []
    
    # If username already has domain/computer (contains \), just try as-is
    if "\\" in username:
        auth_configs = [
            {"transport": "ntlm", "username": username},
        ]
    else:
        # Try different username formats for local accounts
        auth_configs = [
            # Try NTLM with original username
            {"transport": "ntlm", "username": username},
            # Try NTLM with .\username (local account format)
            {"transport": "ntlm", "username": f".\\{username}"},
            # Try NTLM with hostname\username
            {"transport": "ntlm", "username": f"{host}\\{username}"},
        ]
    
    last_error = None
    for auth_config in auth_configs:
        try:
            session = winrm.Session(url, auth=(auth_config["username"], password), transport=auth_config["transport"])
            
            if use_ps:
                r = session.run_ps(cmd)
            else:
                r = session.run_cmd(cmd)
            
            out = r.std_out.decode('utf-8', errors='ignore') if r.std_out else ""
            err = r.std_err.decode('utf-8', errors='ignore') if r.std_err else ""
            
            # Check exit code
            if r.status_code != 0:
                error_msg = err if err else f"Command failed with exit code {r.status_code}"
                raise Exception(f"WinRM command failed: {error_msg}")
            
            if err and not out:
                raise Exception(f"WinRM command failed: {err}")
            
            return out, err
            
        except WinRMTransportError as e:
            error_msg = str(e).lower()
            last_error = e
            
            # If it's a clear authentication error, don't try other methods
            if "401" in str(e) or "unauthorized" in error_msg or "credentials" in error_msg or "rejected" in error_msg:
                # Try next auth method, but if this is the last one, raise with detailed message
                if auth_config == auth_configs[-1]:
                    raise Exception(
                        f"Authentication failed: The specified credentials were rejected by the server.\n\n"
                        f"Troubleshooting steps:\n"
                        f"1. Verify username is correct (tried: '{username}', '.\\{username}', '{host}\\{username}')\n"
                        f"2. Verify password is correct\n"
                        f"3. Ensure the user account exists on the Windows server\n"
                        f"4. Check if the account is locked or disabled\n"
                        f"5. For domain accounts, use format: DOMAIN\\username\n"
                        f"6. For local accounts, try: .\\username or COMPUTERNAME\\username\n"
                        f"7. Ensure WinRM is configured: Run 'winrm quickconfig' on the server\n"
                        f"8. Check WinRM authentication settings: 'winrm get winrm/config/Service/Auth'"
                    )
                continue
            # Network errors - don't retry
            elif "connection" in error_msg or "refused" in error_msg or "timeout" in error_msg:
                raise Exception(
                    f"Network error: Unable to connect to {host}:{port}.\n\n"
                    f"Check:\n"
                    f"1. Server is running and accessible (ping {host})\n"
                    f"2. WinRM service is running (run 'Get-Service WinRM' on server)\n"
                    f"3. Firewall allows connections on port {port}\n"
                    f"4. WinRM is configured: Run 'winrm quickconfig' on the server\n"
                    f"5. Test locally: 'winrm id -r:http://{host}:{port}/wsman'"
                )
            else:
                # Other transport errors - try next method
                if auth_config == auth_configs[-1]:
                    raise Exception(f"WinRM transport error: {str(e)}")
                continue
                
        except Exception as e:
            error_msg = str(e).lower()
            last_error = e
            
            # Authentication errors
            if "401" in error_msg or "authentication" in error_msg or "credentials" in error_msg or "rejected" in error_msg:
                if auth_config == auth_configs[-1]:
                    raise Exception(
                        f"Authentication failed: {str(e)}\n\n"
                        f"Troubleshooting:\n"
                        f"1. Verify username format (tried: '{username}', '.\\{username}', '{host}\\{username}')\n"
                        f"2. Verify password is correct\n"
                        f"3. Ensure user account exists and is active\n"
                        f"4. Check WinRM authentication: 'winrm get winrm/config/Service/Auth'"
                    )
                continue
            # Network errors
            elif "connection" in error_msg or "refused" in error_msg or "timeout" in error_msg or "network" in error_msg:
                raise Exception(
                    f"Network error: Unable to connect to {host}:{port}.\n"
                    f"Check WinRM service, firewall, and network connectivity."
                )
            else:
                # Unknown error - if last method, raise it
                if auth_config == auth_configs[-1]:
                    raise
    
    # If we get here, all methods failed
    if last_error:
        raise Exception(f"All authentication methods failed. Last error: {str(last_error)}")
    else:
        raise Exception("Failed to establish WinRM connection")


def test_connection(host: str, username: str, password: str, port: int = 5985) -> tuple[bool, str]:
    """Test WinRM connection to server. Returns (success, message)"""
    try:
        # Try a simple PowerShell command to test connection
        result, err = run_winrm_command(host, username, password, "Write-Output 'connection_test'", port, use_ps=True)
        if "connection_test" in result:
            return True, "Connection successful"
        return False, "Connection test failed: unexpected response"
    except Exception as e:
        # The run_winrm_command already provides detailed error messages
        # Just format it nicely for the user
        error_msg = str(e)
        return False, error_msg


def get_basic_metrics(host: str, username: str, password: str, port: int = 5985) -> dict:
    """Get basic server metrics via WinRM and return structured data matching Linux format"""
    import re
    
    # Get hostname
    hostname_cmd = "$env:COMPUTERNAME"
    try:
        hostname_output, _ = run_winrm_command(host, username, password, hostname_cmd, port, use_ps=True)
        hostname = hostname_output.strip() if hostname_output.strip() else host
    except:
        hostname = host
    
    # Get CPU usage and cores
    cpu_cmd = """
    $cpu = Get-Counter '\\Processor(_Total)\\% Processor Time' -ErrorAction SilentlyContinue
    if ($cpu) {
        $cpuUsage = [math]::Round($cpu.CounterSamples.CookedValue, 1)
    } else {
        $cpuUsage = 0
    }
    $cores = (Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum
    Write-Output "$cpuUsage|$cores"
    """
    try:
        cpu_output, _ = run_winrm_command(host, username, password, cpu_cmd, port, use_ps=True)
        cpu_parts = cpu_output.strip().split('|')
        cpu_usage = float(cpu_parts[0]) if len(cpu_parts) > 0 and cpu_parts[0] else 0.0
        cpu_cores = int(cpu_parts[1]) if len(cpu_parts) > 1 and cpu_parts[1] else 1
    except:
        cpu_usage = 0.0
        cpu_cores = 1
    
    # Get load average (Windows doesn't have load average, use CPU usage as approximation)
    load_avg = [cpu_usage / 100.0, cpu_usage / 100.0, cpu_usage / 100.0]
    
    # Get memory usage
    mem_cmd = """
    $os = Get-CimInstance Win32_OperatingSystem
    $total = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $free = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $used = [math]::Round($total - $free, 2)
    $usage = [math]::Round(($used / $total) * 100, 1)
    Write-Output "$total|$used|$free|$usage"
    """
    try:
        mem_output, _ = run_winrm_command(host, username, password, mem_cmd, port, use_ps=True)
        mem_parts = mem_output.strip().split('|')
        total_mem_gb = float(mem_parts[0]) if len(mem_parts) > 0 and mem_parts[0] else 0.0
        used_mem_gb = float(mem_parts[1]) if len(mem_parts) > 1 and mem_parts[1] else 0.0
        available_mem_gb = float(mem_parts[2]) if len(mem_parts) > 2 and mem_parts[2] else 0.0
        memory_usage = float(mem_parts[3]) if len(mem_parts) > 3 and mem_parts[3] else 0.0
    except:
        total_mem_gb = 0.0
        used_mem_gb = 0.0
        available_mem_gb = 0.0
        memory_usage = 0.0
    
    # Get disk usage for C: drive
    disk_cmd = """
    $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
    if ($disk) {
        $total = [math]::Round($disk.Size / 1GB, 2)
        $free = [math]::Round($disk.FreeSpace / 1GB, 2)
        $used = [math]::Round($total - $free, 2)
        $usage = [math]::Round(($used / $total) * 100, 1)
        Write-Output "$total|$used|$free|$usage"
    } else {
        Write-Output "0|0|0|0"
    }
    """
    try:
        disk_output, _ = run_winrm_command(host, username, password, disk_cmd, port, use_ps=True)
        disk_parts = disk_output.strip().split('|')
        total_disk_gb = float(disk_parts[0]) if len(disk_parts) > 0 and disk_parts[0] else 0.0
        used_disk_gb = float(disk_parts[1]) if len(disk_parts) > 1 and disk_parts[1] else 0.0
        available_disk_gb = float(disk_parts[2]) if len(disk_parts) > 2 and disk_parts[2] else 0.0
        disk_usage = float(disk_parts[3]) if len(disk_parts) > 3 and disk_parts[3] else 0.0
    except:
        total_disk_gb = 0.0
        used_disk_gb = 0.0
        available_disk_gb = 0.0
        disk_usage = 0.0
    
    # Get uptime
    uptime_cmd = """
    $os = Get-CimInstance Win32_OperatingSystem
    $bootTime = $os.LastBootUpTime
    $uptime = (Get-Date) - $bootTime
    $days = $uptime.Days
    $hours = $uptime.Hours
    $minutes = $uptime.Minutes
    Write-Output "up $days days, $hours hours, $minutes minutes"
    """
    try:
        uptime_output, _ = run_winrm_command(host, username, password, uptime_cmd, port, use_ps=True)
        uptime_text = uptime_output.strip() if uptime_output.strip() else "N/A"
    except:
        uptime_text = "N/A"
    
    # Get network stats
    network_cmd = """
    $adapters = Get-NetAdapterStatistics | Where-Object { $_.LinkSpeed -gt 0 }
    $totalRx = ($adapters | Measure-Object -Property ReceivedBytes -Sum).Sum
    $totalTx = ($adapters | Measure-Object -Property SentBytes -Sum).Sum
    $totalRxPackets = ($adapters | Measure-Object -Property ReceivedPackets -Sum).Sum
    $totalTxPackets = ($adapters | Measure-Object -Property SentPackets -Sum).Sum
    Write-Output "$totalRx|$totalTx|$totalRxPackets|$totalTxPackets"
    """
    try:
        network_output, _ = run_winrm_command(host, username, password, network_cmd, port, use_ps=True)
        network_parts = network_output.strip().split('|')
        bytes_recv = int(float(network_parts[0])) if len(network_parts) > 0 and network_parts[0] else 0
        bytes_sent = int(float(network_parts[1])) if len(network_parts) > 1 and network_parts[1] else 0
        packets_recv = int(float(network_parts[2])) if len(network_parts) > 2 and network_parts[2] else 0
        packets_sent = int(float(network_parts[3])) if len(network_parts) > 3 and network_parts[3] else 0
    except:
        bytes_recv = 0
        bytes_sent = 0
        packets_recv = 0
        packets_sent = 0
    
    return {
        "server_id": None,  # Will be set by the route
        "hostname": hostname,
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
            "mount_point": "C:"
        },
        "network": {
            "bytes_sent": bytes_sent,
            "bytes_recv": bytes_recv,
            "packets_sent": packets_sent,
            "packets_recv": packets_recv,
            "interfaces": []
        },
        "uptime": {
            "text": uptime_text
        }
    }


def get_top_processes(host: str, username: str, password: str, port: int = 5985, limit: int = 10) -> list:
    """Get top processes by CPU and Memory usage"""
    cmd = f"""
    Get-Process | Sort-Object CPU -Descending | Select-Object -First {limit} | ForEach-Object {{
        $proc = $_
        $user = try {{ (Get-Process -Id $proc.Id -IncludeUserName -ErrorAction SilentlyContinue).UserName }} catch {{ "N/A" }}
        $cpuPercent = try {{ ($proc.CPU / (Get-CimInstance Win32_ComputerSystem).NumberOfLogicalProcessors) * 100 }} catch {{ 0 }}
        $memMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
        [PSCustomObject]@{{
            PID = $proc.Id
            CPU = [math]::Round($cpuPercent, 2)
            Memory = $memMB
            Name = $proc.ProcessName
            User = $user
        }}
    }} | ConvertTo-Json
    """
    try:
        output, _ = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        import json
        processes = json.loads(output) if output.strip() else []
        if not isinstance(processes, list):
            processes = [processes]
        
        result = []
        for proc in processes[:limit]:
            result.append({
                "pid": int(proc.get("PID", 0)),
                "cpu": float(proc.get("CPU", 0)),
                "memory": float(proc.get("Memory", 0)),
                "name": proc.get("Name", "unknown"),
                "user": proc.get("User", "unknown")
            })
        return result
    except Exception as e:
        # Fallback to simpler command
        try:
            cmd = f"Get-Process | Sort-Object CPU -Descending | Select-Object -First {limit} | Select-Object Id, CPU, @{{Name='MemoryMB';Expression={{[math]::Round($_.WorkingSet64/1MB,2)}}}}, ProcessName | ConvertTo-Json"
            output, _ = run_winrm_command(host, username, password, cmd, port, use_ps=True)
            import json
            processes = json.loads(output) if output.strip() else []
            if not isinstance(processes, list):
                processes = [processes]
            
            result = []
            for proc in processes[:limit]:
                result.append({
                    "pid": int(proc.get("Id", 0)),
                    "cpu": float(proc.get("CPU", 0)),
                    "memory": float(proc.get("MemoryMB", 0)),
                    "name": proc.get("ProcessName", "unknown"),
                    "user": "N/A"
                })
            return result
        except:
            return []


def get_network_interfaces(host: str, username: str, password: str, port: int = 5985) -> list:
    """Get detailed network interface statistics"""
    cmd = """
    Get-NetAdapterStatistics | Where-Object { $_.LinkSpeed -gt 0 } | ForEach-Object {
        $adapter = $_
        $ip = (Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
        if (-not $ip) { $ip = "N/A" }
        [PSCustomObject]@{
            Name = $adapter.Name
            IP = $ip
            RxBytes = $adapter.ReceivedBytes
            TxBytes = $adapter.SentBytes
            RxPackets = $adapter.ReceivedPackets
            TxPackets = $adapter.SentPackets
        }
    } | ConvertTo-Json
    """
    try:
        output, _ = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        import json
        interfaces = json.loads(output) if output.strip() else []
        if not isinstance(interfaces, list):
            interfaces = [interfaces]
        
        result = []
        for iface in interfaces:
            result.append({
                "name": iface.get("Name", "unknown"),
                "ip": iface.get("IP", "N/A"),
                "rx_bytes": int(iface.get("RxBytes", 0)),
                "tx_bytes": int(iface.get("TxBytes", 0)),
                "rx_packets": int(iface.get("RxPackets", 0)),
                "tx_packets": int(iface.get("TxPackets", 0))
            })
        return result
    except:
        return []


def get_disk_partitions(host: str, username: str, password: str, port: int = 5985) -> list:
    """Get all disk partitions and mount points"""
    cmd = """
    Get-CimInstance Win32_LogicalDisk | ForEach-Object {
        $disk = $_
        $total = [math]::Round($disk.Size / 1GB, 2)
        $free = [math]::Round($disk.FreeSpace / 1GB, 2)
        $used = [math]::Round($total - $free, 2)
        $usage = if ($total -gt 0) { [math]::Round(($used / $total) * 100, 1) } else { 0 }
        [PSCustomObject]@{
            DeviceID = $disk.DeviceID
            TotalGB = $total
            UsedGB = $used
            AvailableGB = $free
            UsagePercent = $usage
            Mount = $disk.DeviceID
        }
    } | ConvertTo-Json
    """
    try:
        output, _ = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        import json
        partitions = json.loads(output) if output.strip() else []
        if not isinstance(partitions, list):
            partitions = [partitions]
        
        result = []
        for part in partitions:
            result.append({
                "filesystem": part.get("DeviceID", "unknown"),
                "total_gb": round(float(part.get("TotalGB", 0)), 2),
                "used_gb": round(float(part.get("UsedGB", 0)), 2),
                "available_gb": round(float(part.get("AvailableGB", 0)), 2),
                "usage_percent": round(float(part.get("UsagePercent", 0)), 1),
                "mount": part.get("Mount", part.get("DeviceID", "unknown"))
            })
        return result
    except:
        return []


def get_system_info(host: str, username: str, password: str, port: int = 5985) -> dict:
    """Get system information (OS, hostname, uptime, etc.)"""
    cmd = """
    $os = Get-CimInstance Win32_OperatingSystem
    $cs = Get-CimInstance Win32_ComputerSystem
    $bootTime = $os.LastBootUpTime
    $uptime = (Get-Date) - $bootTime
    $uptimeDays = $uptime.Days
    
    [PSCustomObject]@{
        OS = $os.Caption
        Kernel = $os.Version
        Hostname = $cs.Name
        UptimeDays = $uptimeDays
        UptimeSince = $bootTime.ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json
    """
    try:
        output, _ = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        import json
        info = json.loads(output) if output.strip() else {}
        
        return {
            "os": info.get("OS", "Unknown"),
            "kernel": info.get("Kernel", "Unknown"),
            "hostname": info.get("Hostname", "Unknown"),
            "uptime_days": int(info.get("UptimeDays", 0)),
            "uptime_since": info.get("UptimeSince")
        }
    except Exception as e:
        return {
            "os": "Unknown",
            "kernel": "Unknown",
            "hostname": "Unknown",
            "uptime_days": 0,
            "uptime_since": None
        }


def get_detailed_metrics(host: str, username: str, password: str, port: int = 5985) -> dict:
    """Get detailed metrics including top processes, network interfaces, disk partitions, and system info"""
    return {
        "top_processes": get_top_processes(host, username, password, port),
        "network_interfaces": get_network_interfaces(host, username, password, port),
        "disk_partitions": get_disk_partitions(host, username, password, port),
        "system_info": get_system_info(host, username, password, port)
    }


def execute_command(host: str, username: str, password: str, command: str, port: int = 5985) -> dict:
    """Execute an arbitrary command on the remote server and return output"""
    try:
        # Try PowerShell first, fallback to CMD
        use_ps = command.strip().startswith('$') or 'Get-' in command or 'Set-' in command or 'New-' in command
        output, err = run_winrm_command(host, username, password, command, port, use_ps=use_ps)
        
        if err and not output:
            return {"success": False, "output": None, "error": err}
        
        return {"success": True, "output": output, "error": err if err else None}
    except Exception as e:
        return {"success": False, "output": None, "error": str(e)}


def restart_service(host: str, username: str, password: str, service_name: str, port: int = 5985) -> dict:
    """Restart a Windows service"""
    try:
        cmd = f"Restart-Service -Name '{service_name}' -ErrorAction Stop; Start-Sleep -Seconds 2; $status = (Get-Service -Name '{service_name}').Status; Write-Output $status"
        output, err = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        
        if err and "not found" in err.lower():
            return {
                "success": False,
                "output": None,
                "status": "unknown",
                "error": f"Service '{service_name}' not found. Use 'Get-Service' to list available services."
            }
        
        status_output = output.strip().lower() if output else ""
        is_active = "running" in status_output
        
        return {"success": True, "output": output, "status": "active" if is_active else "inactive", "error": None}
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            return {
                "success": False,
                "output": None,
                "status": "unknown",
                "error": f"Service '{service_name}' not found. Use 'Get-Service' to list available services."
            }
        return {"success": False, "output": None, "status": "unknown", "error": str(e)}


def start_service(host: str, username: str, password: str, service_name: str, port: int = 5985) -> dict:
    """Start a Windows service"""
    try:
        cmd = f"Start-Service -Name '{service_name}' -ErrorAction Stop; Start-Sleep -Seconds 2; $status = (Get-Service -Name '{service_name}').Status; Write-Output $status"
        output, err = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        
        if err and "not found" in err.lower():
            return {
                "success": False,
                "output": None,
                "status": "unknown",
                "error": f"Service '{service_name}' not found. Use 'Get-Service' to list available services."
            }
        
        status_output = output.strip().lower() if output else ""
        is_active = "running" in status_output
        
        return {"success": True, "output": output, "status": "active" if is_active else "inactive", "error": None}
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            return {
                "success": False,
                "output": None,
                "status": "unknown",
                "error": f"Service '{service_name}' not found. Use 'Get-Service' to list available services."
            }
        return {"success": False, "output": None, "status": "unknown", "error": str(e)}


def stop_service(host: str, username: str, password: str, service_name: str, port: int = 5985) -> dict:
    """Stop a Windows service"""
    try:
        cmd = f"Stop-Service -Name '{service_name}' -ErrorAction Stop; Start-Sleep -Seconds 2; $status = (Get-Service -Name '{service_name}').Status; Write-Output $status"
        output, err = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        
        if err and "not found" in err.lower():
            return {
                "success": False,
                "output": None,
                "status": "unknown",
                "error": f"Service '{service_name}' not found. Use 'Get-Service' to list available services."
            }
        
        status_output = output.strip().lower() if output else ""
        is_inactive = "stopped" in status_output
        
        return {"success": True, "output": output, "status": "inactive" if is_inactive else "active", "error": None}
    except Exception as e:
        error_msg = str(e)
        if "not found" in error_msg.lower():
            return {
                "success": False,
                "output": None,
                "status": "unknown",
                "error": f"Service '{service_name}' not found. Use 'Get-Service' to list available services."
            }
        return {"success": False, "output": None, "status": "unknown", "error": str(e)}


def run_health_check(host: str, username: str, password: str, port: int = 5985) -> dict:
    """Run system health checks"""
    checks = {}
    
    try:
        # Check disk space (C: drive)
        disk_cmd = """
        $disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        if ($disk) {
            $usage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 1)
            Write-Output $usage
        } else {
            Write-Output "0"
        }
        """
        disk_output, _ = run_winrm_command(host, username, password, disk_cmd, port, use_ps=True)
        disk_usage = float(disk_output.strip()) if disk_output.strip() else 0.0
        checks["disk"] = {
            "status": "ok" if disk_usage < 80 else "warning" if disk_usage < 90 else "critical",
            "usage_percent": disk_usage,
            "message": f"Disk usage: {disk_usage}%"
        }
    except:
        checks["disk"] = {"status": "unknown", "usage_percent": 0, "message": "Could not check disk"}
    
    try:
        # Check memory
        mem_cmd = """
        $os = Get-CimInstance Win32_OperatingSystem
        $usage = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
        Write-Output $usage
        """
        mem_output, _ = run_winrm_command(host, username, password, mem_cmd, port, use_ps=True)
        mem_usage = float(mem_output.strip()) if mem_output.strip() else 0.0
        checks["memory"] = {
            "status": "ok" if mem_usage < 80 else "warning" if mem_usage < 90 else "critical",
            "usage_percent": mem_usage,
            "message": f"Memory usage: {mem_usage}%"
        }
    except:
        checks["memory"] = {"status": "unknown", "usage_percent": 0, "message": "Could not check memory"}
    
    try:
        # Check CPU load (approximate using CPU usage)
        cpu_cmd = """
        $cpu = Get-Counter '\\Processor(_Total)\\% Processor Time' -ErrorAction SilentlyContinue
        if ($cpu) {
            $cpuUsage = [math]::Round($cpu.CounterSamples.CookedValue, 1)
        } else {
            $cpuUsage = 0
        }
        $cores = (Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfLogicalProcessors -Sum).Sum
        $loadRatio = $cpuUsage / 100.0
        Write-Output "$cpuUsage|$cores|$loadRatio"
        """
        cpu_output, _ = run_winrm_command(host, username, password, cpu_cmd, port, use_ps=True)
        cpu_parts = cpu_output.strip().split('|')
        cpu_usage = float(cpu_parts[0]) if len(cpu_parts) > 0 and cpu_parts[0] else 0.0
        cores = int(cpu_parts[1]) if len(cpu_parts) > 1 and cpu_parts[1] else 1
        load_ratio = float(cpu_parts[2]) if len(cpu_parts) > 2 and cpu_parts[2] else 0.0
        
        checks["load"] = {
            "status": "ok" if load_ratio < 1.0 else "warning" if load_ratio < 2.0 else "critical",
            "load_average": cpu_usage / 100.0,
            "cores": cores,
            "message": f"CPU usage: {cpu_usage}% (cores: {cores})"
        }
    except:
        checks["load"] = {"status": "unknown", "load_average": 0, "cores": 0, "message": "Could not check CPU load"}
    
    return checks


# Legacy functions for backward compatibility
def create_windows_user(host: str, username: str, password: str, newuser: str, newpass: str, port: int = 5985) -> str:
    """Create a new user on the remote server"""
    cmd = f"net user {newuser} {newpass} /add"
    out, err = run_winrm_command(host, username, password, cmd, port, use_ps=False)
    if err:
        raise RuntimeError(err)
    return out


def list_users(host: str, username: str, password: str, port: int = 5985) -> str:
    """List users on the remote server"""
    cmd = "Get-LocalUser | Select-Object Name | ConvertTo-Json"
    try:
        out, err = run_winrm_command(host, username, password, cmd, port, use_ps=True)
        if err:
            # Fallback to WMIC
            cmd = "wmic useraccount get name"
            out, err = run_winrm_command(host, username, password, cmd, port, use_ps=False)
        return out
    except:
        # Final fallback
        cmd = "wmic useraccount get name"
        out, err = run_winrm_command(host, username, password, cmd, port, use_ps=False)
        if err:
            raise RuntimeError(err)
        return out


def delete_user(host: str, username: str, password: str, target_user: str, port: int = 5985) -> bool:
    """Delete a user from the remote server"""
    cmd = f"net user {target_user} /delete"
    out, err = run_winrm_command(host, username, password, cmd, port, use_ps=False)
    if err:
        raise RuntimeError(err)
    return True

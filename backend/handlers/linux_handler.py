import paramiko


def run_ssh_command(host: str, user: str, key_path: str, cmd: str) -> str:
    pkey = paramiko.RSAKey.from_private_key_file(key_path)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=host, username=user, pkey=pkey, timeout=10)
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode()
    client.close()
    return out


def get_basic_metrics(host: str, user: str, key_path: str) -> dict:
    cpu = run_ssh_command(host, user, key_path, "top -b -n1 | head -n 5")
    mem = run_ssh_command(host, user, key_path, "free -m")
    disk = run_ssh_command(host, user, key_path, "df -h /")
    return {"cpu": cpu, "mem": mem, "disk": disk}


def create_user(host: str, user: str, key_path: str, newuser: str, newpass: str) -> bool:
    run_ssh_command(host, user, key_path, f"sudo useradd -m {newuser}")
    run_ssh_command(host, user, key_path, f"echo '{newuser}:{newpass}' | sudo chpasswd")
    return True


def list_users(host: str, user: str, key_path: str) -> str:
    # Show normal users (UID >= 1000) – adjust as needed
    return run_ssh_command(host, user, key_path, "getent passwd | awk -F: '$3 >= 1000 {print $1}'")


def delete_user(host: str, user: str, key_path: str, target_user: str) -> bool:
    run_ssh_command(host, user, key_path, f"sudo userdel -r {target_user}")
    return True



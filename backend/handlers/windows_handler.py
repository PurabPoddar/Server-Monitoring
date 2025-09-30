import winrm


def run_winrm_command(host: str, username: str, password: str, cmd: str):
    session = winrm.Session(f"http://{host}:5985/wsman", auth=(username, password))
    r = session.run_cmd(cmd)
    return r.std_out.decode(), r.std_err.decode()


def create_windows_user(host: str, username: str, password: str, newuser: str, newpass: str) -> str:
    cmd = f"net user {newuser} {newpass} /add"
    out, err = run_winrm_command(host, username, password, cmd)
    if err:
        raise RuntimeError(err)
    return out


def get_basic_metrics(host: str, username: str, password: str) -> dict:
    cpu_cmd = "wmic cpu get loadpercentage"
    mem_cmd = "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /Value"
    disk_cmd = "wmic logicaldisk get size,freespace,caption"
    out_cpu, err = run_winrm_command(host, username, password, cpu_cmd)
    out_mem, err = run_winrm_command(host, username, password, mem_cmd)
    out_disk, err = run_winrm_command(host, username, password, disk_cmd)
    return {"cpu": out_cpu, "mem": out_mem, "disk": out_disk}


def list_users(host: str, username: str, password: str) -> str:
    cmd = "wmic useraccount get name"
    out, err = run_winrm_command(host, username, password, cmd)
    if err:
        raise RuntimeError(err)
    return out


def delete_user(host: str, username: str, password: str, target_user: str) -> bool:
    cmd = f"net user {target_user} /delete"
    out, err = run_winrm_command(host, username, password, cmd)
    if err:
        raise RuntimeError(err)
    return True



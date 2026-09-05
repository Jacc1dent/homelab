import json
import os
import urllib.error
import urllib.parse
import urllib.request
import socket

from fastapi import FastAPI, HTTPException
from datetime import datetime, timezone


app = FastAPI(
    title="Homelab Dashboard API",
    version="0.10.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

def http_check(
    url: str,
    timeout: float = 2.0,
):
    try:
        with urllib.request.urlopen(
            url,
            timeout=timeout,
        ) as response:

            return 200 <= response.status < 400

    except (
        urllib.error.URLError,
        TimeoutError,
        OSError,
    ):
        return False


def tcp_check(
    host: str,
    port: int,
    timeout: float = 2.0,
):
    try:
        with socket.create_connection(
            (host, port),
            timeout=timeout,
        ):
            return True

    except OSError:
        return False

PORTAINER_URL = os.getenv(
    "PORTAINER_URL",
    "http://portainer:9000",
).rstrip("/")

PORTAINER_API_KEY = os.getenv("PORTAINER_API_KEY")
PORTAINER_ENDPOINT_ID = os.getenv("PORTAINER_ENDPOINT_ID")

PROMETHEUS_URL = os.getenv(
    "PROMETHEUS_URL",
    "http://prometheus:9090",
).rstrip("/")

def prometheus_query(query: str):
    params = urllib.parse.urlencode(
        {
            "query": query,
        }
    )

    url = (
        f"{PROMETHEUS_URL}/api/v1/query"
        f"?{params}"
    )

    try:
        with urllib.request.urlopen(
            url,
            timeout=5,
        ) as response:
            payload = json.load(response)

    except urllib.error.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Prometheus returned HTTP {exc.code}",
        ) from exc

    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Prometheus",
        ) from exc

    if payload.get("status") != "success":
        raise HTTPException(
            status_code=502,
            detail="Prometheus query failed",
        )

    results = (
        payload
        .get("data", {})
        .get("result", [])
    )

    if not results:
        return None

    return float(
        results[0]["value"][1]
    )

@app.get("/api/services")
def services():

    service_states = {
        "nginx": http_check(
            "http://nginx/healthz"
        ),

        "portainer": http_check(
            "http://portainer:9000/api/status"
        ),

        "uptime-kuma": http_check(
            "http://uptime-kuma:3001"
        ),

        "adguard": tcp_check(
            "192.168.1.62",
            53,
        ),

        "grafana": http_check(
            "http://grafana:3000/api/health"
        ),

        "prometheus": http_check(
            "http://prometheus:9090/-/healthy"
        ),
    }


    running = sum(
        1
        for state in service_states.values()
        if state is True
    )


    return {
        "total": len(service_states),
        "running": running,
        "services": service_states,
    }

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "homelab-dashboard-api",
        "version": "0.10.0",
    }


def portainer_get(path: str):
    if not PORTAINER_API_KEY or not PORTAINER_ENDPOINT_ID:
        raise HTTPException(
            status_code=503,
            detail="Portainer API is not configured",
        )

    request = urllib.request.Request(
        f"{PORTAINER_URL}{path}",
        headers={
            "X-API-Key": PORTAINER_API_KEY,
        },
    )

    try:
        with urllib.request.urlopen(
            request,
            timeout=5,
        ) as response:
            return json.load(response)

    except urllib.error.HTTPError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Portainer returned HTTP {exc.code}",
        ) from exc

    except urllib.error.URLError as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to reach Portainer",
        ) from exc


@app.get("/api/containers")
def containers():

    # Only return containers belonging to this Compose project.
    filters = urllib.parse.quote(
        json.dumps(
            {
                "label": [
                    "com.docker.compose.project=homelab"
                ]
            }
        )
    )

    docker_path = (
        f"/api/endpoints/{PORTAINER_ENDPOINT_ID}"
        f"/docker/containers/json"
        f"?all=true&filters={filters}"
    )

    raw_containers = portainer_get(docker_path)

    container_list = []

    for container in raw_containers:

        names = [
            name.lstrip("/")
            for name in container.get("Names", [])
        ]

        name = (
            names[0]
            if names
            else container.get("Id", "")[:12]
        )

        container_list.append(
            {
                "name": name,
                "image": container.get("Image"),
                "state": container.get("State"),
                "status": container.get("Status"),
            }
        )

    container_list.sort(
        key=lambda container: container["name"]
    )

    running = sum(
        1
        for container in container_list
        if container["state"] == "running"
    )

    total = len(container_list)

    return {
        "total": total,
        "running": running,
        "stopped": total - running,
        "containers": container_list,
    }

@app.get("/api/metrics")
def metrics():

    # ========================================================
    # PROMETHEUS TARGET HEALTH
    # ========================================================

    targets_online = prometheus_query(
        "sum(up)"
    )

    targets_expected = prometheus_query(
        "count(up)"
    )


    # ========================================================
    # HOMELAB-DNS STATUS
    # ========================================================

    homelab_dns_up = prometheus_query(
        'up{job="homelab-dns"}'
    )


    # ========================================================
    # HOMELAB-DNS CPU
    # ========================================================

    homelab_dns_cpu = prometheus_query(
    '''
    clamp(
      100 - (
        avg by (instance) (
          rate(
            node_cpu_seconds_total{
              job="homelab-dns",
              mode="idle"
            }[5m]
          )
        ) * 100
      ),
      0,
      100
    )
    '''
)


    # ========================================================
    # HOMELAB-DNS RAM
    # ========================================================

    homelab_dns_ram = prometheus_query(
        '''
        100 * (
          1 -
          (
            node_memory_MemAvailable_bytes{
              job="homelab-dns"
            }
            /
            node_memory_MemTotal_bytes{
              job="homelab-dns"
            }
          )
        )
        '''
    )


    # ========================================================
    # HOMELAB-DNS DISK
    # ========================================================

    homelab_dns_disk = prometheus_query(
        '''
        100 * (
          1 -
          (
            node_filesystem_avail_bytes{
              job="homelab-dns",
              mountpoint="/"
            }
            /
            node_filesystem_size_bytes{
              job="homelab-dns",
              mountpoint="/"
            }
          )
        )
        '''
    )


    # ========================================================
    # HOMELAB-DNS UPTIME
    # ========================================================

    homelab_dns_uptime = prometheus_query(
        '''
        time() -
        node_boot_time_seconds{
          job="homelab-dns"
        }
        '''
    )


    # ========================================================
    # GAMING-PC STATUS
    # ========================================================

    gaming_pc_up = prometheus_query(
        'up{job="gaming-pc"}'
    )


    # ========================================================
    # GAMING-PC CPU
    # ========================================================

    gaming_pc_cpu = prometheus_query(
    '''
    clamp(
      100 - (
        avg by (instance) (
          rate(
            windows_cpu_time_total{
              job="gaming-pc",
              mode="idle"
            }[5m]
          )
        ) * 100
      ),
      0,
      100
    )
    '''
)


    # ========================================================
    # GAMING-PC RAM
    # ========================================================

    gaming_pc_ram = prometheus_query(
        '''
        100 * (
          1 -
          (
            windows_memory_available_bytes{
              job="gaming-pc"
            }
            /
            windows_memory_physical_total_bytes{
              job="gaming-pc"
            }
          )
        )
        '''
    )


    # ========================================================
    # GAMING-PC DISK
    # ========================================================

    gaming_pc_disk = prometheus_query(
        '''
        100 * (
          1 -
          (
            windows_logical_disk_free_bytes{
              job="gaming-pc",
              volume="C:"
            }
            /
            windows_logical_disk_size_bytes{
              job="gaming-pc",
              volume="C:"
            }
          )
        )
        '''
    )


    # ========================================================
    # GAMING-PC UPTIME
    # ========================================================

    gaming_pc_uptime = prometheus_query(
        '''
        time() -
        windows_system_boot_time_timestamp{
          job="gaming-pc"
        }
        '''
    )


    # ========================================================
    # API RESPONSE
    # ========================================================

    return {
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "targets": {
            "online": (
                int(targets_online)
                if targets_online is not None
                else None
            ),

            "expected": (
                int(targets_expected)
                if targets_expected is not None
                else None
            ),
        },

        "homelab_dns": {
            "online": (
                bool(homelab_dns_up)
                if homelab_dns_up is not None
                else None
            ),

            "cpu_percent": (
                round(homelab_dns_cpu, 1)
                if homelab_dns_cpu is not None
                else None
            ),

            "ram_percent": (
                round(homelab_dns_ram, 1)
                if homelab_dns_ram is not None
                else None
            ),

            "disk_percent": (
                round(homelab_dns_disk, 1)
                if homelab_dns_disk is not None
                else None
            ),

            "uptime_seconds": (
                int(homelab_dns_uptime)
                if homelab_dns_uptime is not None
                else None
            ),
        },

        "gaming_pc": {
            "online": (
                bool(gaming_pc_up)
                if gaming_pc_up is not None
                else None
            ),

            "cpu_percent": (
                round(gaming_pc_cpu, 1)
                if gaming_pc_cpu is not None
                else None
            ),

            "ram_percent": (
                round(gaming_pc_ram, 1)
                if gaming_pc_ram is not None
                else None
            ),

            "disk_percent": (
                round(gaming_pc_disk, 1)
                if gaming_pc_disk is not None
                else None
            ),

            "uptime_seconds": (
                int(gaming_pc_uptime)
                if gaming_pc_uptime is not None
                else None
            ),
        },
    }


    # --------------------------------------------------------
    # API response
    # --------------------------------------------------------

    return {
        "generated_at": datetime.now(
            timezone.utc
        ).isoformat(),

        "targets": {
            "online": (
                int(targets_online)
                if targets_online is not None
                else None
            ),

            "expected": (
                int(targets_expected)
                if targets_expected is not None
                else None
            ),
        },

        "homelab_dns": {
            "cpu_percent": (
                round(homelab_dns_cpu, 1)
                if homelab_dns_cpu is not None
                else None
            ),

            "ram_percent": (
                round(homelab_dns_ram, 1)
                if homelab_dns_ram is not None
                else None
            ),

            "disk_percent": (
                round(homelab_dns_disk, 1)
                if homelab_dns_disk is not None
                else None
            ),

            "uptime_seconds": (
                int(homelab_dns_uptime)
                if homelab_dns_uptime is not None
                else None
            ),
        },

        "gaming_pc": {
            "cpu_percent": (
                round(gaming_pc_cpu, 1)
                if gaming_pc_cpu is not None
                else None
            ),

            "ram_percent": (
                round(gaming_pc_ram, 1)
                if gaming_pc_ram is not None
                else None
            ),

            "disk_percent": (
                round(gaming_pc_disk, 1)
                if gaming_pc_disk is not None
                else None
            ),

            "uptime_seconds": (
                int(gaming_pc_uptime)
                if gaming_pc_uptime is not None
                else None
            ),
        },
    }
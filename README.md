## v0.10 — Live Dashboard

The Homelab Dashboard now displays live infrastructure data instead of relying on hard-coded status values.

### Live data sources

- Docker / Portainer
  - Container count
  - Running/stopped state

- Prometheus
  - CPU usage
  - RAM usage
  - Disk usage
  - Uptime
  - Target health
  - Machine online/offline state

- Service health checks
  - Nginx
  - Portainer
  - Uptime Kuma
  - AdGuard Home
  - Grafana
  - Prometheus

### Dashboard API

A FastAPI backend now provides:

- `GET /api/health`
- `GET /api/containers`
- `GET /api/metrics`
- `GET /api/services`

The API runs as a Docker container and is exposed through the existing Nginx HTTPS reverse proxy.

### Health states

The dashboard now supports:

- `ONLINE`
- `DEGRADED`
- `DOWN`

Metric thresholds also highlight elevated resource usage.

### Live System Activity

The previous simulated terminal output has been replaced with a live event log that records:

- Container state changes
- Service failures and recoveries
- Prometheus target changes
- Machine state changes
- Resource warnings
- Overall system health transitions
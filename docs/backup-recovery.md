# Homelab Backup and Recovery

## Backup Scope

### Source-controlled configuration

- Docker Compose
- Nginx configuration
- Prometheus configuration
- Dashboard source
- TLS certificate configuration
- Documentation

### Docker persistent data

- Portainer
- Uptime Kuma
- Prometheus
- Grafana

### DNS Infrastructure

- AdGuard Home configuration
- Debian service configuration
- Node Exporter configuration

### PKI

- Homelab Root CA certificate
- Homelab Root CA private key
- Server certificates

## Recovery Goals

The homelab should be recoverable from:

1. Docker container deletion
2. Docker volume loss
3. Gaming PC rebuild
4. DNS VM rebuild
5. Complete infrastructure rebuild

## Restore Testing

Backups are considered valid only after a successful restore test.

## Current Persistent Data Inventory

### Docker

| Service | Volume | Approximate Size |
| --- | --- | ---: |
| Portainer | `homelab_portainer_data` | 264 KB |
| Uptime Kuma | `homelab_uptime_kuma_data` | 2.5 MB |
| Prometheus | `homelab_prometheus_data` | 39.6 MB |
| Grafana | `homelab_grafana_data` | 116.6 MB |

Total persistent Docker data is currently approximately 159 MB.

Docker images are not included in backups because they can be downloaded
again from their upstream registries.

### DNS Infrastructure

AdGuard Home configuration:

`/opt/AdGuardHome/AdGuardHome.yaml`


## Current Backup Limitation

Docker backups are currently stored on the same physical Gaming PC as the
source data.

This protects against:

- Accidental container deletion
- Docker volume deletion
- Bad configuration changes
- Failed upgrades
- Service-level corruption

It does not protect against:

- Gaming PC SSD failure
- Full system loss
- Theft
- Major hardware failure

A secondary off-machine backup destination will be added when the dedicated
mini PC / NAS is available.

## Automated Backup Pipeline

Docker persistent data is backed up automatically using Windows Task Scheduler.

### Schedule

- Task: `Homelab Daily Backup`
- Frequency: Daily
- Time: 20:00
- Missed runs: Start when available

### Backup Process

1. Verify Docker is available
2. Stop stateful Docker services
3. Archive each persistent Docker volume
4. Generate SHA-256 checksums
5. Apply the 7-day retention policy
6. Restart stateful services
7. Reload Nginx
8. Verify the latest backup
9. Return success or failure to Task Scheduler

### Verification

The verification process checks:

- All expected archives exist
- Archives are non-empty
- SHA-256 hashes match the recorded checksums
- Each gzip/tar archive can be read successfully

A scheduled backup is only considered successful when verification passes.

### Scheduled Task Test

The scheduled task was manually triggered and successfully completed.

Result:

`LastTaskResult: 0`

All Docker services returned to the running state after the backup.

**Result: SUCCESS**


## AdGuard Home Backups

AdGuard Home is backed up from the dedicated `homelab-dns` Debian VM.

The backup includes:

- `/opt/AdGuardHome/AdGuardHome.yaml`
- `/opt/AdGuardHome/data/`

The process:

1. Connects to `homelab-dns` over SSH
2. Stops AdGuard Home briefly for consistency
3. Creates a compressed archive
4. Generates a SHA-256 checksum
5. Restarts AdGuard Home
6. Copies the archive and checksum to the Gaming PC using SCP
7. Verifies the local copy against the remote SHA-256 checksum
8. Confirms the archive can be read

The unattended process uses:

- SSH key authentication
- A restricted passwordless sudo rule permitting only the AdGuard backup script

AdGuard backups are integrated into the daily `Homelab Daily Backup`
scheduled task.
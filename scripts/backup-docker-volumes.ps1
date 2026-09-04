$ErrorActionPreference = "Stop"

# ============================================================
# HOMELAB DOCKER VOLUME BACKUP
# ============================================================

$BackupRoot = "C:\Users\Jack\homelab-backups\docker"
$RetentionDays = 7
$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$BackupDir = Join-Path $BackupRoot $Timestamp

$Volumes = @(
    "homelab_portainer_data",
    "homelab_uptime_kuma_data",
    "homelab_prometheus_data",
    "homelab_grafana_data"
)

$Services = @(
    "portainer",
    "uptime-kuma",
    "prometheus",
    "grafana"
)

Write-Host ""
Write-Host "=== Homelab Docker Backup ==="
Write-Host "Destination: $BackupDir"
Write-Host ""

New-Item `
    -ItemType Directory `
    -Force `
    -Path $BackupDir |
    Out-Null


try {

    Write-Host "[INFO] Checking Docker engine..."

    docker info *> $null

    if ($LASTEXITCODE -ne 0) {
        throw "Docker engine is not available. Backup aborted."
    }

    Write-Host "[OK] Docker engine available."

    # --------------------------------------------------------
    # Stop stateful services for a consistent backup
    # --------------------------------------------------------

    Write-Host "[INFO] Stopping stateful containers..."

    docker compose stop $Services

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to stop Docker services."
    }


    # --------------------------------------------------------
    # Backup each Docker volume
    # --------------------------------------------------------

    foreach ($Volume in $Volumes) {

        $Archive = "$Volume.tar.gz"

        Write-Host "[INFO] Backing up $Volume..."

        docker run --rm `
            --mount "type=volume,source=$Volume,target=/source,readonly" `
            --mount "type=bind,source=$BackupDir,target=/backup" `
            alpine `
            tar -czf "/backup/$Archive" -C /source .

        if ($LASTEXITCODE -ne 0) {
            throw "Backup failed for volume: $Volume"
        }

        Write-Host "[OK] $Archive"
    }


    # --------------------------------------------------------
    # Generate checksums
    # --------------------------------------------------------

    Write-Host "[INFO] Generating SHA256 checksums..."

    $ChecksumFile = Join-Path $BackupDir "checksums.txt"

    Get-ChildItem `
        -Path $BackupDir `
        -Filter "*.tar.gz" |
    ForEach-Object {

        $Hash = Get-FileHash `
            -Path $_.FullName `
            -Algorithm SHA256

        "$($Hash.Hash)  $($_.Name)" |
            Add-Content $ChecksumFile
    }

    Write-Host "[OK] Checksums generated."

    # --------------------------------------------------------
    # Delete expired backups
    # --------------------------------------------------------

    Write-Host "[INFO] Applying $RetentionDays day retention policy..."

    $Cutoff = (Get-Date).AddDays(-$RetentionDays)

    Get-ChildItem `
        -Path $BackupRoot `
        -Directory |
    Where-Object {
        $_.CreationTime -lt $Cutoff
    } |
    ForEach-Object {

        Write-Host "[INFO] Removing expired backup: $($_.Name)"

        Remove-Item `
            -Path $_.FullName `
            -Recurse `
            -Force
    }

    Write-Host "[OK] Retention cleanup complete."
}

finally {

    # --------------------------------------------------------
    # Always attempt to restart services
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "[INFO] Starting stateful services..."

    docker compose up -d $Services

    if ($LASTEXITCODE -ne 0) {
        Write-Warning "One or more stateful services failed to start."
    }
    else {
        Write-Host "[OK] Stateful services started."
    }


    # --------------------------------------------------------
    # Give Docker networking a moment to settle
    # --------------------------------------------------------

    Write-Host "[INFO] Waiting for Docker networking..."

    Start-Sleep -Seconds 5


    # --------------------------------------------------------
    # Validate and reload Nginx
    # --------------------------------------------------------

    Write-Host "[INFO] Validating Nginx configuration..."

    docker compose exec -T nginx nginx -t

    if ($LASTEXITCODE -eq 0) {

        Write-Host "[INFO] Reloading Nginx..."

        docker compose exec -T nginx nginx -s reload

        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Nginx reloaded."
        }
        else {
            Write-Warning "Nginx reload failed."
        }

    }
    else {

        Write-Warning "Nginx configuration validation failed. Reload skipped."

    }


    Write-Host ""
    Write-Host "=== Backup Process Finished ==="
    Write-Host "Location: $BackupDir"
    Write-Host ""
}
$ErrorActionPreference = "Stop"

# ============================================================
# HOMELAB ADGUARD BACKUP
# ============================================================

$DnsHost = "jack@192.168.1.62"
$BackupRoot = "C:\Users\Jack\homelab-backups\dns"

New-Item `
    -ItemType Directory `
    -Force `
    -Path $BackupRoot |
Out-Null


Write-Host ""
Write-Host "=== AdGuard Home Backup ==="
Write-Host ""

# ------------------------------------------------------------
# Create backup remotely
# ------------------------------------------------------------

Write-Host "[INFO] Creating backup on homelab-dns..."

ssh $DnsHost `
    "sudo -n /usr/local/sbin/homelab-adguard-backup"

if ($LASTEXITCODE -ne 0) {
    throw "Remote AdGuard backup failed."
}

Write-Host "[OK] Remote backup completed."


# ------------------------------------------------------------
# Find latest backup
# ------------------------------------------------------------

$RemoteArchive = (
    ssh $DnsHost `
        "ls -1t /home/jack/adguard-backups/adguard-*.tar.gz | head -1"
).Trim()

if (-not $RemoteArchive) {
    throw "Unable to locate remote AdGuard archive."
}

$RemoteChecksum = "$RemoteArchive.sha256"

$ArchiveName = Split-Path $RemoteArchive -Leaf
$ChecksumName = "$ArchiveName.sha256"

$LocalArchive = Join-Path $BackupRoot $ArchiveName
$LocalChecksum = Join-Path $BackupRoot $ChecksumName


# ------------------------------------------------------------
# Copy backup to Windows
# ------------------------------------------------------------

Write-Host "[INFO] Copying $ArchiveName..."

scp "${DnsHost}:$RemoteArchive" $BackupRoot

if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy AdGuard archive."
}

scp "${DnsHost}:$RemoteChecksum" $BackupRoot

if ($LASTEXITCODE -ne 0) {
    throw "Failed to copy AdGuard checksum."
}


# ------------------------------------------------------------
# Verify SHA256
# ------------------------------------------------------------

Write-Host "[INFO] Verifying SHA256..."

$ChecksumLine = Get-Content $LocalChecksum

if ($ChecksumLine -notmatch '^([A-Fa-f0-9]{64})') {
    throw "Unable to parse AdGuard checksum."
}

$ExpectedHash = $Matches[1].ToUpper()

$ActualHash = (
    Get-FileHash `
        -Path $LocalArchive `
        -Algorithm SHA256
).Hash.ToUpper()

if ($ExpectedHash -ne $ActualHash) {
    throw "AdGuard SHA256 verification failed."
}

Write-Host "[OK] SHA256 checksum matches."


# ------------------------------------------------------------
# Verify archive is readable
# ------------------------------------------------------------

Write-Host "[INFO] Testing archive..."

& tar.exe -tzf $LocalArchive *> $null

if ($LASTEXITCODE -ne 0) {
    throw "AdGuard archive is unreadable."
}

Write-Host "[OK] Archive structure readable."


Write-Host ""
Write-Host "[SUCCESS] AdGuard backup verified."
Write-Host "Archive: $LocalArchive"
Write-Host ""
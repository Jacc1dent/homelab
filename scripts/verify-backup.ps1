$ErrorActionPreference = "Stop"

# ============================================================
# HOMELAB BACKUP VERIFICATION
# ============================================================

$BackupRoot = "C:\Users\Jack\homelab-backups\docker"

$ExpectedArchives = @(
    "homelab_portainer_data.tar.gz",
    "homelab_uptime_kuma_data.tar.gz",
    "homelab_prometheus_data.tar.gz",
    "homelab_grafana_data.tar.gz"
)

Write-Host ""
Write-Host "=== Homelab Backup Verification ==="
Write-Host ""


# ------------------------------------------------------------
# Find latest backup
# ------------------------------------------------------------

$LatestBackup = Get-ChildItem `
    -Path $BackupRoot `
    -Directory |
Sort-Object Name -Descending |
Select-Object -First 1

if (-not $LatestBackup) {
    Write-Host "[FAIL] No backup directories found."
    exit 1
}

$BackupDir = $LatestBackup.FullName

Write-Host "[INFO] Latest backup:"
Write-Host "       $BackupDir"
Write-Host ""


# ------------------------------------------------------------
# Check checksum file
# ------------------------------------------------------------

$ChecksumFile = Join-Path $BackupDir "checksums.txt"

if (-not (Test-Path $ChecksumFile)) {
    Write-Host "[FAIL] checksums.txt is missing."
    exit 1
}

Write-Host "[OK] checksums.txt found."


# ------------------------------------------------------------
# Parse recorded checksums
# ------------------------------------------------------------

$RecordedHashes = @{}

foreach ($Line in Get-Content $ChecksumFile) {

    if ($Line -match '^([A-Fa-f0-9]{64})\s+(.+)$') {

        $Hash = $Matches[1].ToUpper()
        $FileName = $Matches[2].Trim()

        $RecordedHashes[$FileName] = $Hash
    }
}


# ------------------------------------------------------------
# Verify archives
# ------------------------------------------------------------

$Failures = 0

foreach ($ArchiveName in $ExpectedArchives) {

    Write-Host ""
    Write-Host "[INFO] Verifying $ArchiveName..."

    $ArchivePath = Join-Path $BackupDir $ArchiveName


    # Check archive exists

    if (-not (Test-Path $ArchivePath)) {

        Write-Host "[FAIL] Archive missing."
        $Failures++
        continue
    }

    Write-Host "[OK] Archive exists."


    # Check archive isn't empty

    $ArchiveInfo = Get-Item $ArchivePath

    if ($ArchiveInfo.Length -le 0) {

        Write-Host "[FAIL] Archive is empty."
        $Failures++
        continue
    }

    Write-Host "[OK] Archive size: $($ArchiveInfo.Length) bytes"


    # Check recorded checksum exists

    if (-not $RecordedHashes.ContainsKey($ArchiveName)) {

        Write-Host "[FAIL] No checksum recorded for archive."
        $Failures++
        continue
    }


    # Calculate current SHA256

    $ActualHash = (
        Get-FileHash `
            -Path $ArchivePath `
            -Algorithm SHA256
    ).Hash.ToUpper()

    $ExpectedHash = $RecordedHashes[$ArchiveName]


    if ($ActualHash -ne $ExpectedHash) {

        Write-Host "[FAIL] SHA256 mismatch."
        Write-Host "       Expected: $ExpectedHash"
        Write-Host "       Actual:   $ActualHash"

        $Failures++
        continue
    }

    Write-Host "[OK] SHA256 checksum matches."


    # Test archive structure

    & tar.exe -tzf $ArchivePath *> $null

    if ($LASTEXITCODE -ne 0) {

        Write-Host "[FAIL] Archive cannot be read by tar."
        $Failures++
        continue
    }

    Write-Host "[OK] Archive structure is readable."
}


# ------------------------------------------------------------
# Result
# ------------------------------------------------------------

Write-Host ""
Write-Host "===================================="

if ($Failures -eq 0) {

    Write-Host "[SUCCESS] Backup verification passed."
    Write-Host "All expected archives are present,"
    Write-Host "checksums match, and archives are readable."
    Write-Host ""
    Write-Host "Verified backup:"
    Write-Host $BackupDir
    Write-Host ""

    exit 0
}

else {

    Write-Host "[FAIL] Backup verification failed."
    Write-Host "$Failures problem(s) detected."
    Write-Host ""

    exit 1
}
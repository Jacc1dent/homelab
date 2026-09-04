$ErrorActionPreference = "Stop"

# ============================================================
# HOMELAB SCHEDULED BACKUP PIPELINE
# ============================================================

$Repo = "C:\Users\Jack\homelab"
$LogDir = "C:\Users\Jack\homelab-backups\logs"

$BackupScript = Join-Path $Repo "scripts\backup-docker-volumes.ps1"
$VerifyScript = Join-Path $Repo "scripts\verify-backup.ps1"
$AdGuardScript = Join-Path $Repo "scripts\backup-adguard.ps1"

$Timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$LogFile = Join-Path $LogDir "backup-$Timestamp.log"

$ExitCode = 0

Set-Location $Repo

New-Item `
    -ItemType Directory `
    -Force `
    -Path $LogDir |
    Out-Null


Start-Transcript `
    -Path $LogFile `
    -Append


try {

    # --------------------------------------------------------
    # Backup
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "===================================="
    Write-Host " HOMELAB SCHEDULED BACKUP"
    Write-Host "===================================="
    Write-Host ""

    Write-Host "[INFO] Starting Docker volume backup..."

    & $BackupScript

    Write-Host "[OK] Docker volume backup completed."


    # --------------------------------------------------------
    # Verification
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "[INFO] Starting backup verification..."

    # Run verifier in a separate PowerShell process so its
    # exit code can be checked safely.
    & powershell.exe `
        -NoProfile `
        -ExecutionPolicy Bypass `
        -File $VerifyScript

    if ($LASTEXITCODE -ne 0) {
        throw "Backup verification failed with exit code $LASTEXITCODE."
    }

    Write-Host ""
    Write-Host "[OK] Backup verification passed."

    # --------------------------------------------------------
# AdGuard backup
# --------------------------------------------------------

Write-Host ""
Write-Host "[INFO] Starting AdGuard backup..."

& powershell.exe `
    -NoProfile `
    -ExecutionPolicy Bypass `
    -File $AdGuardScript

if ($LASTEXITCODE -ne 0) {
    throw "AdGuard backup failed with exit code $LASTEXITCODE."
}

Write-Host "[OK] AdGuard backup and verification passed."


    # --------------------------------------------------------
    # Success
    # --------------------------------------------------------

    Write-Host ""
    Write-Host "===================================="
    Write-Host "[SUCCESS] Scheduled backup completed."
    Write-Host "===================================="
    Write-Host ""

}
catch {

    $ExitCode = 1

    Write-Host ""
    Write-Host "===================================="
    Write-Host "[FAIL] Scheduled backup failed."
    Write-Host "Reason: $($_.Exception.Message)"
    Write-Host "===================================="
    Write-Host ""

}
finally {

    Stop-Transcript

}


exit $ExitCode
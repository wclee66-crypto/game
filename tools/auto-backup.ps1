# Saerok - auto backup
#
# Runs daily at 10 PM via Windows Task Scheduler.
# If there are changes inside this folder (C:\coding\game), commit and push them to GitHub.
# If nothing changed, it quietly does nothing. It never touches any other folder.
#
# A log of what happened each run is kept in auto-backup.log next to this script.

$repo = 'C:\coding\game'
$log = Join-Path $PSScriptRoot 'auto-backup.log'

function Write-Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File -FilePath $log -Append -Encoding utf8
}

try {
    Set-Location $repo

    git add -A *> $null
    $changed = git status --porcelain

    if (-not $changed) {
        Write-Log "no changes - nothing to do"
        exit 0
    }

    $msg = "auto backup - $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    git commit -m $msg *> $null
    git push origin main *> $null

    if ($LASTEXITCODE -eq 0) {
        Write-Log "committed and pushed ($msg)"
    } else {
        Write-Log "commit made but push failed (exit code $LASTEXITCODE): $msg"
    }
}
catch {
    Write-Log "error: $($_.Exception.Message)"
}

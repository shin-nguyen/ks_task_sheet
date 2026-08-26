# PowerShell script for monitoring Git repository for new commits

$REPO_PATH = "E:\code\SP0168\1_for-notification\horizon2-services"
$BRANCH = "feature/SP0168-3464_Maintenance_Support_Phase_2"
$CHECK_INTERVAL = 300

$LAST_COMMIT = ""

function Check-ForNewCommit {
    Set-Location $REPO_PATH -ErrorAction Stop
    git fetch origin $BRANCH *>$null

    $latestRemoteCommit = git rev-parse "origin/$BRANCH"

    # First run only: initialize LAST_COMMIT
    if ([string]::IsNullOrEmpty($script:LAST_COMMIT)) {
        $script:LAST_COMMIT = $latestRemoteCommit
        Write-Host "Initial commit reference: $script:LAST_COMMIT"
        return
    }

    # Compare with last known commit
    if ($latestRemoteCommit -ne $script:LAST_COMMIT) {
        Write-Host "New commits detected between $script:LAST_COMMIT → $latestRemoteCommit"

        # Collect all commits between old and new
        $newCommits = git log --pretty=format:"- %an: %s" "$script:LAST_COMMIT..$latestRemoteCommit"

        Write-Host "=== New commits ==="
        Write-Host $newCommits
        Write-Host "==================="

        Send-Notification -commits $newCommits

        # Update last commit reference
        $script:LAST_COMMIT = $latestRemoteCommit
    }
    else {
        Write-Host "No new commits."
    }
}

function Send-Notification {
    param (
        [string]$commits
    )

    # Escape JSON properly
    $escapedCommits = $commits -replace '\\', '\\' -replace '"', '\"' -replace "`n", '\n' -replace "`r", ''

    $body = @{
        message = @{
            rid = "6a5f37788a1713289ece66e0"
            msg = "*[Automated Message]* `n Hi @all, New updated has been made on BE branch *$BRANCH*, details: `n$escapedCommits"
        }
    } | ConvertTo-Json -Depth 10

    $headers = @{
        'accept' = 'application/json'
        'content-type' = 'application/json'
        'X-Auth-Token' = 'xxx'
        'X-User-Id' = 'xxx'
    }

    try {
        Invoke-RestMethod -Uri 'https://chat.tma.com.vn/api/v1/chat.sendMessage' -Method Post -Headers $headers -Body $body
    }
    catch {
        Write-Host "Error sending notification: $_"
    }
}

Write-Host "Monitoring $REPO_PATH for new commits on '$BRANCH'..."
Set-Location $REPO_PATH -ErrorAction Stop

try {
    $LAST_COMMIT = git rev-parse "origin/$BRANCH" 2>$null
}
catch {
    $LAST_COMMIT = ""
}

while ($true) {
    Check-ForNewCommit
    Start-Sleep -Seconds $CHECK_INTERVAL
}

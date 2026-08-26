# PowerShell script to get Rocket.Chat rooms

$headers = @{
    'X-Auth-Token' = 'xxxx'
    'X-User-Id' = 'xxx'
}

$outputFile = Join-Path $PSScriptRoot "get-room-result.json"

try {
    Write-Host "Fetching rooms from Rocket.Chat..."
    $response = Invoke-RestMethod -Uri 'https://chat.tma.com.vn/api/v1/rooms.get' -Method Get -Headers $headers
    
    # Convert to JSON and save to file
    $response | ConvertTo-Json -Depth 10 | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host "Successfully saved room list to: $outputFile"
    Write-Host "Total rooms: $($response.update.Count)"
}
catch {
    Write-Host "Error: $_"
    exit 1
}

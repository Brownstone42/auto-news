# Run this after `hf auth login` to push the new token to Railway
$creds = Get-Content "$env:USERPROFILE\.config\higgsfield\credentials.json" | ConvertFrom-Json
$body = @{ access_token = $creds.access_token; refresh_token = $creds.refresh_token } | ConvertTo-Json
Invoke-RestMethod -Method POST -Uri "https://hf-server-production.up.railway.app/api/higgsfield/update-token" -ContentType "application/json" -Body $body
Write-Host "Token updated on Railway."

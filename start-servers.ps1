# PowerShell script to start both servers
Write-Host "Starting Express server on port 3001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; node server.js" -WindowStyle Normal

Start-Sleep -Seconds 2

Write-Host "`nStarting Next.js server..." -ForegroundColor Green
Write-Host "Note: Next.js will use port 3000 or the next available port" -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run next:dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "`nChecking server status..." -ForegroundColor Cyan
$port3001 = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
$port3000 = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue

if ($port3001) {
    Write-Host "✅ Express server is running on http://localhost:3001" -ForegroundColor Green
} else {
    Write-Host "❌ Express server is NOT running on port 3001" -ForegroundColor Red
}

if ($port3000) {
    Write-Host "✅ Next.js server is running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "⚠️  Next.js server may be starting on a different port (check the terminal window)" -ForegroundColor Yellow
}

Write-Host "`nServers started in separate windows. Check the terminal windows for any errors." -ForegroundColor Cyan

$services = @(
  @{name="auth-service";     port=3001},
  @{name="assets-service";   port=3002},
  @{name="users-service";    port=3003},
  @{name="messaging-service";port=3004},
  @{name="domains-service";  port=3005},
  @{name="admin-service";    port=3006},
  @{name="gateway";          port=8080},
  @{name="frontend";         port=3000}
)

foreach ($svc in $services) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("localhost", $svc.port)
    $tcp.Close()
    Write-Host "RUNNING  :$($svc.port)  $($svc.name)" -ForegroundColor Green
  } catch {
    Write-Host "STOPPED  :$($svc.port)  $($svc.name)" -ForegroundColor Red
  }
}

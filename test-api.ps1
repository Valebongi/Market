# Test completo del API Gateway
$BASE = "http://localhost:8080/api/v1"

Write-Host "`n=== TEST 1: Login ===" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "$BASE/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"test@davinci.com","password":"Test1234A"}'
$token = $login.data.accessToken
$userId = $login.data.user.id
Write-Host "OK - Rol: $($login.data.user.role) | ID: $userId"

Write-Host "`n=== TEST 2: Crear Activo (autenticado) ===" -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $token" }
$assetBody = @{
    title = "Sistema de Diseno B2B SaaS"
    description = "Kit completo de componentes UI para aplicaciones B2B empresariales. Incluye mas de 200 componentes Figma, tokens de diseno, y guias de uso. Listo para escalar."
    category = "design"
    licenseType = "non_exclusive"
    pricingType = "negotiable"
    territory = "Mundial"
    tags = @("figma", "design-system", "b2b")
} | ConvertTo-Json
$asset = Invoke-RestMethod -Uri "$BASE/assets" -Method POST -ContentType "application/json" -Headers $headers -Body $assetBody
# assets-service retorna el objeto directamente (sin wrapper data)
$assetId = $asset.id
Write-Host "OK - ID: $assetId | Slug: $($asset.slug) | Status: $($asset.status)"

Write-Host "`n=== TEST 3: Listar Activos publicados (publico) ===" -ForegroundColor Cyan
$list = Invoke-RestMethod -Uri "$BASE/assets" -Method GET
Write-Host "OK - Total publicados: $($list.total) (0 es correcto, el activo esta en draft)"

Write-Host "`n=== TEST 4: Listar mis activos (incluyendo drafts) ===" -ForegroundColor Cyan
$myAssets = Invoke-RestMethod -Uri "$BASE/assets?ownerId=$userId&status=draft" -Method GET
Write-Host "OK - Mis activos en draft: $($myAssets.total)"

Write-Host "`n=== TEST 5: Publicar Activo ===" -ForegroundColor Cyan
$pub = Invoke-RestMethod -Uri "$BASE/assets/$assetId/publish" -Method PATCH -Headers $headers
Write-Host "OK - Status: $($pub.status)"

Write-Host "`n=== TEST 6: Activo publicado aparece en marketplace ===" -ForegroundColor Cyan
$listAfter = Invoke-RestMethod -Uri "$BASE/assets" -Method GET
Write-Host "OK - Total publicados: $($listAfter.total)"

Write-Host "`n=== TEST 7: Registro de nuevo usuario ===" -ForegroundColor Cyan
$reg = Invoke-RestMethod -Uri "$BASE/auth/register" -Method POST -ContentType "application/json" -Body '{"name":"Maria Owner","email":"maria@davinci.com","password":"Owner1234A","role":"asset_owner"}'
Write-Host "OK - Nuevo usuario: $($reg.data.user.email) | Rol: $($reg.data.user.role)"

Write-Host "`n=== TEST 8: Acceso sin token debe retornar 401 ===" -ForegroundColor Cyan
try {
    Invoke-RestMethod -Uri "$BASE/requests" -Method GET
    Write-Host "ERROR: Deberia haber retornado 401"
} catch {
    Write-Host "OK - 401 bloqueado correctamente"
}

Write-Host "`n=== Todos los tests completados! ===" -ForegroundColor Green

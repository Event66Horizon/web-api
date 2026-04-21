param(
  [string]$BaseUrl = "http://localhost:3000",
  [switch]$AutoStartServer = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$rootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$serverProcess = $null
$startedByScript = $false

$results = New-Object System.Collections.Generic.List[object]

function Add-Result {
  param(
    [string]$Step,
    [bool]$Passed,
    [string]$Detail
  )

  $results.Add([PSCustomObject]@{
      Step   = $Step
      Passed = $Passed
      Detail = $Detail
    })

  if ($Passed) {
    Write-Host "[PASS] $Step - $Detail" -ForegroundColor Green
  }
  else {
    Write-Host "[FAIL] $Step - $Detail" -ForegroundColor Red
  }
}

function Read-ErrorBody {
  param($Exception)
  try {
    $stream = $Exception.Response.GetResponseStream()
    if (-not $stream) { return "" }
    $reader = New-Object System.IO.StreamReader($stream)
    $content = $reader.ReadToEnd()
    $reader.Dispose()
    return $content
  }
  catch {
    return ""
  }
}

function Invoke-Api {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Url,
    [hashtable]$Headers,
    [object]$Body
  )

  try {
    $params = @{
      Method      = $Method
      Uri         = $Url
      Headers     = $Headers
      ContentType = "application/json"
    }
    if ($null -ne $Body) {
      $params.Body = ($Body | ConvertTo-Json -Depth 15 -Compress)
    }

    $response = Invoke-RestMethod @params
    return @{
      status = 200
      data   = $response
      raw    = ($response | ConvertTo-Json -Depth 15 -Compress)
    }
  }
  catch {
    $status = 0
    try {
      $status = [int]$_.Exception.Response.StatusCode
    }
    catch {
      try {
        $status = [int]$_.Exception.Response.StatusCode.value__
      }
      catch {
        $status = 0
      }
    }

    $raw = Read-ErrorBody -Exception $_.Exception
    $parsed = $null
    if ($raw) {
      try { $parsed = $raw | ConvertFrom-Json } catch { $parsed = $null }
    }

    return @{
      status = $status
      data   = $parsed
      raw    = $raw
      error  = $_.Exception.Message
    }
  }
}

function Wait-For-Health {
  param(
    [string]$HealthUrl,
    [int]$MaxSeconds = 30
  )
  $stopWatch = [System.Diagnostics.Stopwatch]::StartNew()
  while ($stopWatch.Elapsed.TotalSeconds -lt $MaxSeconds) {
    try {
      $res = Invoke-WebRequest -UseBasicParsing -Uri $HealthUrl -Method Get -TimeoutSec 3
      if ($res.StatusCode -eq 200) {
        return $true
      }
    }
    catch {
      Start-Sleep -Milliseconds 750
    }
  }
  return $false
}

function Ensure-Server {
  $healthUrl = "$BaseUrl/health"
  if (Wait-For-Health -HealthUrl $healthUrl -MaxSeconds 2) {
    Add-Result -Step "Server Reachable" -Passed $true -Detail "Using existing server at $BaseUrl"
    return
  }

  if (-not $AutoStartServer) {
    Add-Result -Step "Server Reachable" -Passed $false -Detail "Server not running at $BaseUrl and AutoStartServer disabled."
    throw "Server not running."
  }

  Write-Host "Server not detected. Building and starting server..." -ForegroundColor Yellow
  Push-Location $rootDir
  try {
    cmd /c "npm run build" | Out-Host
    $startedByScript = $true
    $serverProcess = Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c", "npm run start" `
      -WorkingDirectory $rootDir `
      -WindowStyle Hidden `
      -PassThru
  }
  finally {
    Pop-Location
  }

  if (-not (Wait-For-Health -HealthUrl $healthUrl -MaxSeconds 30)) {
    Add-Result -Step "Server Auto Start" -Passed $false -Detail "Failed to start server at $BaseUrl"
    throw "Failed to start server."
  }

  Add-Result -Step "Server Auto Start" -Passed $true -Detail "Server started by script at $BaseUrl"
}

function Cleanup {
  if ($startedByScript -and $null -ne $serverProcess -and -not $serverProcess.HasExited) {
    try {
      Stop-Process -Id $serverProcess.Id -Force
      Add-Result -Step "Server Cleanup" -Passed $true -Detail "Stopped server process started by script."
    }
    catch {
      Add-Result -Step "Server Cleanup" -Passed $false -Detail "Failed to stop server process: $($_.Exception.Message)"
    }
  }
}

try {
  Ensure-Server

  $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $email = "manualcheck+$timestamp@example.com"
  $password = "Strong1234"

  # 1) Root / Health
  $rootRes = Invoke-Api -Method "GET" -Url "$BaseUrl/" -Headers @{} -Body $null
  Add-Result -Step "GET /" -Passed ($rootRes.status -eq 200) -Detail ("Status {0}" -f $rootRes.status)

  $healthRes = Invoke-Api -Method "GET" -Url "$BaseUrl/health" -Headers @{} -Body $null
  Add-Result -Step "GET /health" -Passed ($healthRes.status -eq 200) -Detail ("Status {0}" -f $healthRes.status)

  # 2) Auth register/login/me/refresh/logout
  $registerBody = @{
    email    = $email
    name     = "Manual Check User"
    password = $password
  }
  $registerRes = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/register" -Headers @{} -Body $registerBody
  $registerOk = ($registerRes.status -eq 200 -or $registerRes.status -eq 201) -and $null -ne $registerRes.data.data.accessToken
  Add-Result -Step "POST /api/v1/auth/register" -Passed $registerOk -Detail ("Status {0}" -f $registerRes.status)
  if (-not $registerOk) { throw "Register failed." }

  $accessToken = [string]$registerRes.data.data.accessToken
  $refreshToken = [string]$registerRes.data.data.refreshToken

  $loginRes = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/login" -Headers @{} -Body @{
    email    = $email
    password = $password
  }
  $loginOk = ($loginRes.status -eq 200) -and $null -ne $loginRes.data.data.accessToken
  Add-Result -Step "POST /api/v1/auth/login" -Passed $loginOk -Detail ("Status {0}" -f $loginRes.status)

  $meRes = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/auth/me" -Headers @{ Authorization = "Bearer $accessToken" } -Body $null
  Add-Result -Step "GET /api/v1/auth/me" -Passed ($meRes.status -eq 200) -Detail ("Status {0}" -f $meRes.status)

  $refreshRes = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/refresh" -Headers @{} -Body @{ refreshToken = $refreshToken }
  $refreshOk = ($refreshRes.status -eq 200) -and $null -ne $refreshRes.data.data.accessToken
  Add-Result -Step "POST /api/v1/auth/refresh" -Passed $refreshOk -Detail ("Status {0}" -f $refreshRes.status)
  if ($refreshOk) {
    $accessToken = [string]$refreshRes.data.data.accessToken
    $refreshToken = [string]$refreshRes.data.data.refreshToken
  }

  $logoutRes = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/logout" -Headers @{} -Body @{ refreshToken = $refreshToken }
  Add-Result -Step "POST /api/v1/auth/logout" -Passed ($logoutRes.status -eq 200) -Detail ("Status {0}" -f $logoutRes.status)

  # refresh again after logout should fail
  $refreshAfterLogout = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/auth/refresh" -Headers @{} -Body @{ refreshToken = $refreshToken }
  Add-Result -Step "POST /api/v1/auth/refresh (after logout)" -Passed ($refreshAfterLogout.status -eq 401) -Detail ("Status {0}" -f $refreshAfterLogout.status)

  # 3) Ingredients CRUD
  $headers = @{ Authorization = "Bearer $accessToken" }

  $ingredientListBefore = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/ingredients" -Headers @{} -Body $null
  Add-Result -Step "GET /api/v1/ingredients" -Passed ($ingredientListBefore.status -eq 200) -Detail ("Status {0}" -f $ingredientListBefore.status)

  $newIngredientName = "Manual Ingredient $timestamp"
  $createIngredient = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/ingredients" -Headers $headers -Body @{
    name           = $newIngredientName
    category       = "protein"
    kcalPer100g    = 150
    proteinPer100g = 25
    carbsPer100g   = 2
    fatPer100g     = 4
    costPer100g    = 1.1
    allergens      = @()
    source         = "manual-check"
  }
  $createIngredientOk = ($createIngredient.status -eq 200 -or $createIngredient.status -eq 201) -and $null -ne $createIngredient.data.data.id
  Add-Result -Step "POST /api/v1/ingredients" -Passed $createIngredientOk -Detail ("Status {0}" -f $createIngredient.status)

  $createdIngredientId = 0
  if ($createIngredientOk) {
    $createdIngredientId = [int]$createIngredient.data.data.id
  }

  if ($createdIngredientId -gt 0) {
    $patchIngredient = Invoke-Api -Method "PATCH" -Url "$BaseUrl/api/v1/ingredients/$createdIngredientId" -Headers $headers -Body @{
      costPer100g = 1.25
      source      = "manual-check-updated"
    }
    Add-Result -Step "PATCH /api/v1/ingredients/:id" -Passed ($patchIngredient.status -eq 200) -Detail ("Status {0}" -f $patchIngredient.status)
  }

  # 4) Recipes CRUD + analytics
  $ingredientList = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/ingredients?limit=3" -Headers @{} -Body $null
  if ($ingredientList.status -ne 200 -or $ingredientList.data.data.items.Count -lt 2) {
    throw "Need at least 2 ingredients for recipe test."
  }

  $id1 = [int]$ingredientList.data.data.items[0].id
  $id2 = [int]$ingredientList.data.data.items[1].id

  $createRecipe = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/recipes" -Headers $headers -Body @{
    title        = "Manual Recipe $timestamp"
    description  = "Recipe created by manual-check script."
    difficulty   = "easy"
    servings     = 2
    prepMinutes  = 15
    instructions = "Cook ingredients and serve."
    ingredients  = @(
      @{ ingredientId = $id1; grams = 200 },
      @{ ingredientId = $id2; grams = 150 }
    )
  }
  $recipeOk = ($createRecipe.status -eq 200 -or $createRecipe.status -eq 201) -and $null -ne $createRecipe.data.data.id
  Add-Result -Step "POST /api/v1/recipes" -Passed $recipeOk -Detail ("Status {0}" -f $createRecipe.status)
  if (-not $recipeOk) { throw "Recipe creation failed." }

  $recipeId = [int]$createRecipe.data.data.id

  $getRecipe = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/recipes/$recipeId" -Headers @{} -Body $null
  Add-Result -Step "GET /api/v1/recipes/:id" -Passed ($getRecipe.status -eq 200) -Detail ("Status {0}" -f $getRecipe.status)

  $patchRecipe = Invoke-Api -Method "PATCH" -Url "$BaseUrl/api/v1/recipes/$recipeId" -Headers $headers -Body @{
    prepMinutes = 20
    description = "Recipe updated by manual-check script."
  }
  Add-Result -Step "PATCH /api/v1/recipes/:id" -Passed ($patchRecipe.status -eq 200) -Detail ("Status {0}" -f $patchRecipe.status)

  $nutrition = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/analytics/recipes/$recipeId/nutrition" -Headers @{} -Body $null
  Add-Result -Step "GET /api/v1/analytics/recipes/:id/nutrition" -Passed ($nutrition.status -eq 200) -Detail ("Status {0}" -f $nutrition.status)

  $cost = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/analytics/recipes/$recipeId/cost" -Headers @{} -Body $null
  Add-Result -Step "GET /api/v1/analytics/recipes/:id/cost" -Passed ($cost.status -eq 200) -Detail ("Status {0}" -f $cost.status)

  $leaderboard = Invoke-Api -Method "GET" -Url "$BaseUrl/api/v1/analytics/leaderboard?metric=proteinDensity&limit=5" -Headers @{} -Body $null
  Add-Result -Step "GET /api/v1/analytics/leaderboard" -Passed ($leaderboard.status -eq 200) -Detail ("Status {0}" -f $leaderboard.status)

  $recommend = Invoke-Api -Method "POST" -Url "$BaseUrl/api/v1/analytics/recommendations" -Headers $headers -Body @{
    targetCaloriesPerServing = 500
    minProteinPerServing     = 0
    maxCostPerServing        = 100
    excludeAllergens         = @()
  }
  Add-Result -Step "POST /api/v1/analytics/recommendations" -Passed ($recommend.status -eq 200) -Detail ("Status {0}" -f $recommend.status)

  $deleteRecipe = Invoke-Api -Method "DELETE" -Url "$BaseUrl/api/v1/recipes/$recipeId" -Headers $headers -Body $null
  Add-Result -Step "DELETE /api/v1/recipes/:id" -Passed ($deleteRecipe.status -eq 200 -or $deleteRecipe.status -eq 204) -Detail ("Status {0}" -f $deleteRecipe.status)

  if ($createdIngredientId -gt 0) {
    # Non-admin should be forbidden
    $deleteIngredientByUser = Invoke-Api -Method "DELETE" -Url "$BaseUrl/api/v1/ingredients/$createdIngredientId" -Headers $headers -Body $null
    Add-Result -Step "DELETE /api/v1/ingredients/:id (non-admin)" -Passed ($deleteIngredientByUser.status -eq 403) -Detail ("Status {0}" -f $deleteIngredientByUser.status)
  }

  # 5) Static/documentation/dashboard checks
  try {
    $docsRes = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/docs/API_Documentation.pdf" -Method Get -TimeoutSec 10
    Add-Result -Step "GET /docs/API_Documentation.pdf" -Passed ($docsRes.StatusCode -eq 200) -Detail ("Status {0}" -f $docsRes.StatusCode)
  }
  catch {
    Add-Result -Step "GET /docs/API_Documentation.pdf" -Passed $false -Detail $_.Exception.Message
  }

  try {
    $insightsRes = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/insights/" -Method Get -TimeoutSec 10
    Add-Result -Step "GET /insights/" -Passed ($insightsRes.StatusCode -eq 200) -Detail ("Status {0}" -f $insightsRes.StatusCode)
  }
  catch {
    Add-Result -Step "GET /insights/" -Passed $false -Detail $_.Exception.Message
  }
}
catch {
  Add-Result -Step "Script Execution" -Passed $false -Detail $_.Exception.Message
}
finally {
  Cleanup
}

Write-Host ""
Write-Host "========== Manual Check Summary ==========" -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-Host

$failed = @($results | Where-Object { -not $_.Passed })
if ($failed.Count -eq 0) {
  Write-Host "All checks passed." -ForegroundColor Green
  exit 0
}
else {
  Write-Host "$($failed.Count) check(s) failed." -ForegroundColor Red
  exit 1
}


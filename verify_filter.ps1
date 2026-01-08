$adminUser = "admin_1"
$adminPw = "admin123"
$normalUser = "testuser"
$normalPw = "testuser123"

try {
    # 1. Login Admin
    Write-Host "Logging in as $adminUser..."
    $loginRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body (@{userId=$adminUser; pw=$adminPw} | ConvertTo-Json) -ContentType "application/json"
    $adminToken = $loginRes.accessToken
    if (-not $adminToken) { $adminToken = $loginRes.token } # Handle variable naming
    Write-Host "Admin AgencyNo: $($loginRes.agencyNo)"

    # 2. Get Complaints as Admin
    Write-Host "Fetching complaints as Admin..."
    $adminList = Invoke-RestMethod -Uri "http://localhost:5000/api/complaints?limit=100" -Method Get -Headers @{Authorization="Bearer $adminToken"}
    $adminCount = $adminList.complaints.Count
    Write-Host "Admin ($adminUser) sees $adminCount complaints"

    # 3. Login Normal User
    Write-Host "Logging in as $normalUser..."
    $userRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body (@{userId=$normalUser; pw=$normalPw} | ConvertTo-Json) -ContentType "application/json"
    $userToken = $userRes.accessToken
    if (-not $userToken) { $userToken = $userRes.token }

    # 4. Get Complaints as Normal User (or Anonymous if token not sent, but here we send it)
    Write-Host "Fetching complaints as Normal User..."
    $userList = Invoke-RestMethod -Uri "http://localhost:5000/api/complaints?limit=100" -Method Get -Headers @{Authorization="Bearer $userToken"}
    $userCount = $userList.complaints.Count
    Write-Host "Normal User ($normalUser) sees $userCount complaints"
    
    if ($adminCount -lt $userCount) {
        Write-Host "SUCCESS: Filtering works ($adminCount < $userCount)"
    } else {
        Write-Host "FAILURE: Filtering NOT working ($adminCount >= $userCount)"
    }

} catch {
    Write-Host "Error: $_"
    Write-Host $_.ScriptStackTrace
    Write-Host $_.Exception.Response
}

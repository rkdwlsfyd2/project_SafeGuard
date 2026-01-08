$adminUser = "admin"
$adminPw = "admin123"
$normalUser = "testuser"
$normalPw = "testuser123"

try {
    # 0. Setup/Reset Admin Account
    Write-Host "Setting up 'admin' account..."
    Invoke-RestMethod -Uri "http://localhost:5000/api/complaints/setup-agency" -Method Post
    
    # 1. Login Admin
    Write-Host "Logging in as $adminUser..."
    $loginRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body (@{userId = $adminUser; password = $adminPw } | ConvertTo-Json) -ContentType "application/json"
    $adminToken = $loginRes.accessToken
    if (-not $adminToken) { $adminToken = $loginRes.token }
    Write-Host "Admin AgencyNo: $($loginRes.agencyNo)"

    # 2. Get Complaints as Admin
    Write-Host "Fetching complaints as Admin..."
    $adminList = Invoke-RestMethod -Uri "http://localhost:5000/api/complaints?limit=100" -Method Get -Headers @{Authorization = "Bearer $adminToken" }
    $adminCount = $adminList.complaints.Count
    Write-Host "Admin ($adminUser) sees $adminCount complaints"

    # 3. Login Normal User
    Write-Host "Logging in as $normalUser (creating seed complaint if needed to ensure user exists by seeding output...)"
    # testuser should exist from seed_data.js run.
    $userRes = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method Post -Body (@{userId = $normalUser; password = $normalPw } | ConvertTo-Json) -ContentType "application/json"
    $userToken = $userRes.accessToken
    if (-not $userToken) { $userToken = $userRes.token }

    # 4. Get Complaints as Normal User
    Write-Host "Fetching complaints as Normal User..."
    $userList = Invoke-RestMethod -Uri "http://localhost:5000/api/complaints?limit=100" -Method Get -Headers @{Authorization = "Bearer $userToken" }
    $userCount = $userList.complaints.Count
    Write-Host "Normal User ($normalUser) sees $userCount complaints"
    
    if ($adminCount -lt $userCount) {
        Write-Host "SUCCESS: Filtering works ($adminCount < $userCount)"
    }
    else {
        # If admin sees 0 and user sees 0, it's not success.
        if ($userCount -gt 0) {
            Write-Host "FAILURE: Filtering NOT working ($adminCount >= $userCount)"
        }
        else {
            Write-Host "INCONCLUSIVE: No data found for anyone."
        }
    }

}
catch {
    Write-Host "Error: $_"
    try {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = [System.IO.StreamReader]::new($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Response Body: $body"
    }
    catch {
        Write-Host "No response body."
    }
}

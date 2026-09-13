$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $projectRoot '.env'
$envText = [IO.File]::ReadAllText($envPath)
$urlMatch = [regex]::Match($envText, '(?m)^VITE_SUPABASE_URL=(.+)$')
if (-not $urlMatch.Success) { throw 'VITE_SUPABASE_URL is missing from .env.' }
$projectUrl = $urlMatch.Groups[1].Value.Trim().Trim('"').Trim("'")
$projectRef = ([uri]$projectUrl).Host.Split('.')[0]
Write-Host 'Open your Supabase project, then Settings > API Keys.'
Write-Host ('Project: https://supabase.com/dashboard/project/' + $projectRef)
Write-Host 'Copy the service_role key (Legacy keys), or a server secret key. Do not copy the anon/publishable key.'
$inputMode = Read-Host 'After copying the key, type C to read it from clipboard, or H for hidden typing'
$keyPointer = [IntPtr]::Zero
$secureKey = $null
try {
  if ($inputMode.Trim().ToUpperInvariant() -eq 'C') {
    $privateKey = ([string](Get-Clipboard -Raw)).Trim()
  } elseif ($inputMode.Trim().ToUpperInvariant() -eq 'H') {
    $secureKey = Read-Host 'Enter the complete private key (right-click to paste)' -AsSecureString
    $keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
    $privateKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer).Trim()
  } else { throw 'Choose C or H. Nothing was saved.' }
  if ([string]::IsNullOrWhiteSpace($privateKey)) { throw 'The clipboard is empty. Copy the complete Secret key, then try again. Nothing was saved.' }
  if ($privateKey -match '[\r\n]') { throw 'The clipboard contains multiple lines. Copy only the Secret key value, then try again. Nothing was saved.' }
  if ($privateKey -match '^(your_|copy[-_ ]|placeholder|example|replace[-_ ])') { throw 'The clipboard contains example text, not a Secret key. Nothing was saved.' }
  if ($privateKey.StartsWith('sb_publishable_')) { throw 'That is the publishable browser key. Copy a Secret key instead. Nothing was saved.' }
  if ($privateKey.Length -lt 30) { throw 'The copied key is incomplete. Copy the complete Secret key, then try again. Nothing was saved.' }
  if ($privateKey.StartsWith('eyJ')) {
    $parts = $privateKey.Split('.')
    if ($parts.Length -ne 3) { throw 'Invalid key format. Nothing was saved.' }
    $encoded = $parts[1].Replace('-', '+').Replace('_', '/')
    $encoded = $encoded.PadRight($encoded.Length + ((4 - $encoded.Length % 4) % 4), '=')
    $claims = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($encoded)) | ConvertFrom-Json
    if ($claims.role -ne 'service_role') { throw 'That is not the service_role key. Nothing was saved.' }
    if ($claims.ref -and $claims.ref -ne $projectRef) { throw 'This key belongs to a different project. Nothing was saved.' }
  } elseif (-not $privateKey.StartsWith('sb_secret_')) { throw 'Use a service_role or sb_secret_ key. Nothing was saved.' }
  $values = @{ SUPABASE_URL = $projectUrl; SUPABASE_SERVICE_ROLE_KEY = $privateKey }
  foreach ($setting in $values.Keys) {
    $pattern = '(?m)^' + $setting + '=[^\r\n]*'
    $newLine = $setting + '=' + $values[$setting]
    if ([regex]::IsMatch($envText, $pattern)) {
      $replacement = $newLine
      $envText = [regex]::Replace($envText, $pattern, [Text.RegularExpressions.MatchEvaluator]{ param($match) $replacement })
    } else { $envText = $envText.TrimEnd() + "`r`n" + $newLine + "`r`n" }
  }
  [IO.File]::WriteAllText($envPath, $envText, (New-Object Text.UTF8Encoding($false)))
  Write-Host 'Saved privately to .env. Stop existing dev terminals with Ctrl+C, then run npm run dev.' -ForegroundColor Green
} finally {
  if ($keyPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer) }
  $privateKey = $null
  $envText = $null
  if ($secureKey) { $secureKey.Dispose() }
}

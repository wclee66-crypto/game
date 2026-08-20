# 맑은뜰 — 배포용 zip 만들기
#
#   pack.cmd 를 두 번 눌러 실행하면 됩니다.
#
#   1) 버전 번호를 하나 올립니다 (js/app.js 의 APP_VERSION, sw.js 의 VERSION 을 함께).
#      → 휴대폰의 앱이 새 파일임을 알아채고 자동으로 갱신합니다.
#   2) 실행에 필요한 파일만 골라 C:\coding\맑은뜰-배포용.zip 을 새로 만듭니다.
#      → 이 파일 하나를 호스팅에 끌어다 놓으면 배포 끝입니다.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem

$root = $PSScriptRoot
$appJs = Join-Path $root 'js\app.js'
$swJs  = Join-Path $root 'sw.js'
$utf8  = New-Object System.Text.UTF8Encoding($false)

# ---------- 1. 버전 올리기 ----------
$appText = [System.IO.File]::ReadAllText($appJs, $utf8)
$m = [regex]::Match($appText, "APP_VERSION = 'v(?<n>\d+)'")
if (-not $m.Success) { throw 'js/app.js 에서 APP_VERSION 을 찾지 못했습니다.' }

$old = [int]$m.Groups['n'].Value
$new = $old + 1

$appText = [regex]::Replace($appText, "APP_VERSION = 'v\d+'", "APP_VERSION = 'v$new'")
[System.IO.File]::WriteAllText($appJs, $appText, $utf8)

$swText = [System.IO.File]::ReadAllText($swJs, $utf8)
$swText = [regex]::Replace($swText, "malgeunddeul-v\d+", "malgeunddeul-v$new")
[System.IO.File]::WriteAllText($swJs, $swText, $utf8)

Write-Host ""
Write-Host ("  버전 v{0} -> v{1} 로 올렸습니다." -f $old, $new) -ForegroundColor Cyan

# ---------- 2. zip 만들기 ----------
$stage = Join-Path $env:TEMP 'malgeun-pack'
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Force $stage | Out-Null

Copy-Item (Join-Path $root 'index.html'), (Join-Path $root 'manifest.json'), $swJs -Destination $stage
Copy-Item (Join-Path $root 'css'), (Join-Path $root 'js'), (Join-Path $root 'icons') -Destination $stage -Recurse

$zip = Join-Path (Split-Path $root -Parent) '맑은뜰-배포용.zip'
if (Test-Path $zip) { Remove-Item -LiteralPath $zip -Force }

$sep = [string][char]92     # 역슬래시
$fs = [System.IO.File]::Open($zip, 'Create')
$ar = New-Object System.IO.Compression.ZipArchive($fs, 'Create')
$count = 0
Get-ChildItem $stage -Recurse -File | ForEach-Object {
  $name = $_.FullName.Substring($stage.Length + 1).Replace($sep, '/')
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($ar, $_.FullName, $name) | Out-Null
  $count++
}
$ar.Dispose(); $fs.Dispose()
Remove-Item -LiteralPath $stage -Recurse -Force

$kb = [math]::Round((Get-Item $zip).Length / 1KB, 1)
Write-Host ("  파일 {0}개, {1}KB" -f $count, $kb)
Write-Host ""
Write-Host "  만들어진 파일:" -ForegroundColor Green
Write-Host ("  {0}" -f $zip) -ForegroundColor Green
Write-Host ""
Write-Host "  이 파일을 호스팅 화면에 끌어다 놓으면 배포됩니다."
Write-Host ""

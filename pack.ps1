# 새록 — 배포용 zip 만들기
#
#   pack.cmd 를 두 번 눌러 실행하면 됩니다.
#
#   1) 버전 번호를 하나 올립니다 (js/app.js 의 APP_VERSION, sw.js 의 VERSION 을 함께).
#      → 휴대폰의 앱이 새 파일임을 알아채고 자동으로 갱신합니다.
#   2) 실행에 필요한 파일만 골라 C:\coding\새록-배포용.zip 을 새로 만듭니다.
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

# ---------- 1-2. 내려받는 문제지(PDF) 새로 만들기 ----------
# 영어권 사람들은 인쇄 창이 아니라 '파일 받기'를 기대합니다.
# 미리 만들어 둔 PDF 가 있어야 그냥 나가 버리지 않습니다.
# 검색용 페이지가 이 파일들의 크기를 읽어 적으므로 반드시 먼저 만듭니다.
# 크롬이 없으면 그냥 건너뛰므로 배포가 멈추지 않습니다.
& node (Join-Path $root 'tools\build-pdf.js')
Write-Host ''

# ---------- 1-3. 검색용 페이지 새로 만들기 ----------
# 게임 정보를 읽어 /sudoku/ 같은 낱장 페이지와 sitemap.xml 을 다시 만듭니다.
# 게임이 늘면 페이지도 저절로 늘어납니다.
& node (Join-Path $root 'tools\build-seo.js')
if ($LASTEXITCODE -ne 0) { throw '검색용 페이지를 만들지 못했습니다.' }
Write-Host ''

# ---------- 1-4. 문제지 미리보기 그림 새로 찍기 ----------
# 사람들이 '치매 문제지'를 이미지 검색으로 찾아 그림을 보고 들어옵니다.
# 카톡에 주소를 보낼 때 나오는 그림도 여기서 만듭니다.
# 크롬이 없으면 그냥 건너뛰므로 배포가 멈추지 않습니다.
& node (Join-Path $root 'tools\build-images.js')
Write-Host ''

# ---------- 2. zip 만들기 ----------
$stage = Join-Path $env:TEMP 'malgeun-pack'
if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
New-Item -ItemType Directory -Force $stage | Out-Null

Copy-Item (Join-Path $root 'index.html'), (Join-Path $root 'manifest.json'), $swJs -Destination $stage
Copy-Item (Join-Path $root 'sitemap.xml'), (Join-Path $root 'robots.txt') -Destination $stage
# 브라우저가 주소 맨 뒤에서 저절로 찾는 아이콘 — 없으면 헛걸음을 한다
Copy-Item (Join-Path $root 'favicon.ico'), (Join-Path $root 'favicon.png') -Destination $stage

# 검색 등록용 소유 확인 파일 (구글·네이버가 준 것) — 지우면 등록이 풀립니다
Get-ChildItem $root -File -Filter 'google*.html' | ForEach-Object { Copy-Item $_.FullName -Destination $stage }
Get-ChildItem $root -File -Filter 'naver*.html'  | ForEach-Object { Copy-Item $_.FullName -Destination $stage }
Copy-Item (Join-Path $root 'css'), (Join-Path $root 'js'), (Join-Path $root 'icons') -Destination $stage -Recurse
# 내려받는 문제지 (PDF)
if (Test-Path (Join-Path $root 'pdf')) {
  Copy-Item (Join-Path $root 'pdf') -Destination $stage -Recurse
}
# 문제지 미리보기 · 카톡 공유 그림
if (Test-Path (Join-Path $root 'images')) {
  Copy-Item (Join-Path $root 'images') -Destination $stage -Recurse
}

# 검색용 낱장 페이지 (게임마다 한 장 + 문제지 안내 + 영어판)
$pages = @('en', 'print')
Get-ChildItem (Join-Path $root 'js\games') -Filter '*.js' | ForEach-Object { $pages += $_.BaseName }
foreach ($d in ($pages | Select-Object -Unique)) {
  $src = Join-Path $root $d
  if (Test-Path $src) { Copy-Item $src -Destination $stage -Recurse }
}

$zip = Join-Path (Split-Path $root -Parent) '새록-배포용.zip'
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

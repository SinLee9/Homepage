param(
  [string[]]$SourceDirs,
  [switch]$Recurse
)

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$PaperDir = Join-Path $Root "assets\papers"
$PublicationPath = Join-Path $Root "data\publications.json"
$ProfilePath = Join-Path $Root "data\profile.json"

New-Item -ItemType Directory -Force -Path $PaperDir | Out-Null

if (-not $SourceDirs -or $SourceDirs.Count -eq 0) {
  $publishedDirName = -join ([char[]](0x53D1, 0x8868, 0x8BBA, 0x6587))
  $SourceDirs = @(
    "..\..\..\PAPER\$publishedDirName",
    "..\..\..\PAPER\Coding for burst errors of length up to t"
  )
}

function ConvertTo-Slug {
  param([string]$Name)
  $slug = [System.IO.Path]::GetFileNameWithoutExtension($Name).ToLowerInvariant()
  $slug = $slug -replace "\+", " plus "
  $slug = $slug -replace "[^a-z0-9]+", "-"
  $slug = $slug.Trim("-")
  if ([string]::IsNullOrWhiteSpace($slug)) {
    $slug = "paper-" + [Guid]::NewGuid().ToString("N").Substring(0, 8)
  }
  return $slug
}

function ConvertTo-Title {
  param([string]$Slug)
  $title = $Slug -replace "^\d{4}-", ""
  $words = $title.Split("-", [System.StringSplitOptions]::RemoveEmptyEntries)
  return ($words | ForEach-Object {
    if ($_.Length -le 3 -and $_ -in @("dna", "vt", "apn")) {
      $_.ToUpperInvariant()
    } else {
      $_.Substring(0, 1).ToUpperInvariant() + $_.Substring(1)
    }
  }) -join " "
}

function ConvertTo-Fingerprint {
  param([string]$Text)
  $fingerprint = $Text.ToLowerInvariant()
  $fingerprint = $fingerprint -replace "\+", " plus "
  $fingerprint = $fingerprint -replace "^\s*20\d{2}\s+", ""
  $fingerprint = $fingerprint -replace "[^a-z0-9]+", ""
  return $fingerprint
}

function Test-KnownTitle {
  param(
    [string]$Fingerprint,
    [string[]]$ExistingFingerprints
  )
  if ([string]::IsNullOrWhiteSpace($Fingerprint)) {
    return $false
  }
  foreach ($existing in $ExistingFingerprints) {
    if ($existing -eq $Fingerprint) {
      return $true
    }
    if ($Fingerprint.Length -ge 24 -and $existing.Contains($Fingerprint)) {
      return $true
    }
    if ($existing.Length -ge 24 -and $Fingerprint.Contains($existing)) {
      return $true
    }
  }
  return $false
}

$publicationData = Get-Content -Raw -Encoding UTF8 $PublicationPath | ConvertFrom-Json
$items = @($publicationData.items)
$existingIds = @{}
$existingUrls = @{}
$existingTitles = @{}
$existingTitleList = @()

foreach ($item in $items) {
  $existingIds[$item.id] = $true
  $fingerprint = ConvertTo-Fingerprint $item.title
  $existingTitles[$fingerprint] = $true
  $existingTitleList += $fingerprint
  foreach ($link in @($item.links)) {
    if ($link.url) {
      $existingUrls[$link.url.Replace("/", "\").ToLowerInvariant()] = $true
    }
  }
}

$copied = 0
$added = 0

foreach ($sourceDir in $SourceDirs) {
  $resolvedSource = Resolve-Path (Join-Path $Root $sourceDir) -ErrorAction SilentlyContinue
  if (-not $resolvedSource) {
    Write-Warning "Source directory not found: $sourceDir"
    continue
  }

  $pdfs = Get-ChildItem -Path $resolvedSource -Filter "*.pdf" -File -Recurse:$Recurse
  foreach ($pdf in $pdfs) {
    if ($pdf.Name -match "review|response|cover|charge|comment|letter") {
      continue
    }

    $slug = ConvertTo-Slug $pdf.Name
    $yearMatch = [regex]::Match($pdf.Name, "(20\d{2})")
    if ($yearMatch.Success -and -not $slug.StartsWith($yearMatch.Value)) {
      $slug = "$($yearMatch.Value)-$slug"
    }

    $destName = "$slug.pdf"
    $destPath = Join-Path $PaperDir $destName
    $url = "assets/papers/$destName"
    $title = ConvertTo-Title $slug
    $titleFingerprint = ConvertTo-Fingerprint $title
    $urlKey = $url.Replace("/", "\").ToLowerInvariant()

    if ($existingUrls[$urlKey]) {
      if (-not (Test-Path -LiteralPath $destPath)) {
        Copy-Item -LiteralPath $pdf.FullName -Destination $destPath
        $copied++
      }
      continue
    }

    if ($existingIds[$slug] -or (Test-KnownTitle $titleFingerprint $existingTitleList)) {
      continue
    }

    if (-not (Test-Path -LiteralPath $destPath)) {
      Copy-Item -LiteralPath $pdf.FullName -Destination $destPath
      $copied++
    }

    if (-not $existingUrls[$urlKey] -and -not $existingIds[$slug] -and -not $existingTitles[$titleFingerprint]) {
      $year = if ($yearMatch.Success) { [int]$yearMatch.Value } else { [int](Get-Date).Year }
      $items += [PSCustomObject]@{
        id = $slug
        year = $year
        title = $title
        authors = @("Zhen Li")
        venue = "Manuscript"
        status = "Imported from local PDF"
        type = "manuscript"
        selected = $false
        keywords = @()
        abstract = ""
        links = @([PSCustomObject]@{ label = "PDF"; url = $url })
      }
      $existingIds[$slug] = $true
      $existingTitles[$titleFingerprint] = $true
      $existingTitleList += $titleFingerprint
      $existingUrls[$urlKey] = $true
      $added++
    }
  }
}

$now = Get-Date
$publicationData.meta.updated = $now.ToString("yyyy-MM-dd")
$publicationData.meta.generatedAt = $now.ToString("s") + (Get-Date -Format "zzz")
$publicationData.items = @($items | Sort-Object @{ Expression = "year"; Descending = $true }, "title")
$publicationData | ConvertTo-Json -Depth 12 | Set-Content -Encoding UTF8 $PublicationPath

$profile = Get-Content -Raw -Encoding UTF8 $ProfilePath | ConvertFrom-Json
$profile.updated = $now.ToString("yyyy-MM-dd")
$profile | ConvertTo-Json -Depth 8 | Set-Content -Encoding UTF8 $ProfilePath

Write-Host "Copied $copied PDF file(s). Added $added publication record(s)."

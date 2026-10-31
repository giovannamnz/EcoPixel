# Builds both books into .\site (site\en, site\pt-br) and adds the language-picking index page.
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

mdbook build en
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

mdbook build pt-br
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Copy-Item index.html site/index.html -Force

Write-Host "Done. Serve the site folder with a local web server (see README.md)."

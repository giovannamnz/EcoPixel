#!/usr/bin/env sh
# Builds both books into ./site (site/en, site/pt-br) and adds the language-picking index page.
set -e
cd "$(dirname "$0")"

mdbook build en
mdbook build pt-br
cp index.html site/index.html

echo "Done. Serve the site/ folder with a local web server (see README.md)."

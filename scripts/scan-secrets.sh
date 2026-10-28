#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
scanner="${GITLEAKS_BIN:-gitleaks}"
command -v "$scanner" >/dev/null || { echo "Install the pinned Gitleaks version documented in docs/DEVELOPMENT.md"; exit 1; }
# Scan the index, including staged additions, and all reachable commit history.
staged=$(mktemp -d)
trap 'rm -rf -- "$staged"' EXIT
git checkout-index --all --prefix="$staged/"
"$scanner" dir "$staged" --redact=100 --no-banner
"$scanner" git . --log-opts=--all --redact=100 --no-banner

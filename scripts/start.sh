#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
echo "Go to: http://127.0.0.1:8000"
exec node src/server/main.mjs

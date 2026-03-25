#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$ROOT_DIR/.backgroundremover-venv"

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "Najpierw uruchom ./setup-local-ai.sh"
  exit 1
fi

exec "$VENV_DIR/bin/python" "$ROOT_DIR/local_ai_server.py" --host 127.0.0.1 --port 5101 --web-root "$ROOT_DIR"

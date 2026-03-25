#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$ROOT_DIR/.backgroundremover-venv"
PYTHON_BIN="${PYTHON_BIN:-python3.10}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "Nie znaleziono $PYTHON_BIN. Ustaw PYTHON_BIN albo zainstaluj Python 3.10."
  exit 1
fi

"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip setuptools wheel
"$VENV_DIR/bin/python" -m pip install backgroundremover

echo
echo "Lokalny backend AI jest gotowy."
echo "Uruchom: ./start-local-ai.sh"

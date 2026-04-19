#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "Missing .env. Create it with SEPOLIA_RPC_URL and PRIVATE_KEY."
  exit 1
fi

set -a
source .env
set +a

if [ -z "${SEPOLIA_RPC_URL:-}" ] || [ -z "${PRIVATE_KEY:-}" ]; then
  echo "SEPOLIA_RPC_URL or PRIVATE_KEY is empty in .env"
  exit 1
fi

npm run deploy:sepolia
npm run frontend

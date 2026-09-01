#!/usr/bin/env bash
# One-shot deploy for 2026-09-01 x402 task templates.
# Usage:
#   export PAY_TO_ADDRESS=0xYourWallet
#   export VERCEL_TOKEN=...          # or already logged in via vercel CLI
#   export VERCEL_ORG_ID=team_OKmb59rKdei9pVAPhZW3MwEo
#   ./scripts/deploy-all.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEAM="${VERCEL_ORG_ID:-team_OKmb59rKdei9pVAPhZW3MwEo}"
NETWORK="${NETWORK:-base}"
PAY_TO="${PAY_TO_ADDRESS:-}"

if [[ -z "$PAY_TO" ]]; then
  echo "WARN: PAY_TO_ADDRESS not set. Deploying with placeholder. Set it in Vercel env before production traffic."
fi

SERVICES=(json-flattener text-diff url-normalizer)

need() { command -v "$1" >/dev/null 2>&1 || { echo "missing $1"; exit 1; }; }
need npm
need vercel

echo "==> vercel whoami"
vercel whoami || true

for svc in "${SERVICES[@]}"; do
  dir="$ROOT/$svc"
  echo ""
  echo "========== $svc =========="
  if [[ ! -d "$dir" ]]; then
    echo "skip missing $dir"
    continue
  fi
  cd "$dir"
  npm install --silent
  if [[ -n "$PAY_TO" ]]; then
    echo "$PAY_TO" | vercel env add PAY_TO_ADDRESS production --yes --force 2>/dev/null || true
    echo "$NETWORK" | vercel env add NETWORK production --yes --force 2>/dev/null || true
  fi
  vercel deploy --prod --yes --scope "$TEAM"
done

echo ""
echo "Done. Next:"
echo "  1. Confirm PAY_TO_ADDRESS on each project"
echo "  2. curl GET /catalog and unpaid POST (expect 402)"
echo "  3. Submit live URLs to x402-list.com / bazaar discovery"
echo "  4. Point grokzilla.shop /catalog aggregator at the new endpoints"

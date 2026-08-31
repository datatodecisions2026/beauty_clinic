#!/usr/bin/env bash
# Deploy beauty_clinic on the server: pull, install, build frontend, webp, restart API.
set -euo pipefail
cd "$(dirname "$0")"

echo "== git pull =="
git pull --ff-only

echo "== backend deps =="
( cd backend && venv/bin/pip install -q -r requirements.txt )

echo "== frontend build =="
( cd frontend && npm install --no-audit --no-fund && npm run build )

echo "== webp twins for any new images =="
for base in frontend/dist frontend/public; do
  find "$base" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read -r f; do
    [ -f "$f.webp" ] || cwebp -quiet -q 80 "$f" -o "$f.webp"
  done
done

echo "== restart API =="
pm2 restart beauty-clinic --update-env

echo "== health =="
# API needs a moment to finish its graceful restart — poll instead of a fixed sleep
api_code=000
for i in $(seq 1 15); do
  api_code=$(curl -s -o /dev/null -w "%{http_code}" https://backend.marynassifchbat.com/health || true)
  [ "$api_code" = "200" ] && break
  sleep 2
done
echo "  API /health -> $api_code"
curl -s -o /dev/null -w "  Site /      -> %{http_code}\n" https://marynassifchbat.com/
[ "$api_code" = "200" ] || { echo "API did not come back healthy"; exit 1; }
echo "done."

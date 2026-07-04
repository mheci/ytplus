#!/usr/bin/env bash
# Release helper for YT+
#
# Usage:  ./release.sh 3.0.5
#
# What it does:
#  1. Updates the @downloadURL in both files to point at the new version
#  2. Updates the @version header in both files
#  3. Updates the @updateURL in the meta to point at the new version's meta
#  4. Runs node --check
#  5. Commits, tags, pushes
#  6. Creates the GitHub release and uploads the assets
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new-version>" >&2
  echo "  e.g. $0 3.0.5" >&2
  exit 1
fi

NEW_VER="$1"
if ! echo "$NEW_VER" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "Version must look like X.Y.Z (got: $NEW_VER)" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

CUR_VER=$(grep -m1 '^// @version' yt+.user.js | awk '{print $3}')
echo "Current version: $CUR_VER"
echo "New version:     $NEW_VER"

if [ "$CUR_VER" = "$NEW_VER" ]; then
  echo "Version is already $NEW_VER - nothing to do." >&2
  exit 1
fi

NEW_DOWNLOAD="https://github.com/mheci/ytplus/releases/download/v${NEW_VER}/yt%2B.user.js"
NEW_UPDATE_META="https://github.com/mheci/ytplus/releases/download/v${NEW_VER}/yt%2B.meta.js"

# 1) Update headers
for f in yt+.user.js yt+.meta.js; do
  sed -i.bak \
    -e "s|^// @version      .*|// @version      ${NEW_VER}|" \
    -e "s|^// @downloadURL  .*|// @downloadURL  ${NEW_DOWNLOAD}|" \
    "$f"
  if [ "$f" = "yt+.meta.js" ]; then
    sed -i.bak -e "s|^// @updateURL    .*|// @updateURL    ${NEW_UPDATE_META}|" "$f"
  fi
  rm -f "$f.bak"
done

echo ""
echo "=== Updated headers ==="
grep -E '@version|@updateURL|@downloadURL' yt+.user.js yt+.meta.js
echo ""

# 2) Syntax check
echo "=== Syntax check ==="
node --check yt+.user.js || { echo "Syntax check failed!"; exit 1; }
echo "OK"

# 3) Commit and push
git add yt+.user.js yt+.meta.js
git -c user.email=ytplus@users.noreply.github.com -c user.name="YT+ Bot" \
  commit -m "v${NEW_VER} release"
git push origin main

# 4) Tag and push
git tag "v${NEW_VER}" -f
git push origin "v${NEW_VER}" -f

# 5) GitHub release + assets
TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -z "$TOKEN" ]; then
  echo ""
  echo "No GH_TOKEN set. Skipping GitHub release creation."
  echo "Set GH_TOKEN and run:  ./release-upload.sh ${NEW_VER}"
  exit 0
fi

echo ""
echo "=== Creating GitHub release ==="
EXISTING=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/mheci/ytplus/releases/tags/v${NEW_VER}" \
  | python3 -c "import json, sys; r = json.load(sys.stdin); print(r.get('id', ''))" 2>/dev/null || true)

if [ -z "$EXISTING" ]; then
  REL_ID=$(curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: application/json" \
    "https://api.github.com/repos/mheci/ytplus/releases" \
    -d "{\"tag_name\":\"v${NEW_VER}\",\"name\":\"v${NEW_VER}\",\"body\":\"v${NEW_VER}\",\"draft\":false,\"prerelease\":false}" \
    | python3 -c "import json, sys; print(json.load(sys.stdin)['id'])")
  echo "Created release id=$REL_ID"
else
  REL_ID="$EXISTING"
  echo "Using existing release id=$REL_ID"
fi

# Delete all existing assets
for a in $(curl -s -H "Authorization: token $TOKEN" "https://api.github.com/repos/mheci/ytplus/releases/$REL_ID/assets" | python3 -c "import json, sys; [print(a['id']) for a in json.load(sys.stdin)]" 2>/dev/null); do
  curl -s -X DELETE -H "Authorization: token $TOKEN" "https://api.github.com/repos/mheci/ytplus/releases/assets/$a" -o /dev/null
done

# Upload fresh assets
for f in "yt+.user.js:application/javascript" "yt+.meta.js:application/javascript" "icon.png:image/png"; do
  name="${f%%:*}"
  ctype="${f##*:}"
  encoded=$(echo "$name" | sed 's/+/%2B/g')
  echo "  Uploading $name..."
  curl -s -X POST -H "Authorization: token $TOKEN" -H "Content-Type: $ctype" \
    --data-binary @"$REPO_DIR/$name" \
    "https://uploads.github.com/repos/mheci/ytplus/releases/$REL_ID/assets?name=$encoded" \
    | python3 -c "import json, sys; a = json.load(sys.stdin); print(f'    {a[\"name\"]}: {a[\"size\"]} bytes -- {a[\"state\"]}')"
done

echo ""
echo "=== Done! ==="
echo "v${NEW_VER} published. Test the update flow:"
echo "  curl -sL https://raw.githubusercontent.com/mheci/ytplus/main/yt+.meta.js | grep @version"
echo "  curl -sL https://github.com/mheci/ytplus/releases/download/v${NEW_VER}/yt+.user.js | head -1"

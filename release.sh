#!/usr/bin/env bash
# Release helper for YT+
#
# Usage:  ./release.sh 3.0.5
#
# What it does:
#  1. Updates the @version header in both files
#  2. (URLs use releases/latest/download/ - no rewrite needed)
#  3. Runs node --check
#  4. Commits, tags, pushes
#  5. Creates the GitHub release and uploads the assets
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

# 1) Update only the @version. The @updateURL and @downloadURL point at
# /releases/latest/download/ which is a stable URL that always redirects
# to the current release. No URL rewrite is needed per-version.
for f in yt+.user.js yt+.meta.js; do
  sed -i.bak "s|^// @version      .*|// @version      ${NEW_VER}|" "$f"
  rm -f "$f.bak"
done

echo ""
echo "=== Updated headers ==="
grep -E '@version|@updateURL|@downloadURL' yt+.user.js yt+.meta.js
echo ""

# 2) Syntax check + tests
echo "=== Syntax check ==="
node --check yt+.user.js || { echo "Syntax check failed!"; exit 1; }
echo "OK"

# Run all test files. Each one is a JSDOM smoke test; the exit code
# is 0 on success. We list them explicitly so adding a new one to the
# repo is opt-in (you have to remember to add it to the list).
echo "=== Tests ==="
for t in test_sandbox.js test_dashboard.js test_update_check.js test_sb.js test_dm.js test_hotkeys.js test_memory.js; do
  if [ -f "$t" ]; then
    printf "  %-25s " "$t"
    if node "$t" >/tmp/_ytp_test.out 2>&1; then
      echo "OK"
    else
      echo "FAIL"
      cat /tmp/_ytp_test.out
      exit 1
    fi
  fi
done
rm -f /tmp/_ytp_test.out

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
echo "  curl -sL https://github.com/mheci/ytplus/releases/latest/download/yt%2B.meta.js | grep @version"
echo "  curl -sL https://github.com/mheci/ytplus/releases/latest/download/yt%2B.user.js | head -1"

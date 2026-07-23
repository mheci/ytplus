#!/usr/bin/env bash
# Release helper for YT+
#
# Usage:  ./tools/release.sh 3.0.21.0
#
# What it does:
#  1. Updates the @version header in yt+.user.js + package.json
#  2. Regenerates yt+.meta.js verbatim from the user.js header
#  3. Runs node --check and the full QA matrix (tests/run-all.js)
#  4. Commits, tags, pushes
#  5. (Optional, with GH_TOKEN set) creates the GitHub release and
#     uploads yt+.user.js / yt+.meta.js / icon.png
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <new-version>" >&2
  echo "  e.g. $0 3.0.21.0" >&2
  exit 1
fi

NEW_VER="$1"
if ! echo "$NEW_VER" | grep -qE '^[0-9]+(\.[0-9]+){2,3}$'; then
  echo "Version must look like X.Y.Z or X.Y.Z.W (got: $NEW_VER)" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_DIR"

CUR_VER=$(grep -m1 '^// @version' yt+.user.js | awk '{print $3}')
echo "Current version: $CUR_VER"
echo "New version:     $NEW_VER"

if [ "$CUR_VER" = "$NEW_VER" ]; then
  echo "Version is already $NEW_VER - nothing to do." >&2
  exit 1
fi

# 1) Bump @version + package.json. URLs use releases/latest/download/ —
# stable across versions, no rewrite needed.
sed -i.bak "s|^// @version      .*|// @version      ${NEW_VER}|" yt+.user.js
rm -f yt+.user.js.bak
node -e '
  const fs = require("fs");
  const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
  p.version = process.argv[1];
  fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
' "$NEW_VER"

# Any bundled-version literals (GM_info-less fallback) must move too.
sed -i.bak "s|\"${CUR_VER}\"|\"${NEW_VER}\"|g" yt+.user.js && rm -f yt+.user.js.bak

# 2) Regenerate meta.js verbatim from the header.
node -e '
  const fs = require("fs");
  const src = fs.readFileSync("yt+.user.js", "utf8");
  const start = src.indexOf("// ==UserScript==");
  const end = src.indexOf("// ==/UserScript==") + "// ==/UserScript==".length;
  fs.writeFileSync("yt+.meta.js", src.slice(start, end) + "\n");
'
grep -E '@version|@updateURL|@downloadURL' yt+.user.js yt+.meta.js | head -6

# 3) Syntax + full QA matrix
node --check yt+.user.js || { echo "Syntax check failed!"; exit 1; }
node tests/run-all.js

# 4) Commit / tag / push
git add -A
git -c user.email=ytplus@users.noreply.github.com -c user.name="YT+ Bot" \
  commit -m "v${NEW_VER} release"
git push origin main
git tag -a "v${NEW_VER}" -m "v${NEW_VER}"
git push origin "v${NEW_VER}"

# 5) GitHub release (only if GH_TOKEN is present)
if [ -n "${GH_TOKEN:-}" ]; then
  node -e '
    const { execFileSync } = require("child_process");
    execFileSync("gh", ["release", "create", "v'"$NEW_VER"'",
      "yt+.user.js", "yt+.meta.js", "icon.png",
      "--title", "YT+ v'"$NEW_VER"'", "--generate-notes"], { stdio: "inherit" });
  ' || echo "gh release failed; create the release manually."
fi

echo "Done: v${NEW_VER}"

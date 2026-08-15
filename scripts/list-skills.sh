#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for bucket in rust porting workflow misc in-progress; do
  dir="$REPO_ROOT/skills/$bucket"
  [ -d "$dir" ] || continue
  echo "## $bucket"
  for skill_dir in "$dir"/*/; do
    [ -f "$skill_dir/SKILL.md" ] || continue
    name="$(basename "$skill_dir")"
    description="$(sed -n 's/^description: //p' "$skill_dir/SKILL.md" | head -1)"
    printf '  %-24s %s\n' "$name" "$description"
  done
done

#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

for target in "$HOME/.claude/skills" "$HOME/.agents/skills"; do
  [ -d "$(dirname "$target")" ] || continue
  mkdir -p "$target"
  for bucket in rust porting workflow misc; do
    for skill_dir in "$REPO_ROOT/skills/$bucket"/*/; do
      [ -f "$skill_dir/SKILL.md" ] || continue
      name="$(basename "$skill_dir")"
      ln -sfn "${skill_dir%/}" "$target/$name"
      echo "linked $target/$name"
    done
  done
done

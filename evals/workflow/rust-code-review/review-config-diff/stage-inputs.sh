#!/usr/bin/env bash
set -eu
here="$(dirname "$0")"
cp -R "$here/inputs/." .
cp "$here/change.diff" change.diff
patch -p1 --quiet < change.diff

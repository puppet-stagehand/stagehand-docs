#!/bin/sh
set -eu

if [ "$#" -ne 2 ]; then
  printf '%s\n' 'usage: assert-promotable-commit.sh ENVIRONMENT FULL_GIT_SHA' >&2
  exit 1
fi

environment=$1
commit=$2

case "$environment" in
  testpilots | beta | stable) ;;
  *)
    printf '%s\n' 'environment must be testpilots, beta, or stable' >&2
    exit 1
    ;;
esac

if ! printf '%s\n' "$commit" | grep -Eq '^[0-9a-f]{40}$'; then
  printf '%s\n' 'commit must be a full lowercase 40-character Git SHA' >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  printf '%s\n' 'working tree must be clean before promotion' >&2
  exit 1
fi

if ! git rev-parse --verify --quiet "${commit}^{commit}" >/dev/null; then
  printf '%s\n' 'commit does not identify a fetched Git commit' >&2
  exit 1
fi

if [ "$(git rev-parse HEAD)" != "$commit" ]; then
  printf '%s\n' 'checked-out HEAD does not match the requested commit' >&2
  exit 1
fi

if ! git rev-parse --verify --quiet 'refs/remotes/origin/main^{commit}' >/dev/null; then
  printf '%s\n' 'origin/main must be fetched before promotion' >&2
  exit 1
fi

if ! git merge-base --is-ancestor "$commit" origin/main; then
  printf '%s\n' 'commit is not reachable from origin/main' >&2
  exit 1
fi

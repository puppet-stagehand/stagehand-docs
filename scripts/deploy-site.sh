#!/bin/sh
set -eu

case "${DEPLOY_ENVIRONMENT:-}" in
  testpilots | beta | stable) ;;
  *)
    printf '%s\n' 'DEPLOY_ENVIRONMENT must be testpilots, beta, or stable' >&2
    exit 1
    ;;
esac

case "${CONTENT_BUCKET:-}" in
  '' | *[!a-z0-9.-]* | .* | *..* | *.)
    printf '%s\n' 'CONTENT_BUCKET must be a valid non-empty S3 bucket name' >&2
    exit 1
    ;;
esac

case "${DISTRIBUTION_ID:-}" in
  '' | *[!A-Z0-9]*)
    printf '%s\n' 'DISTRIBUTION_ID must be a valid non-empty CloudFront distribution ID' >&2
    exit 1
    ;;
esac

if [ ! -d dist/assets ] || [ ! -f dist/index.html ]; then
  printf '%s\n' 'dist must contain a built site and assets before deployment' >&2
  exit 1
fi

aws s3 sync dist/assets "s3://$CONTENT_BUCKET/assets" \
  --cache-control 'public,max-age=31536000,immutable' \
  --delete

aws s3 sync dist "s3://$CONTENT_BUCKET" \
  --exclude 'assets/*' \
  --cache-control 'public,max-age=0,must-revalidate' \
  --delete

aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths \
  '/index.html' \
  '/tiers/index.html' \
  '/compatibility/index.html' \
  '/docs/index.html' \
  '/docs/getting-started/index.html' \
  '/docs/security/index.html' \
  '/docs/first-run/index.html' \
  '/docs/installer-registry-distribution/index.html' \
  '/docs/installer-support/index.html' \
  '/docs/testers-guide/index.html' \
  '/docs/user-guide/index.html' \
  '/docs/why-stagehand/index.html' \
  '/downloads/index.html' \
  '/support/index.html' \
  '/404.html' \
  '/deployed-commit.txt' \
  '/data/*'

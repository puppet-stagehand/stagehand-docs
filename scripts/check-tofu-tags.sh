#!/bin/sh
set -eu

environments_dir="infra/environments"
module_dir="infra/modules/static-site"
expected_environments="beta stable testpilots"

if ! command -v rg >/dev/null 2>&1; then
  printf '%s\n' "scripts/check-tofu-tags.sh: rg is required" >&2
  exit 1
fi

actual_environments=$(
  find "$environments_dir" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | LC_ALL=C sort | tr '\n' ' ' | sed 's/ $//'
)

if [ "$actual_environments" != "$expected_environments" ]; then
  printf '%s\n' "$environments_dir: expected only testpilots, beta, and stable; found: $actual_environments" >&2
  exit 1
fi

for environment in testpilots beta stable; do
  root="$environments_dir/$environment/main.tf"

  if ! awk -v expected_environment="$environment" '
    /^provider "aws"[[:space:]]*\{/ {
      in_provider = 1
      depth = 0
      has_project = 0
      has_environment = 0
      provider_count++
    }

    in_provider {
      line = $0
      opens = gsub(/\{/, "{", line)
      closes = gsub(/\}/, "}", line)
      depth += opens - closes

      if ($0 ~ /project[[:space:]]*=[[:space:]]*"stagehand"/) has_project = 1
      if ($0 ~ "environment[[:space:]]*=[[:space:]]*\"" expected_environment "\"") has_environment = 1

      if (depth == 0) {
        if (!has_project || !has_environment) invalid_provider = 1
        in_provider = 0
      }
    }

    END { exit !(provider_count == 2 && !invalid_provider) }
  ' "$root"; then
    printf '%s\n' "$root: both AWS providers must default project=stagehand and environment=$environment" >&2
    exit 1
  fi

  if ! awk -v expected_environment="$environment" '
    /^module "site"[[:space:]]*\{/ {
      in_module = 1
      depth = 0
      has_environment = 0
      module_count++
    }

    in_module {
      line = $0
      opens = gsub(/\{/, "{", line)
      closes = gsub(/\}/, "}", line)
      depth += opens - closes

      if ($0 ~ "environment[[:space:]]*=[[:space:]]*\"" expected_environment "\"") has_environment = 1

      if (depth == 0) {
        if (!has_environment) invalid_module = 1
        in_module = 0
      }
    }

    END { exit !(module_count == 1 && !invalid_module) }
  ' "$root"; then
    printf '%s\n' "$root: module must use environment $environment" >&2
    exit 1
  fi
done

if offending=$(rg -n --pcre2 '^[[:space:]]*tags[[:space:]]*=(?![[:space:]]*local\.required_tags[[:space:]]*$)' "$module_dir" --glob '*.tf'); then
  printf '%s\n' "$offending" | while IFS= read -r finding; do
    printf '%s\n' "$finding: module tags must use local.required_tags without standalone overrides" >&2
  done
  exit 1
fi

printf '%s\n' "Verified OpenTofu tag policy for testpilots, beta, and stable."

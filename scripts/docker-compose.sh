#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
compose_file="$project_dir/compose.yaml"
environment_file="$project_dir/.env.docker"
project_name="promptube_admin"

if [ ! -f "$environment_file" ]; then
  echo "Missing .env.docker. Copy .env.docker.example and review its non-sensitive values." >&2
  exit 1
fi

for secret_name in postgres-password redis-password object-storage-password; do
  secret_path="$project_dir/secrets/$secret_name"

  if [ ! -f "$secret_path" ] || [ ! -s "$secret_path" ]; then
    echo "Missing required secret file: secrets/$secret_name" >&2
    echo "Run npm run docker:secrets:init first." >&2
    exit 1
  fi

  secret_mode="$(stat -c '%a' "$secret_path")"
  if [ "$secret_mode" != "600" ]; then
    echo "Secret secrets/$secret_name must have permissions 600, found $secret_mode." >&2
    exit 1
  fi
done

cd "$project_dir"
exec docker compose \
  --project-name "$project_name" \
  --env-file "$environment_file" \
  --file "$compose_file" \
  "$@"

#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
compose_file="$project_dir/compose.yaml"
environment_file="$project_dir/.env.docker"
project_name="promptube_admin"
secrets_dir="$project_dir/secrets"
secret_library="$project_dir/scripts/lib/docker-secrets.sh"
compose_command="${1:-}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Missing required command: docker" >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is unavailable." >&2
  exit 1
fi

if [ -z "$compose_command" ]; then
  echo "A Docker Compose command is required." >&2
  exit 1
fi

if [ ! -f "$compose_file" ] || [ -L "$compose_file" ]; then
  echo "The repository compose.yaml is missing or unsafe." >&2
  exit 1
fi

case "$compose_command" in
  push)
    echo "Pushing admin images is forbidden." >&2
    exit 1
    ;;
  rm)
    echo "Docker Compose rm is not supported by this wrapper." >&2
    exit 1
    ;;
esac

if [ "$compose_command" = "down" ]; then
  for compose_argument in "$@"; do
    case "$compose_argument" in
      -v | --volumes)
        echo "docker compose down must never remove volumes." >&2
        exit 1
        ;;
    esac
  done
fi

require_environment_file() {
  if [ -L "$environment_file" ] || [ ! -f "$environment_file" ] || [ ! -s "$environment_file" ]; then
    echo "Missing or unsafe .env.docker. Copy .env.docker.example and review it." >&2
    exit 1
  fi
}

require_complete_configuration() {
  require_environment_file

  for required_command in realpath stat; do
    if ! command -v "$required_command" >/dev/null 2>&1; then
      echo "Missing required command: $required_command" >&2
      exit 1
    fi
  done

  if [ ! -r "$secret_library" ]; then
    echo "Missing Docker secret validation library." >&2
    exit 1
  fi

  . "$secret_library"
  validate_all_docker_secrets
}

run_with_environment_file() {
  exec docker compose \
    --project-name "$project_name" \
    --env-file "$environment_file" \
    --file "$compose_file" \
    "$@"
}

run_with_safe_fallbacks() {
  export ADMIN_HTTP_PORT=8080
  export APP_ENV=local
  export APP_VERSION=0.1.0
  export BETTER_AUTH_BASE_URL=http://127.0.0.1:8080
  export NEXT_PUBLIC_APP_NAME="Promptube Admin"
  export POSTGRES_DB=promptube_admin
  export POSTGRES_USER=promptube_admin
  export POSTGRES_APP_USER=promptube_admin_app
  export POSTGRES_MIGRATION_USER=promptube_admin_migration
  export POSTGRES_BACKUP_USER=promptube_admin_backup
  export TRUSTED_ORIGINS=http://127.0.0.1:8080
  export MINIO_ROOT_USER=promptube_admin_storage

  exec docker compose \
    --project-name "$project_name" \
    --file "$compose_file" \
    "$@"
}

cd "$project_dir"

case "$compose_command" in
  config | create | up | start | restart | run)
    require_complete_configuration
    run_with_environment_file "$@"
    ;;
  build | pull)
    require_environment_file
    run_with_environment_file "$@"
    ;;
  ps | logs | top | images | events | stop | down)
    run_with_safe_fallbacks "$@"
    ;;
  *)
    require_complete_configuration
    run_with_environment_file "$@"
    ;;
esac

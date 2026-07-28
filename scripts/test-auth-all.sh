#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
compose_file="$project_dir/compose.test.yaml"
project_name="promptube_admin_test"
mode="${1:-all}"
temporary_root=""
environment_file=""

for required_command in chmod docker grep mktemp mkdir openssl rm rmdir sed stat; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Missing required command: $required_command" >&2
    exit 1
  fi
done

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Compose is unavailable." >&2
  exit 1
fi

if [ ! -f "$compose_file" ] || [ -L "$compose_file" ]; then
  echo "The test Compose file is missing or unsafe." >&2
  exit 1
fi

cleanup() {
  if [ -n "$environment_file" ] && [ -f "$environment_file" ]; then
    docker compose --project-name "$project_name" --env-file "$environment_file" --file "$compose_file" down >/dev/null 2>&1 || true
  else
    ADMIN_HTTP_PORT=8080 \
    APP_VERSION=0.1.0-test \
    NEXT_PUBLIC_APP_NAME="Promptube Admin" \
    POSTGRES_APP_USER=promptube_admin_test_app \
    POSTGRES_DB=promptube_admin_test \
    POSTGRES_MIGRATION_USER=promptube_admin_test_migration \
    POSTGRES_USER=promptube_admin_test \
    TEST_SECRETS_DIR="$project_dir/secrets" \
      docker compose --project-name "$project_name" --file "$compose_file" down >/dev/null 2>&1 || true
  fi

  if [ -n "$temporary_root" ]; then
    case "$temporary_root" in
      "$project_dir"/.tmp-auth-test.*)
        rm -rf -- "$temporary_root"
        ;;
    esac
  fi
}

trap cleanup EXIT HUP INT TERM

create_private_secret() {
  secret_name="$1"
  secret_path="$temporary_root/secrets/$secret_name"
  temporary_secret="$(mktemp "$temporary_root/secrets/.${secret_name}.XXXXXX")"

  if ! openssl rand -hex 32 >"$temporary_secret"; then
    echo "Failed to generate test secret: $secret_name" >&2
    exit 1
  fi

  if [ ! -s "$temporary_secret" ]; then
    echo "Generated test secret is empty: $secret_name" >&2
    exit 1
  fi

  chmod 600 -- "$temporary_secret"
  mv -- "$temporary_secret" "$secret_path"
}

prepare_environment() {
  temporary_root="$(mktemp -d "$project_dir/.tmp-auth-test.XXXXXX")"
  mkdir -m 700 -- "$temporary_root/secrets"

  create_private_secret postgres-password
  create_private_secret postgres-app-password
  create_private_secret postgres-migration-password
  create_private_secret redis-password
  create_private_secret better-auth-secret
  create_private_secret admin-password

  environment_file="$temporary_root/test.env"
  {
    printf 'APP_VERSION=0.1.0-test\n'
    printf 'NEXT_PUBLIC_APP_NAME=Promptube Admin\n'
    printf 'POSTGRES_APP_USER=promptube_admin_test_app\n'
    printf 'POSTGRES_DB=promptube_admin_test\n'
    printf 'POSTGRES_MIGRATION_USER=promptube_admin_test_migration\n'
    printf 'POSTGRES_USER=promptube_admin_test\n'
    printf 'TEST_SECRETS_DIR=%s\n' "$temporary_root/secrets"
  } >"$environment_file"
  chmod 600 -- "$environment_file"
}

compose() {
  docker compose --project-name "$project_name" --env-file "$environment_file" --file "$compose_file" "$@"
}

assert_no_test_resources() {
  if docker ps -a --format '{{.Names}}' | grep -q '^promptube_admin_test'; then
    echo "Test containers still exist." >&2
    exit 1
  fi
  if docker network ls --format '{{.Name}}' | grep -q '^promptube_admin_test'; then
    echo "Test networks still exist." >&2
    exit 1
  fi
  if docker volume ls --format '{{.Name}}' | grep -q '^promptube_admin_test'; then
    echo "Test volumes must not exist." >&2
    exit 1
  fi
}

wait_for_service() {
  service_name="$1"
  attempts=60
  while [ "$attempts" -gt 0 ]; do
    if compose ps --format json "$service_name" | grep -q '"Health":"healthy"'; then
      return 0
    fi
    attempts=$((attempts - 1))
    sleep 2
  done
  echo "Service did not become healthy: $service_name" >&2
  compose logs --no-color --tail 120 "$service_name" >&2
  exit 1
}

check_readiness_failure() {
  stopped_service="$1"
  compose stop "$stopped_service" >/dev/null
  compose exec -T admin-test-app wget --quiet --spider http://127.0.0.1:3000/api/health/live
  if compose exec -T admin-test-app wget --quiet --spider http://127.0.0.1:3000/api/health/ready; then
    echo "Readiness remained healthy after stopping $stopped_service." >&2
    exit 1
  fi
  compose up -d --wait --wait-timeout 120 "$stopped_service" >/dev/null
  wait_for_service "$stopped_service"
}

run_full_auth_validation() {
  prepare_environment

  compose config --quiet
  compose build admin-test-app admin-test-reverse-proxy admin-test-db-provision admin-test-db-migrate admin-test-bootstrap >/dev/null
  compose up -d --wait --wait-timeout 180 admin-test-postgres admin-test-redis >/dev/null
  compose --profile test-tools run --rm admin-test-db-provision
  compose --profile test-tools run --rm admin-test-db-migrate
  compose --profile test-tools run --rm admin-test-bootstrap

  bootstrap_stdout="$temporary_root/bootstrap-second.out"
  bootstrap_stderr="$temporary_root/bootstrap-second.err"
  if compose --profile test-tools run --rm admin-test-bootstrap >"$bootstrap_stdout" 2>"$bootstrap_stderr"; then
    echo "Second admin bootstrap unexpectedly succeeded." >&2
    exit 1
  fi
  rm -f -- "$bootstrap_stdout" "$bootstrap_stderr"

  compose up -d --wait --wait-timeout 180 admin-test-app admin-test-reverse-proxy >/dev/null
  if ! compose --profile test-runner run --rm admin-test-runner; then
    compose logs --no-color --tail 200 admin-test-app admin-test-reverse-proxy |
      sed -E 's/(password|secret|token|cookie|authorization)([^[:space:]]*)/[redacted]/Ig' >&2
    exit 1
  fi
  check_readiness_failure admin-test-postgres
  check_readiness_failure admin-test-redis

  compose down >/dev/null
  assert_no_test_resources
  rm -rf -- "$temporary_root"
  temporary_root=""
}

case "$mode" in
  all | auth | e2e | integration | security)
    run_full_auth_validation
    ;;
  config)
    prepare_environment
    compose config --quiet
    ;;
  up)
    echo "Use test:auth:all for managed test startup and cleanup." >&2
    exit 1
    ;;
  down)
    prepare_environment
    compose down >/dev/null
    assert_no_test_resources
    ;;
  *)
    echo "Unknown auth test mode: $mode" >&2
    exit 1
    ;;
esac

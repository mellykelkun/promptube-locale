#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
compose="$project_dir/scripts/docker-compose.sh"
environment_file="$project_dir/.env.docker"
secrets_dir="$project_dir/secrets"
secret_library="$project_dir/scripts/lib/docker-secrets.sh"
temporary_directory=""

fail() {
  echo "$1" >&2
  exit 1
}

cleanup() {
  if [ -n "$temporary_directory" ] && [ -d "$temporary_directory" ]; then
    rm -rf -- "$temporary_directory"
  fi
}

trap cleanup EXIT HUP INT TERM

for required_command in curl docker find grep jq realpath sed stat; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    fail "Missing required command: $required_command"
  fi
done

if [ ! -r "$secret_library" ]; then
  fail "Missing Docker secret validation library."
fi

if [ -L "$environment_file" ] || [ ! -f "$environment_file" ]; then
  fail ".env.docker is missing or unsafe."
fi

. "$secret_library"
validate_all_docker_secrets

port_definition_count="$(grep -c '^ADMIN_HTTP_PORT=' "$environment_file" || true)"
if [ "$port_definition_count" -ne 1 ]; then
  fail "ADMIN_HTTP_PORT must be defined exactly once."
fi

http_port="$(sed -n 's/^ADMIN_HTTP_PORT=//p' "$environment_file")"
case "$http_port" in
  *[!0-9]* | "")
    fail "ADMIN_HTTP_PORT must contain only decimal digits."
    ;;
esac

if [ "$http_port" -lt 1024 ] || [ "$http_port" -gt 65535 ]; then
  fail "ADMIN_HTTP_PORT must be between 1024 and 65535."
fi

compose_configuration="$("$compose" config --format json)"
printf '%s' "$compose_configuration" | jq -e '
  .name == "promptube_admin"
  and (.services | all(
    (has("container_name") | not)
    and (.privileged != true)
    and ((.network_mode // "") != "host")
    and ((.pid // "") != "host")
    and ((.ipc // "") != "host")
  ))
  and ((.services["admin-promptube-app"].depends_on // {}) | length == 0)
  and ((.services["admin-promptube-app"].networks | keys | sort) == ["frontend"])
  and ((.services["admin-promptube-reverse-proxy"].networks | keys | sort) == ["frontend"])
  and (.networks.backend.internal == true)
' >/dev/null || fail "Rendered Compose configuration violates the expected isolation."

if printf '%s' "$compose_configuration" | grep -Eqi 'promptube[-_]prod|infrastructure_'; then
  fail "Rendered Compose configuration references a foreign Promptube resource."
fi

"$project_dir/scripts/docker-health.sh"

temporary_directory="$(mktemp -d "$project_dir/.tmp-docker-verify.XXXXXX")"
root_headers="$temporary_directory/root-headers"
root_body_file="$temporary_directory/root-body"
health_headers="$temporary_directory/health-headers"
health_body_file="$temporary_directory/health-body"

base_url="http://127.0.0.1:$http_port"
curl \
  --fail \
  --silent \
  --show-error \
  --dump-header "$root_headers" \
  --output "$root_body_file" \
  "$base_url/"
curl \
  --fail \
  --silent \
  --show-error \
  --dump-header "$health_headers" \
  --output "$health_body_file" \
  "$base_url/api/health"

sed -i 's/\r$//' "$root_headers" "$health_headers"

jq -e '
  .status == "ok"
  and .service == "promptube-admin-locale"
  and .environment == "local"
  and (.version | type == "string" and length > 0)
  and (.timestamp | type == "string"
    and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$"))
  and (keys | sort == ["environment", "service", "status", "timestamp", "version"])
' "$health_body_file" >/dev/null || fail "Healthcheck response does not match the stable public contract."

if grep -Eqi 'password|secret|stack|token|cookie|authorization|/home/|/app/' "$health_body_file"; then
  fail "Healthcheck response contains a forbidden sensitive marker."
fi

if grep -Eqi 'fonts\.googleapis\.com|fonts\.gstatic\.com' "$root_body_file"; then
  fail "The browser response references a remote Google Font."
fi

for header_file in "$root_headers" "$health_headers"; do
  grep -Eqi '^x-content-type-options: nosniff\r?$' "$header_file" ||
    fail "X-Content-Type-Options is missing."
  grep -Eqi '^x-frame-options: DENY\r?$' "$header_file" ||
    fail "X-Frame-Options is missing."

  request_id_count="$(grep -Eic '^x-request-id: [0-9a-f]{32}\r?$' "$header_file" || true)"
  correlation_id_count="$(grep -Eic '^x-correlation-id: [0-9a-f]{32}\r?$' "$header_file" || true)"
  if [ "$request_id_count" -ne 1 ] || [ "$correlation_id_count" -ne 1 ]; then
    fail "Proxy request identifiers are missing or ambiguous."
  fi

  request_id="$(sed -n 's/^[Xx]-[Rr]equest-[Ii][Dd]: \([0-9a-f]\{32\}\)\r*$/\1/p' "$header_file")"
  correlation_id="$(sed -n 's/^[Xx]-[Cc]orrelation-[Ii][Dd]: \([0-9a-f]\{32\}\)\r*$/\1/p' "$header_file")"
  if [ "$request_id" != "$correlation_id" ]; then
    fail "X-Request-ID and X-Correlation-ID are not coherent."
  fi

  if grep -Eqi '^set-cookie:' "$header_file"; then
    fail "The technical foundation unexpectedly emits a cookie."
  fi
done

grep -Eqi '^cache-control: no-store\r?$' "$health_headers" ||
  fail "Healthcheck response must use Cache-Control: no-store."

proxy_id="$("$compose" ps -q admin-promptube-reverse-proxy)"
docker inspect "$proxy_id" | jq -e --arg port "$http_port" '
  .[0].NetworkSettings.Ports["8080/tcp"]
  | length == 1
    and .[0].HostIp == "127.0.0.1"
    and .[0].HostPort == $port
' >/dev/null || fail "The proxy host binding is not restricted to the configured loopback port."

all_container_ids=""

for service_name in \
  admin-promptube-reverse-proxy \
  admin-promptube-app \
  admin-promptube-postgres \
  admin-promptube-redis \
  admin-promptube-object-storage
do
  container_id="$("$compose" ps -q "$service_name")"
  if [ -z "$container_id" ]; then
    fail "$service_name is not running."
  fi

  all_container_ids="$all_container_ids $container_id"
  inspect_json="$(docker inspect "$container_id")"

  printf '%s' "$inspect_json" | jq -e '
    .[0]
    | .Config.Labels["com.docker.compose.project"] == "promptube_admin"
      and .HostConfig.Privileged == false
      and ((.HostConfig.NetworkMode // "") != "host")
      and ((.HostConfig.PidMode // "") != "host")
      and ((.HostConfig.IpcMode // "") != "host")
      and .HostConfig.ReadonlyRootfs == true
      and ((.HostConfig.SecurityOpt // []) | index("no-new-privileges:true") != null)
      and ((.HostConfig.CapDrop // []) | index("ALL") != null)
      and ((.HostConfig.Devices // []) | length == 0)
      and ([.Mounts[]? | select(.Destination == "/var/run/docker.sock")] | length == 0)
  ' >/dev/null || fail "$service_name violates a mandatory runtime hardening control."

  if printf '%s' "$inspect_json" | grep -Eqi 'promptube[-_]prod|infrastructure_|/var/run/docker\.sock'; then
    fail "$service_name references a foreign or forbidden resource."
  fi

  for mounted_network in $(printf '%s' "$inspect_json" | jq -r '.[0].NetworkSettings.Networks | keys[]'); do
    case "$mounted_network" in
      promptube_admin_*) ;;
      *) fail "$service_name is attached to a foreign network." ;;
    esac
  done

  for mounted_volume in $(printf '%s' "$inspect_json" | jq -r '.[0].Mounts[]? | select(.Type == "volume") | .Name'); do
    case "$mounted_volume" in
      promptube_admin_*) ;;
      *) fail "$service_name mounts a foreign volume." ;;
    esac
  done

  case "$service_name" in
    admin-promptube-reverse-proxy)
      expected_networks='["promptube_admin_frontend"]'
      expected_capabilities='[]'
      expected_tmpfs='["/tmp"]'
      ;;
    admin-promptube-app)
      expected_networks='["promptube_admin_frontend"]'
      expected_capabilities='[]'
      expected_tmpfs='["/tmp"]'
      ;;
    admin-promptube-postgres)
      expected_networks='["promptube_admin_backend"]'
      expected_capabilities='["CAP_CHOWN","CAP_DAC_OVERRIDE","CAP_FOWNER","CAP_SETGID","CAP_SETUID"]'
      expected_tmpfs='["/tmp","/var/run/postgresql"]'
      ;;
    admin-promptube-redis)
      expected_networks='["promptube_admin_backend"]'
      expected_capabilities='["CAP_CHOWN","CAP_DAC_OVERRIDE","CAP_SETGID","CAP_SETUID"]'
      expected_tmpfs='["/tmp"]'
      ;;
    admin-promptube-object-storage)
      expected_networks='["promptube_admin_backend"]'
      expected_capabilities='[]'
      expected_tmpfs='["/tmp"]'
      ;;
  esac

  printf '%s' "$inspect_json" | jq -e \
    --argjson expected_networks "$expected_networks" \
    --argjson expected_capabilities "$expected_capabilities" \
    --argjson expected_tmpfs "$expected_tmpfs" '
      .[0]
      | ((.NetworkSettings.Networks | keys | sort) == ($expected_networks | sort))
        and (((.HostConfig.CapAdd // []) | sort) == ($expected_capabilities | sort))
        and (((.HostConfig.Tmpfs // {}) | keys | sort) == ($expected_tmpfs | sort))
    ' >/dev/null || fail "$service_name has unexpected networks, capabilities, or tmpfs mounts."

  if [ "$service_name" != "admin-promptube-reverse-proxy" ] &&
    [ -n "$(docker port "$container_id")" ]; then
    fail "$service_name unexpectedly publishes a host port."
  fi

  for process_id in $(docker top "$container_id" -eo pid | sed -n '2,$p'); do
    process_uid="$(sed -n 's/^Uid:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "/proc/$process_id/status")"
    process_capabilities="$(
      sed -n 's/^CapEff:[[:space:]]*\([0-9a-fA-F][0-9a-fA-F]*\).*/\1/p' \
        "/proc/$process_id/status"
    )"
    if [ -z "$process_uid" ] || [ "$process_uid" -eq 0 ]; then
      fail "$service_name has a root runtime process."
    fi
    if [ "$process_capabilities" != "0000000000000000" ]; then
      fail "$service_name has an unexpected effective Linux capability."
    fi
  done
done

postgres_id="$("$compose" ps -q admin-promptube-postgres)"
redis_id="$("$compose" ps -q admin-promptube-redis)"
storage_id="$("$compose" ps -q admin-promptube-object-storage)"
app_id="$("$compose" ps -q admin-promptube-app)"
proxy_id="$("$compose" ps -q admin-promptube-reverse-proxy)"

postgres_uid="$(docker exec "$postgres_id" id -u postgres)"
redis_uid="$(docker exec "$redis_id" id -u redis)"
postgres_process_uid="$(sed -n 's/^Uid:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "/proc/$(docker inspect --format '{{.State.Pid}}' "$postgres_id")/status")"
redis_process_uid="$(sed -n 's/^Uid:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "/proc/$(docker inspect --format '{{.State.Pid}}' "$redis_id")/status")"

if [ "$postgres_process_uid" != "$postgres_uid" ]; then
  fail "PostgreSQL did not drop to its dedicated runtime user."
fi

if [ "$redis_process_uid" != "$redis_uid" ]; then
  fail "Redis did not drop to its dedicated runtime user."
fi

for non_root_container in "$app_id" "$proxy_id" "$storage_id"; do
  if [ "$(docker exec "$non_root_container" id -u)" -eq 0 ]; then
    fail "A user-facing service is running as root."
  fi
done

for secret_mapping in \
  "$postgres_id:admin-promptube-postgres-password" \
  "$redis_id:admin-promptube-redis-password" \
  "$storage_id:admin-promptube-object-storage-password"
do
  secret_container="${secret_mapping%%:*}"
  mounted_secret_name="${secret_mapping#*:}"
  mounted_secret_path="/run/secrets/$mounted_secret_name"

  docker exec "$secret_container" test -f "$mounted_secret_path" ||
    fail "A mounted Docker secret is not a regular file."
  docker exec "$secret_container" test ! -L "$mounted_secret_path" ||
    fail "A mounted Docker secret is a symbolic link."

  mounted_secret_mode="$(docker exec "$secret_container" stat -c '%a' "$mounted_secret_path")"
  if [ "$mounted_secret_mode" != "600" ]; then
    fail "A mounted Docker secret does not have effective permissions 600."
  fi

  docker inspect "$secret_container" | jq -e --arg destination "$mounted_secret_path" '
    .[0].Mounts
    | any(.Destination == $destination and .RW == false)
  ' >/dev/null || fail "A Docker secret is not mounted read-only."
done

for secret_name in postgres-password redis-password object-storage-password; do
  secret_pattern_file="$secrets_dir/$secret_name"

  if "$compose" logs --no-color | grep -a -F -q -f "$secret_pattern_file"; then
    fail "A secret value was detected in Docker logs."
  fi

  if docker inspect $all_container_ids | grep -a -F -q -f "$secret_pattern_file"; then
    fail "A secret value was detected in Docker inspect metadata."
  fi
done

for expected_image in \
  admin-promptube-app:0.1.0 \
  admin-promptube-reverse-proxy:1.31.3 \
  admin-promptube-object-storage:RELEASE.2025-10-15T17-29-55Z
do
  docker image inspect "$expected_image" >/dev/null 2>&1 ||
    fail "Expected runtime image is missing: $expected_image"

  if docker image save "$expected_image" 2>/dev/null |
    grep -a -F -q \
      -f "$secrets_dir/postgres-password" \
      -f "$secrets_dir/redis-password" \
      -f "$secrets_dir/object-storage-password"; then
    fail "A secret value was detected in a project runtime image."
  fi
done

docker run \
  --rm \
  --entrypoint /bin/sh \
  admin-promptube-app:0.1.0 \
  -ec '
    if find /app -type f \( -name ".env" -o -name ".env.*" -o -name "*.log" \) | grep -q .; then
      exit 1
    fi
    test ! -e /app/.git
    test ! -e /app/coverage
    test ! -e /app/tests
    test ! -e /app/node_modules/vitest
    ! command -v corepack >/dev/null 2>&1
    ! command -v gcc >/dev/null 2>&1
    ! command -v go >/dev/null 2>&1
    ! command -v make >/dev/null 2>&1
    ! command -v npm >/dev/null 2>&1
    ! command -v npx >/dev/null 2>&1
    ! grep -R -E \
      "fonts\\.googleapis\\.com|fonts\\.gstatic\\.com|next/font/google" \
      /app/.next/server \
      /app/.next/static \
      /app/public \
      /app/server.js \
      >/dev/null 2>&1
  ' || fail "The application runtime image contains a forbidden build or local artifact."

docker run \
  --rm \
  --entrypoint /bin/sh \
  admin-promptube-object-storage:RELEASE.2025-10-15T17-29-55Z \
  -ec '
    test ! -e /.git
    test ! -e /src
    ! command -v gcc >/dev/null 2>&1
    ! command -v go >/dev/null 2>&1
    ! command -v make >/dev/null 2>&1
  ' || fail "The object-storage runtime image contains source or compiler tooling."

minio_version="$(
  docker run \
    --rm \
    --entrypoint /usr/local/bin/minio \
    admin-promptube-object-storage:RELEASE.2025-10-15T17-29-55Z \
    --version
)"

printf '%s' "$minio_version" | grep -Fq 'RELEASE.2025-10-15T17-29-55Z' ||
  fail "The object-storage binary reports an unexpected release."
printf '%s' "$minio_version" | grep -Fq '9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a' ||
  fail "The object-storage binary reports an unexpected source commit."

echo "Docker stack verification passed."

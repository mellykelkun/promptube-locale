#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
compose="$project_dir/scripts/docker-compose.sh"
environment_file="$project_dir/.env.docker"

http_port="$(sed -n 's/^ADMIN_HTTP_PORT=//p' "$environment_file")"
case "$http_port" in
  *[!0-9]* | "")
    echo "ADMIN_HTTP_PORT must be numeric." >&2
    exit 1
    ;;
esac

"$project_dir/scripts/docker-health.sh"

base_url="http://127.0.0.1:$http_port"
curl --fail --silent --show-error --output /dev/null "$base_url/"
health_body="$(curl --fail --silent --show-error "$base_url/api/health")"

printf '%s' "$health_body" | jq -e '
  .status == "ok"
  and .service == "promptube-admin-locale"
  and (keys | sort == ["environment", "service", "status", "timestamp", "version"])
' >/dev/null

if printf '%s' "$health_body" | grep -Eqi 'password|secret|stack|token|/home/|/app/'; then
  echo "Healthcheck response contains a forbidden sensitive marker." >&2
  exit 1
fi

headers="$(curl --fail --silent --show-error --dump-header - --output /dev/null "$base_url/")"
printf '%s' "$headers" | grep -Eqi '^x-content-type-options: nosniff'
printf '%s' "$headers" | grep -Eqi '^x-frame-options: DENY'
printf '%s' "$headers" | grep -Eqi '^x-request-id: [0-9a-f]+'

proxy_id="$("$compose" ps -q admin-promptube-reverse-proxy)"
docker inspect "$proxy_id" | jq -e --arg port "$http_port" '
  .[0].NetworkSettings.Ports["8080/tcp"]
  | length == 1
    and .[0].HostIp == "127.0.0.1"
    and .[0].HostPort == $port
' >/dev/null

for service_name in \
  admin-promptube-app \
  admin-promptube-postgres \
  admin-promptube-redis \
  admin-promptube-object-storage
do
  container_id="$("$compose" ps -q "$service_name")"
  if [ -n "$(docker port "$container_id")" ]; then
    echo "$service_name unexpectedly publishes a host port." >&2
    exit 1
  fi
done

for service_name in \
  admin-promptube-reverse-proxy \
  admin-promptube-app \
  admin-promptube-postgres \
  admin-promptube-redis \
  admin-promptube-object-storage
do
  container_id="$("$compose" ps -q "$service_name")"
  project_label="$(docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}}' "$container_id")"
  if [ "$project_label" != "promptube_admin" ]; then
    echo "$service_name has an unexpected Compose project label." >&2
    exit 1
  fi

  for network_name in $(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{println $name}}{{end}}' "$container_id"); do
    case "$network_name" in
      promptube_admin_*) ;;
      *)
        echo "$service_name is attached to foreign network $network_name." >&2
        exit 1
        ;;
    esac
  done

  for volume_name in $(docker inspect --format '{{range .Mounts}}{{if eq .Type "volume"}}{{println .Name}}{{end}}{{end}}' "$container_id"); do
    case "$volume_name" in
      promptube_admin_*) ;;
      *)
        echo "$service_name mounts foreign volume $volume_name." >&2
        exit 1
        ;;
    esac
  done
done

postgres_id="$("$compose" ps -q admin-promptube-postgres)"
redis_id="$("$compose" ps -q admin-promptube-redis)"
storage_id="$("$compose" ps -q admin-promptube-object-storage)"

docker exec "$postgres_id" test -r /run/secrets/admin-promptube-postgres-password
docker exec "$redis_id" test -r /run/secrets/admin-promptube-redis-password
docker exec "$storage_id" test -r /run/secrets/admin-promptube-object-storage-password

stack_logs="$("$compose" logs --no-color)"
for secret_name in postgres-password redis-password object-storage-password; do
  secret_value="$(cat "$project_dir/secrets/$secret_name")"
  case "$stack_logs" in
    *"$secret_value"*)
      echo "A secret value was detected in Docker logs." >&2
      exit 1
      ;;
  esac
done

docker run \
  --rm \
  --name admin-promptube-app-image-check \
  --entrypoint /bin/sh \
  admin-promptube-app:0.1.0 \
  -ec '
    if find /app -type f \( -name ".env" -o -name ".env.*" -o -name "*.log" \) | grep -q .; then
      echo "The application image contains a forbidden local file." >&2
      exit 1
    fi
    test ! -e /app/node_modules/vitest
    if grep -R "fonts.googleapis.com" /app >/dev/null 2>&1; then
      echo "The application image references Google Fonts." >&2
      exit 1
    fi
  '

echo "Docker stack verification passed."

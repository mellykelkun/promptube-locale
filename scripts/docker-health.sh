#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
compose="$project_dir/scripts/docker-compose.sh"

for service_name in \
  admin-promptube-reverse-proxy \
  admin-promptube-app \
  admin-promptube-postgres \
  admin-promptube-redis \
  admin-promptube-object-storage
do
  container_id="$("$compose" ps -q "$service_name")"

  if [ -z "$container_id" ]; then
    echo "$service_name: container is not running." >&2
    exit 1
  fi

  health_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_id")"
  if [ "$health_status" != "healthy" ]; then
    echo "$service_name: $health_status" >&2
    exit 1
  fi

  echo "$service_name: healthy"
done

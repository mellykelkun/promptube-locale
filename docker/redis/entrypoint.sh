#!/bin/sh

set -eu

secret_file="/run/secrets/admin-promptube-redis-password"
runtime_config="/tmp/admin-promptube-redis.conf"

if [ ! -s "$secret_file" ]; then
  echo "Redis secret file is missing or empty." >&2
  exit 1
fi

redis_password="$(cat "$secret_file")"
umask 077

{
  echo "bind 0.0.0.0"
  echo "protected-mode yes"
  echo "port 6379"
  echo "daemonize no"
  echo "dir /data"
  echo "appendonly yes"
  echo "appendfsync everysec"
  echo "save 60 1"
  printf 'requirepass "%s"\n' "$redis_password"
} >"$runtime_config"

chown redis:redis /data "$runtime_config"
exec /usr/local/bin/docker-entrypoint.sh redis-server "$runtime_config"

#!/bin/sh

set -eu

secret_file="${REDIS_PASSWORD_FILE:-/run/secrets/admin-promptube-redis-password}"
runtime_config="/tmp/admin-promptube-redis.conf"

if [ -L "$secret_file" ]; then
  echo "Redis secret file must not be a symbolic link." >&2
  exit 1
fi

if [ ! -f "$secret_file" ] || [ ! -s "$secret_file" ]; then
  echo "Redis secret file must be a non-empty regular file." >&2
  exit 1
fi

secret_mode="$(stat -c '%a' "$secret_file")"
if [ "$secret_mode" != "600" ]; then
  echo "Redis secret file must have permissions 600." >&2
  exit 1
fi

if ! grep -Eq '^[0-9A-Za-z+/=]+$' "$secret_file"; then
  echo "Redis secret file contains unsupported configuration characters." >&2
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

chmod 600 "$runtime_config"
chown redis:redis /data "$runtime_config"
unset redis_password
exec /usr/local/bin/docker-entrypoint.sh redis-server "$runtime_config"

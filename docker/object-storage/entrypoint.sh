#!/bin/sh

set -eu

secret_file="${MINIO_ROOT_PASSWORD_FILE:-}"

if [ -z "$secret_file" ]; then
  echo "Object-storage secret file is not configured." >&2
  exit 1
fi

if [ -L "$secret_file" ]; then
  echo "Object-storage secret file must not be a symbolic link." >&2
  exit 1
fi

if [ ! -f "$secret_file" ] || [ ! -s "$secret_file" ]; then
  echo "Object-storage secret file must be a non-empty regular file." >&2
  exit 1
fi

secret_mode="$(stat -c '%a' "$secret_file")"
if [ "$secret_mode" != "600" ]; then
  echo "Object-storage secret file must have permissions 600." >&2
  exit 1
fi

MINIO_ROOT_PASSWORD="$(cat "$secret_file")"
export MINIO_ROOT_PASSWORD
unset MINIO_ROOT_PASSWORD_FILE

exec /usr/local/bin/minio "$@"

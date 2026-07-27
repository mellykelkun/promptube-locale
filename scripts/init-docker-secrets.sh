#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
secrets_dir="$project_dir/secrets"

umask 077
mkdir -p "$secrets_dir"

create_secret() {
  secret_name="$1"
  secret_path="$secrets_dir/$secret_name"

  if [ -e "$secret_path" ]; then
    if [ ! -f "$secret_path" ] || [ ! -s "$secret_path" ]; then
      echo "Secret $secret_name exists but is not a non-empty regular file." >&2
      exit 1
    fi

    chmod 600 "$secret_path"
    echo "Secret $secret_name already exists; permissions normalized to 600."
    return
  fi

  openssl rand -base64 48 >"$secret_path"
  chmod 600 "$secret_path"
  echo "Secret $secret_name created with permissions 600."
}

create_secret "postgres-password"
create_secret "redis-password"
create_secret "object-storage-password"

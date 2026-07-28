#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
secrets_dir="$project_dir/secrets"
secret_library="$project_dir/scripts/lib/docker-secrets.sh"
current_temporary_secret=""

umask 077

for required_command in chmod grep mkdir mktemp mv openssl realpath rm stat; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    echo "Missing required command: $required_command" >&2
    exit 1
  fi
done

if [ ! -r "$secret_library" ]; then
  echo "Missing Docker secret validation library." >&2
  exit 1
fi

if [ -L "$secrets_dir" ]; then
  echo "The secrets directory must not be a symbolic link." >&2
  exit 1
fi

if [ ! -e "$secrets_dir" ]; then
  mkdir -m 700 -- "$secrets_dir"
elif [ ! -d "$secrets_dir" ]; then
  echo "The secrets path must be a directory." >&2
  exit 1
fi

. "$secret_library"
prepare_secrets_directory

cleanup_temporary_secret() {
  if [ -n "$current_temporary_secret" ] && [ -e "$current_temporary_secret" ]; then
    rm -f -- "$current_temporary_secret"
  fi
}

trap cleanup_temporary_secret EXIT HUP INT TERM

create_secret() {
  secret_name="$1"
  secret_path="$secrets_dir/$secret_name"

  if [ -L "$secret_path" ] || [ -e "$secret_path" ]; then
    validate_secret_identity "$secret_name"
    chmod 600 -- "$secret_path"
    validate_secret_mode "$secret_name"
    echo "Secret $secret_name already exists; permissions validated."
    return
  fi

  current_temporary_secret="$(mktemp "$secrets_dir/.${secret_name}.tmp.XXXXXX")"

  if ! openssl rand -hex 32 >"$current_temporary_secret"; then
    echo "Secret $secret_name generation failed." >&2
    exit 1
  fi

  if [ ! -f "$current_temporary_secret" ] || [ ! -s "$current_temporary_secret" ]; then
    echo "Secret $secret_name generation produced an invalid temporary file." >&2
    exit 1
  fi

  if ! grep -Eq '^[0-9a-f]{64}$' "$current_temporary_secret"; then
    echo "Secret $secret_name generation produced an invalid representation." >&2
    exit 1
  fi

  chmod 600 -- "$current_temporary_secret"
  mv -n -- "$current_temporary_secret" "$secret_path"

  if [ -e "$current_temporary_secret" ]; then
    echo "Secret $secret_name appeared concurrently and was not replaced." >&2
    exit 1
  fi

  current_temporary_secret=""
  validate_secret_mode "$secret_name"
  echo "Secret $secret_name created with permissions 600."
}

create_secret "postgres-password"
create_secret "redis-password"
create_secret "object-storage-password"

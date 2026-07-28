#!/bin/sh

secret_error() {
  echo "$1" >&2
  return 1
}

prepare_secrets_directory() {
  if [ -L "$secrets_dir" ]; then
    secret_error "The secrets directory must not be a symbolic link."
    return 1
  fi

  if [ ! -d "$secrets_dir" ]; then
    secret_error "The secrets directory is missing or is not a directory."
    return 1
  fi

  canonical_secrets_dir="$(CDPATH= cd -- "$secrets_dir" && pwd -P)"
  if [ "$canonical_secrets_dir" != "$secrets_dir" ]; then
    secret_error "The secrets directory resolves outside its expected path."
    return 1
  fi
}

validate_secret_identity() {
  secret_name="$1"

  case "$secret_name" in
    postgres-password | redis-password | object-storage-password | postgres-app-password | postgres-migration-password | postgres-backup-password | better-auth-secret | backup-encryption-key) ;;
    *)
      secret_error "Unsupported Docker secret name."
      return 1
      ;;
  esac

  secret_path="$secrets_dir/$secret_name"

  if [ -L "$secret_path" ]; then
    secret_error "Secret secrets/$secret_name must not be a symbolic link."
    return 1
  fi

  if [ ! -e "$secret_path" ]; then
    secret_error "Missing required secret file: secrets/$secret_name"
    return 1
  fi

  if [ ! -f "$secret_path" ]; then
    secret_error "Secret secrets/$secret_name must be a regular file."
    return 1
  fi

  canonical_secret_path="$(realpath -- "$secret_path")" || {
    secret_error "Secret secrets/$secret_name cannot be resolved safely."
    return 1
  }

  if [ "$canonical_secret_path" != "$canonical_secrets_dir/$secret_name" ]; then
    secret_error "Secret secrets/$secret_name resolves outside the secrets directory."
    return 1
  fi

  if [ ! -s "$secret_path" ]; then
    secret_error "Secret secrets/$secret_name must not be empty."
    return 1
  fi
}

validate_secret_mode() {
  secret_name="$1"
  validate_secret_identity "$secret_name" || return 1

  secret_mode="$(stat -c '%a' -- "$secret_path")" || {
    secret_error "Secret secrets/$secret_name permissions cannot be inspected."
    return 1
  }

  if [ "$secret_mode" != "600" ]; then
    secret_error "Secret secrets/$secret_name must have permissions 600."
    return 1
  fi
}

validate_all_docker_secrets() {
  prepare_secrets_directory || return 1

  for required_secret_name in \
    postgres-password \
    redis-password \
    object-storage-password \
    postgres-app-password \
    postgres-migration-password \
    postgres-backup-password \
    better-auth-secret \
    backup-encryption-key
  do
    validate_secret_mode "$required_secret_name" || return 1
  done
}

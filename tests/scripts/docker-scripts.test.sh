#!/bin/sh

set -eu

project_dir="$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)"
temporary_parent="$project_dir/.tmp-tests"
test_root=""
test_count=0

fail() {
  echo "Docker script test failed: $1" >&2
  exit 1
}

pass() {
  test_count=$((test_count + 1))
  echo "ok $test_count - $1"
}

cleanup() {
  case "$test_root" in
    "$temporary_parent"/docker-scripts.*)
      if [ -d "$test_root" ]; then
        rm -rf -- "$test_root"
      fi
      ;;
  esac
}

trap cleanup EXIT HUP INT TERM

mkdir -p -- "$temporary_parent"
test_root="$(mktemp -d "$temporary_parent/docker-scripts.XXXXXX")"

new_secret_fixture() {
  fixture_path="$(mktemp -d "$test_root/secret-fixture.XXXXXX")"
  mkdir -p "$fixture_path/scripts/lib" "$fixture_path/secrets"
  cp "$project_dir/scripts/init-docker-secrets.sh" "$fixture_path/scripts/init-docker-secrets.sh"
  cp "$project_dir/scripts/lib/docker-secrets.sh" "$fixture_path/scripts/lib/docker-secrets.sh"
  chmod 755 "$fixture_path/scripts/init-docker-secrets.sh"
}

run_secret_fixture() {
  fixture_path="$1"
  output_file="$fixture_path/stdout"
  error_file="$fixture_path/stderr"

  "$fixture_path/scripts/init-docker-secrets.sh" >"$output_file" 2>"$error_file"
}

assert_no_secret_output() {
  fixture_path="$1"

  for secret_name in postgres-password redis-password object-storage-password; do
    if [ -f "$fixture_path/secrets/$secret_name" ] &&
      grep \
        -F \
        -q \
        -f "$fixture_path/secrets/$secret_name" \
        "$fixture_path/stdout" \
        "$fixture_path/stderr"; then
      fail "a generated secret appeared in script output"
    fi
  done
}

new_secret_fixture
run_secret_fixture "$fixture_path"

for secret_name in postgres-password redis-password object-storage-password; do
  secret_path="$fixture_path/secrets/$secret_name"
  [ -f "$secret_path" ] || fail "normal creation did not produce $secret_name"
  [ ! -L "$secret_path" ] || fail "normal creation produced a symbolic link"
  [ -s "$secret_path" ] || fail "normal creation produced an empty file"
  [ "$(stat -c '%a' "$secret_path")" = "600" ] || fail "normal creation used unsafe permissions"
  grep -Eq '^[0-9a-f]{64}$' "$secret_path" || fail "normal creation did not use safe hexadecimal data"
done
assert_no_secret_output "$fixture_path"
pass "creates three non-empty hexadecimal secrets with mode 600"

before_hashes="$(
  for secret_name in postgres-password redis-password object-storage-password; do
    sha256sum "$fixture_path/secrets/$secret_name"
  done
)"
run_secret_fixture "$fixture_path"
after_hashes="$(
  for secret_name in postgres-password redis-password object-storage-password; do
    sha256sum "$fixture_path/secrets/$secret_name"
  done
)"
[ "$before_hashes" = "$after_hashes" ] || fail "a second run changed an existing secret"
assert_no_secret_output "$fixture_path"
pass "is idempotent and does not reveal existing contents"

new_secret_fixture
: >"$fixture_path/secrets/postgres-password"
if run_secret_fixture "$fixture_path"; then
  fail "an empty secret was accepted"
fi
pass "rejects an empty file"

new_secret_fixture
mkdir "$fixture_path/secrets/postgres-password"
if run_secret_fixture "$fixture_path"; then
  fail "a directory was accepted as a secret"
fi
pass "rejects a directory"

new_secret_fixture
printf '%s\n' "unchanged-target-marker" >"$fixture_path/link-target"
chmod 644 "$fixture_path/link-target"
target_hash_before="$(sha256sum "$fixture_path/link-target")"
ln -s ../link-target "$fixture_path/secrets/postgres-password"
if run_secret_fixture "$fixture_path"; then
  fail "a symbolic link was accepted as a secret"
fi
target_hash_after="$(sha256sum "$fixture_path/link-target")"
[ "$target_hash_before" = "$target_hash_after" ] || fail "a symbolic-link target was modified"
[ "$(stat -c '%a' "$fixture_path/link-target")" = "644" ] ||
  fail "a symbolic-link target had its permissions changed"
pass "rejects a symbolic link without touching its target"

new_secret_fixture
mkfifo "$fixture_path/secrets/postgres-password"
if run_secret_fixture "$fixture_path"; then
  fail "a FIFO was accepted as a secret"
fi
pass "rejects a special file"

new_secret_fixture
mkdir "$fixture_path/fake-bin"
cat >"$fixture_path/fake-bin/openssl" <<'EOF'
#!/bin/sh
exit 1
EOF
chmod 755 "$fixture_path/fake-bin/openssl"
if PATH="$fixture_path/fake-bin:$PATH" run_secret_fixture "$fixture_path"; then
  fail "an OpenSSL failure was ignored"
fi
if find "$fixture_path/secrets" -name '.*.tmp.*' -print | grep -q .; then
  fail "a failed generation left a temporary file"
fi
pass "cleans temporary files after a generation failure"

new_wrapper_fixture() {
  wrapper_path="$(mktemp -d "$test_root/wrapper-fixture.XXXXXX")"
  mkdir -p "$wrapper_path/scripts/lib" "$wrapper_path/secrets" "$wrapper_path/fake-bin"
  cp "$project_dir/scripts/docker-compose.sh" "$wrapper_path/scripts/docker-compose.sh"
  cp "$project_dir/scripts/lib/docker-secrets.sh" "$wrapper_path/scripts/lib/docker-secrets.sh"
  chmod 755 "$wrapper_path/scripts/docker-compose.sh"

  printf '%s\n' "name: promptube_admin" >"$wrapper_path/compose.yaml"
  {
    echo "ADMIN_HTTP_PORT=8080"
    echo "APP_ENV=local"
    echo "APP_VERSION=0.1.0"
    echo "NEXT_PUBLIC_APP_NAME=Promptube Admin"
    echo "POSTGRES_DB=promptube_admin"
    echo "POSTGRES_USER=promptube_admin"
    echo "MINIO_ROOT_USER=promptube_admin_storage"
  } >"$wrapper_path/.env.docker"

  for secret_name in postgres-password redis-password object-storage-password; do
    printf '%064d\n' 0 >"$wrapper_path/secrets/$secret_name"
    chmod 600 "$wrapper_path/secrets/$secret_name"
  done

  cat >"$wrapper_path/fake-bin/docker" <<'EOF'
#!/bin/sh
printf '%s\n' "$*" >>"$FAKE_DOCKER_LOG"
exit 0
EOF
  chmod 755 "$wrapper_path/fake-bin/docker"
  fake_docker_log="$wrapper_path/docker.log"
  : >"$fake_docker_log"
}

run_wrapper() {
  PATH="$wrapper_path/fake-bin:$PATH" \
    FAKE_DOCKER_LOG="$fake_docker_log" \
    "$wrapper_path/scripts/docker-compose.sh" "$@"
}

new_wrapper_fixture
rm "$wrapper_path/secrets/redis-password"
if run_wrapper up >/dev/null 2>&1; then
  fail "up accepted a missing secret"
fi
pass "wrapper up rejects a missing secret"

new_wrapper_fixture
rm "$wrapper_path/secrets/redis-password"
printf '%s\n' "unchanged-wrapper-target" >"$wrapper_path/target"
ln -s ../target "$wrapper_path/secrets/redis-password"
if run_wrapper up >/dev/null 2>&1; then
  fail "up accepted a symbolic-link secret"
fi
pass "wrapper up rejects a symbolic-link secret"

new_wrapper_fixture
chmod 640 "$wrapper_path/secrets/redis-password"
if run_wrapper up >/dev/null 2>&1; then
  fail "up accepted a secret without mode 600"
fi
pass "wrapper up rejects unsafe secret permissions"

new_wrapper_fixture
rm "$wrapper_path"/secrets/*-password
run_wrapper build >/dev/null 2>&1 || fail "build unnecessarily required secrets"
pass "wrapper build does not require secrets"

new_wrapper_fixture
rm "$wrapper_path"/secrets/*-password
run_wrapper ps >/dev/null 2>&1 || fail "ps unnecessarily required secrets"
run_wrapper logs >/dev/null 2>&1 || fail "logs unnecessarily required secrets"
pass "wrapper inspection commands work without secrets"

new_wrapper_fixture
rm "$wrapper_path"/secrets/*-password
rm "$wrapper_path/.env.docker"
run_wrapper down >/dev/null 2>&1 || fail "down required configuration or secrets"
run_wrapper down >/dev/null 2>&1 || fail "a second down failed for an already stopped stack"
grep -Eq '^compose --project-name promptube_admin --file .*/compose.yaml down$' "$fake_docker_log" ||
  fail "down did not retain the exact Compose project name"
if grep -Eq '(^|[[:space:]])(-v|--volumes)([[:space:]]|$)' "$fake_docker_log"; then
  fail "the wrapper added a volume-removal flag"
fi
pass "wrapper down is idempotent, secret-independent, and volume-preserving"

new_wrapper_fixture
if run_wrapper down -v >/dev/null 2>&1; then
  fail "down accepted an explicit volume-removal flag"
fi
if grep -Eq '(^|[[:space:]])down([[:space:]].*)?(-v|--volumes)' "$fake_docker_log"; then
  fail "a destructive down reached Docker"
fi
pass "wrapper blocks destructive down flags"

echo "Docker script tests passed: $test_count"

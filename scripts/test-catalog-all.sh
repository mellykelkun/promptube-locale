#!/bin/sh

set -eu

PROMPTUBE_TEST_SPEC=tests/e2e/admin-catalog-flow.spec.ts ./scripts/test-auth-all.sh "${1:-all}"

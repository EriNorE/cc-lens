#!/usr/bin/env bash
# Governance fitness functions — architecture health checks
# Run standalone or via pre-commit hook / CI

set -euo pipefail

FAIL=0
WARN=0

check() {
  local label="$1" result="$2"
  if [ "$result" = "FAIL" ]; then
    echo "  FAIL  $label"
    FAIL=$((FAIL + 1))
  elif [ "$result" = "WARN" ]; then
    echo "  WARN  $label"
    WARN=$((WARN + 1))
  else
    echo "  PASS  $label"
  fi
}

echo "=== Governance Fitness Check ==="
echo ""

# 1. No file > 800 lines in lib/ and app/
echo "--- File size (max 800 lines) ---"
LARGE_FILES=$(find lib app -name '*.ts' -o -name '*.tsx' | while read -r f; do
  lines=$(wc -l < "$f")
  if [ "$lines" -gt 800 ]; then echo "$f:$lines"; fi
done)
if [ -n "$LARGE_FILES" ]; then
  check "Files > 800 lines: $LARGE_FILES" "FAIL"
else
  check "All files under 800 lines" "PASS"
fi

# 2. No hardcoded secrets
echo ""
echo "--- Hardcoded secrets ---"
SECRET_HITS=$(grep -rn \
  -e 'API_KEY\s*=' \
  -e 'sk-[a-zA-Z0-9]' \
  -e 'sk-ant-' \
  -e 'ghp_[a-zA-Z0-9]' \
  -e 'AKIA[A-Z0-9]' \
  -e 'password\s*=\s*"[^"]' \
  -e 'token\s*=\s*"[^"]' \
  --include='*.ts' --include='*.tsx' --include='*.js' \
  lib/ app/ bin/ 2>/dev/null || true)
if [ -n "$SECRET_HITS" ]; then
  check "Hardcoded secrets found: $SECRET_HITS" "FAIL"
else
  check "No hardcoded secrets" "PASS"
fi

# 3. No console.log in lib/ or app/api/
echo ""
echo "--- console.log in production code ---"
LOG_HITS=$(grep -rn 'console\.log' --include='*.ts' --include='*.tsx' \
  lib/ app/api/ 2>/dev/null || true)
if [ -n "$LOG_HITS" ]; then
  check "console.log in production: $LOG_HITS" "WARN"
else
  check "No console.log in lib/ or app/api/" "PASS"
fi

# 4. No console.log in app/ pages (excluding api/)
echo ""
echo "--- Summary ---"
echo "  Failures: $FAIL"
echo "  Warnings: $WARN"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "FAILED — fix $FAIL issue(s) before committing"
  exit 1
fi

echo ""
echo "PASSED"
exit 0

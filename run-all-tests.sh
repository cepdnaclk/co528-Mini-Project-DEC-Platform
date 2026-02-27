#!/bin/bash
# DECP Backend Full E2E Test Suite
# Runs all test scripts and reports a final summary.

PASS_SCRIPTS=0
FAIL_SCRIPTS=0

run_test() {
  local script="$1"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  if bash "$script"; then
    PASS_SCRIPTS=$((PASS_SCRIPTS+1))
  else
    FAIL_SCRIPTS=$((FAIL_SCRIPTS+1))
    echo "  ⚠️  $script had failures (see above)"
  fi
}

echo "╔══════════════════════════════════════════════╗"
echo "║     DECP Backend Full E2E Test Suite        ║"
echo "╚══════════════════════════════════════════════╝"
echo "Timestamp: $(date)"
echo ""
echo "Step 1: Waiting for services to be ready..."
sleep 5
echo "Step 2: Initializing Pub/Sub emulator topics & subscriptions..."
node scripts/setup-pubsub.js 2>&1 | tail -3
echo ""

run_test ./test-feed.sh
run_test ./test-jobs.sh
run_test ./test-events.sh
run_test ./test-user.sh
run_test ./test-research.sh
run_test ./test-messaging.sh
run_test ./test-analytics.sh
run_test ./test-notifications.sh

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║                FINAL SUMMARY                ║"
echo "╠══════════════════════════════════════════════╣"
echo "║  Test files passed: $PASS_SCRIPTS                         ║"
echo "║  Test files failed: $FAIL_SCRIPTS                         ║"
echo "╚══════════════════════════════════════════════╝"

if [ $FAIL_SCRIPTS -eq 0 ]; then
  echo ""
  echo "🎉 All backend services are working correctly!"
  exit 0
else
  echo ""
  echo "⚠️  Some tests failed. Check output above."
  exit 1
fi

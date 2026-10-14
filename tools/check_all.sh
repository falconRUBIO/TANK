#!/usr/bin/env bash
# Everything that matters, in one go: the rule and server tests, then the main in-game drills (each prints its own ✓/✗ lines).
# Usage: tools/check_all.sh            (FULL=1 also runs the slow two-phone developer-tools drill)
cd "$(dirname "$0")/.."
if ! curl -s -o /dev/null localhost:8123/; then (cd web && nohup python3 -m http.server 8123 >/dev/null 2>&1 &); sleep 2; fi      # the drills play the solo game from here
pass=(); fail=()
run() { local name="$1"; shift; echo "── $name"; local out; out="$("$@" 2>&1)"; echo "$out" | grep -E "✗|passed$|failed$|Error:" | head -8;
  if echo "$out" | grep -qE "✗|failed$|Error:"; then fail+=("$name"); else pass+=("$name"); fi; }
run "rule and server tests" npm test --silent
for t in care_check care_sync seahorse_family seahorse_check baby_personality playthrough sell_check octopus_acts profile_check; do run "$t" timeout 1500 node --disable-warning=ExperimentalWarning "tools/$t.mjs"; done
[ -n "$FULL" ] && run dev_lifecycle timeout 5000 node --disable-warning=ExperimentalWarning tools/dev_lifecycle.mjs
echo; echo "passed: ${#pass[@]}  ·  failed: ${#fail[@]} ${fail[*]}"
[ ${#fail[@]} -eq 0 ]

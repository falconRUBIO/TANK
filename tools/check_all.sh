#!/usr/bin/env bash
# Two levels. Quick (about 5 minutes, before every push and on every push in CI): the rule and server tests, real saved tanks on two phones,
# the octopus den and rest, the seahorses. Full (FULL=1, an hour or two, nightly): everything else as well, the long octopus drills included.
# Usage: tools/check_all.sh      FULL=1 tools/check_all.sh      (each drill prints its own ✓/✗ lines)
cd "$(dirname "$0")/.."
if ! curl -s -o /dev/null localhost:8123/; then (cd web && nohup python3 -m http.server 8123 >/dev/null 2>&1 &); sleep 2; fi      # the drills play the solo game from here
pass=(); fail=()
run() { local name="$1"; shift; echo "── $name"; local out; out="$("$@" 2>&1)"; echo "$out" | grep -E "✗|passed$|failed$|Error:" | head -8;
  if echo "$out" | grep -qE "✗|failed$|Error" || ! echo "$out" | grep -qE "passed$"; then fail+=("$name"); echo "$out" | grep -E "Error" | head -2; else pass+=("$name"); fi; }      # passed only if it says so
run "rule and server tests" npm test --silent
run "levels 1-8 from a new tank" node tools/sim/milestones.mjs
for t in real_tank motion_check adopt_check keepsake_check twirl_check fund_check return_check turtle_check chart_check gift_check journal_check ux_check octopus_den octopus_rest seahorse_check adventure_check life_check life_check2 biscuit_check living_check living_check2 glass_check hatch_check birth_check photo_check field_check mystery_check breed_check dilemma_check goal_check family_check reveal_check octo_baby_check keep_reach habitat_check crab_clip crab_play loading_check; do run "$t" timeout 900 node --disable-warning=ExperimentalWarning "tools/$t.mjs"; done
if [ -n "$FULL" ]; then
  for t in care_check care_sync seahorse_family baby_personality playthrough sell_check octopus_acts octopus_character profile_check bonds_check toys_check egg_check away_check shared_check octopus_pot crab_check crab_brain toy_kinds cause_effect attach_check; do run "$t" timeout 7000 node --disable-warning=ExperimentalWarning "tools/$t.mjs"; done
  run octopus_aware timeout 7000 node --disable-warning=ExperimentalWarning tools/octopus_aware.mjs 1      # (one visit per nature here: three each takes over an hour)
  run dev_lifecycle timeout 5000 node --disable-warning=ExperimentalWarning tools/dev_lifecycle.mjs
fi
echo; echo "passed: ${#pass[@]}  ·  failed: ${#fail[@]} ${fail[*]}"
[ ${#fail[@]} -eq 0 ]

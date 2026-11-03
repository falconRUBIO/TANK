// Every kind of sea life moves smoothly: a busy real tank on its own clock, every frame of every drawn animal checked (no jumps, no jerks or
// snapping turns, no swimming tail first, nobody in the sand). It is sealife_motion_audit.mjs in check mode.   (needs the solo game on 8123)
process.env.CHECK = '1'; process.env.QUIET = '1'; process.argv[2] ??= '3'; process.argv[3] ??= '7'; await import('./sealife_motion_audit.mjs');

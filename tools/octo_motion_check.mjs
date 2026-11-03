// The octopus moves smoothly: four minutes of a real tank on its own clock, every frame of the drawn octopus checked (no jumps, no shivering
// against rocks, no walking in place). It is octo_motion_audit.mjs in check mode.   node tools/octo_motion_check.mjs   (needs the solo game on 8123)
process.env.CHECK = '1'; process.argv[2] ??= '4'; process.argv[3] ??= '7'; await import('./octo_motion_audit.mjs');

// Save compatibility: tanks saved by the pre-change rules (tools/baseline) load and play under the current rules, with no back-pay and nothing lost.
//   node tools/compat.mjs
import * as Old from './baseline/rules.js';
import * as New from '../web/src/game/rules.js';
const D=864e5; let ok=0, bad=0; const chk=(n,c)=>{ if(c){ok++}else{bad++;console.log('FAIL',n)} };
for (const days of [0, 2, 10, 20, 45]) for (const seed of [1,2,3]) {
  const t = Old.newWorld(0, seed); Old.norm(t,0); t.flags.tut=5; t.shells=400;
  for (let d=0; d<=days; d++){ const now=d*D+8*36e5; if(d==1) for(const s of ['goldfish','neon','guppy','angelfish']) Old.applyAction(t,{t:'buyFish',species:s,name:'x',seed:d},{now}); Old.applyAction(t,{t:'feed'},{now}); Old.applyAction(t,{t:'water'},{now}); Old.advance(t,now+1000);}
  const saved = JSON.parse(JSON.stringify(t));                       // what an old server/phone has stored
  const shells0 = saved.shells, fish0 = saved.fish.length, level0 = saved.level, wish0 = saved.wishIdx;
  const now = days*D + 9*36e5; const r = New.applyAction(saved, { t:'feed' }, { now, name:'Alex', uid:'u1' });
  chk('loads '+days, r.ok); chk('fish kept', saved.fish.length===fish0); chk('level never drops', saved.level>=level0); chk('wish index kept', saved.wishIdx>=wish0);
  const gained = saved.shells - shells0; chk(`no back-pay for milestones (gain ${gained}) days=${days}`, !r.events.some(e=>e.milestone));
  chk('legacy flags set', saved.flags.msV===1); chk('ages recorded', saved.fish.every(f=> (now-f.born)/D<14 || f.found.includes('age14')));
  chk('json round trip', JSON.stringify(JSON.parse(JSON.stringify(saved)))===JSON.stringify(saved));
  if (saved.daily) chk('daily has tier', ['easy','normal','special'].includes(saved.daily.tier) || saved.daily.reward===undefined);
}
// an old in-progress daily wish (no tier/reward) still completes and pays the old 3
const o = Old.newWorld(0); Old.norm(o,0); o.flags.tut=5; o.simTs=7*D; o.daily={day:7,kind:'care',text:'x',need:1,have:0,ids:[],done:false}; o.hunger=0.8;
const e = New.applyAction(o,{t:'feed'},{now:7*D+1000,name:'A',uid:'u1'}).events; chk('old daily completes', o.daily.done); chk('old daily pays 3', e.find(x=>x.dailyDone).toast.includes('+3'));
console.log(ok,'checks passed', bad,'failed');

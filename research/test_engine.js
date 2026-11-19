// index.html 안의 계산 엔진을 꺼내 검증한다.  실행: node research/test_engine.js
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const code = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
new Function('module', code)(mod);
const LOA = mod.exports;

let fails = 0;
function near(name, got, want, tol) {
  const ok = Math.abs(got - want) <= (tol || 1e-9);
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}: ${got}${ok ? '' : `  (기대 ${want})`}`);
}
function truthy(name, cond, info) {
  if (!cond) fails++;
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${name}${info ? ': ' + info : ''}`);
}

const skill = (o) => Object.assign({ name: 's', type: 'normal', share: 0, r: 0, cr: 0, cd: 0, dir: 'none', p: 0, charge: false, hold: false, mana: 0 }, o);
const baseInp = (o) => Object.assign({
  baseCrit: 0, baseSwift: 0, extraAS: 0, extraMS: 0, otherCR: 0, otherCD: 0, otherAdd: 0, otherAtk: 0,
  karma: 0, otherEvo: 0, syn10: false, syn20: false,
  bracelet: { grade: 'ancient', slots: [] }, stone: [], skills: []
}, o);
const build = (o) => Object.assign({
  engr: [], t1: { crit: 0, spec: 0, swift: 0 }, pet: 'spec',
  t2: { endless: 0, forbidden: 0, keen: 0, limit: 0, optim: 0 },
  t3: { infinite: 0, allout: 0, strike: 0, tank: 0, timing: 0 },
  t4: { crit: false, master: false, crush: false }, t5: { id: 'none', lv: 0 }
}, o);

// 1. 기본 공식
near('다중 치명 120%/250%', LOA.critMult(1.2, 2.5, 0), 2.8);
near('치명 80%/200%', LOA.critMult(0.8, 2.0, 0), 1.8);
near('다중 치명 230%/200%', LOA.critMult(2.3, 2.0, 0), 3.3);
near('회심 포함 100%/200%', LOA.critMult(1.0, 2.0, 0.12), 2.24);
near('회심 경계 연속성', LOA.critMult(1.0, 2.5, 0.12), LOA.critMult(1.0 + 1e-12, 2.5, 0.12), 1e-9);
near('음속 돌파 40/40', LOA.sonicEvo(40, 40, 2), 8);
near('음속 돌파 53.34/53.34', LOA.sonicEvo(53.34, 53.34, 2), 24, 1e-9);
near('음속 돌파 45/45', LOA.sonicEvo(45, 45, 2), 8 + 8 + 3);
near('음속 돌파 45/39 (한쪽 미달)', LOA.sonicEvo(45, 39, 2), 0.1 * 79);
near('음속 돌파 Lv1 40/40', LOA.sonicEvo(40, 40, 1), 4);
near('마나 용광로 480', LOA.furnaceEvo(480, 2), 24);
near('마나 용광로 200', LOA.furnaceEvo(200, 2), 10);
near('쿨감 r=1, 20%', LOA.useGain(1, 0.8), 1.25);
near('쿨감 r=0.5, 20%', LOA.useGain(0.5, 0.8), 1 / 0.9);
near('쿨감 r=0', LOA.useGain(0, 0.8), 1);

// 2. 지난 조사의 뭉가 vs 입타 수치 재현 (다른 진피 40%, 치피 250%)
{
  const mk = cr => baseInp({ otherCR: cr, otherCD: 50, otherEvo: 28, skills: [skill({ share: 100 })] });
  const ratio = cr => {
    const inp = mk(cr);
    const a = LOA.evalBuild(build({ t5: { id: 'stand', lv: 2 } }), inp);
    const b = LOA.evalBuild(build({ t5: { id: 'thorn', lv: 2 } }), inp);
    return LOA.compare(inp, b, a).ratio;
  };
  near('뭉가/입타 치적 80%', ratio(80), 3.498 / 3.542, 2e-4);
  near('뭉가/입타 치적 100%', ratio(100), 1.0221, 1e-4);
  near('뭉가/입타 치적 120%', ratio(120), 1.0492, 1e-4);
  near('뭉가/입타 치적 140%', ratio(140), 1.0711, 1e-4);
}

// 2-1. 독립 구현 교차 검증: 로아지지 뭉가 계산기 예시 (치적 95%, 치피 200%, 다른 진피 30%, 입타 21%)
//      페이지 표기값: 비뭉가 2.945배 → 뭉가 3.06배(+3.92%), 뭉가가 유리해지는 치적 83.6%, 치적 105%면 노드 진피 54%, 130%면 89%
{
  const mk = cr => baseInp({ otherCR: cr, otherEvo: 18, skills: [skill({ share: 100 })] });   // 서포터 12 + 18 = 30
  const pair = cr => {
    const inp = mk(cr);
    return [LOA.evalBuild(build({ t5: { id: 'stand', lv: 2 } }), inp), LOA.evalBuild(build({ t5: { id: 'thorn', lv: 2 } }), inp), inp];
  };
  const [a, b, inp] = pair(95);
  near('로아지지 예시: 비뭉가 배율 2.945', a.rows[0].M, 2.945, 5e-4);
  near('로아지지 예시: 뭉가 배율 3.06', b.rows[0].M, 3.06, 5e-4);
  near('로아지지 예시: 뭉가 우위 +3.92%', LOA.compare(inp, b, a).ratio, 1.0392, 1e-4);
  let lo = 80, hi = 100;
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; const [x, y, q] = pair(m); if (LOA.compare(q, y, x).ratio < 1) lo = m; else hi = m; }
  near('로아지지 예시: 손익분기 치적 83.6%', lo, 83.6, 0.05);
  near('로아지지 FAQ: 치적 105% → 뭉가 노드 진피 54%', pair(105)[1].rows[0].evo - 30, 54, 1e-9);
  near('로아지지 FAQ: 치적 130% → 뭉가 노드 진피 89%', pair(130)[1].rows[0].evo - 30, 89, 1e-9);
}

// 2-2. 치명타 적중 시 피해: 회심 / 팔찌 / 아크 그리드는 서로 곱연산 (인벤 110258 댓글의 예시: 회심 12% × 현란 1.1% = 13.233%)
{
  near('회심 12% × 아크 그리드 1.1%', LOA.critHit(true, 0, 1.1), 0.13232, 1e-9);
  near('회심 × 팔찌 1.5%', LOA.critHit(true, 1, 0), 1.12 * 1.015 - 1);
  near('팔찌 두 줄은 합산 3% 후 회심과 곱', LOA.critHit(true, 2, 0), 1.12 * 1.03 - 1);
  near('회심 없음, 팔찌 1줄', LOA.critHit(false, 1, 0), 0.015);
}

// 2-3. 각성기: 진화형 피해·신속 쿨감은 적용, 최적화 훈련/타이밍 지배·타격/기습/결투의 대가는 제외
{
  const sk2 = [skill({ share: 50 }), skill({ share: 50, type: 'awakening', r: 100 })];
  const inp = baseInp({ skills: sk2 });
  const b = build({ t1: { crit: 0, spec: 0, swift: 20 }, t4: { crit: false, master: false, crush: true },
                    t3: { infinite: 0, allout: 0, strike: 0, tank: 0, timing: 2 } });
  const ev = LOA.evalBuild(b, inp);
  near('각성기 진화형 피해 = 일반 스킬과 동일', ev.rows[1].evo, ev.rows[0].evo);
  near('일반 스킬 진피: 서포터 12 + 분쇄 20 + 타이밍 16', ev.rows[0].evo, 48);
  near('각성기 쿨 배율: 신속만', ev.rows[1].cdf, 1 - 1000 / 46.5731 / 100);
  near('일반 스킬 쿨 배율: 신속 × 타이밍 10%', ev.rows[0].cdf, (1 - 1000 / 46.5731 / 100) * 0.9);
  const e0 = LOA.evalBuild(build({}), inp);
  const e1 = LOA.evalBuild(build({ engr: ['hit', 'ambush', 'duel'] }), inp);
  near('타격+기습+결투: 각성기는 변화 없음', e1.rows[1].M / e0.rows[1].M, 1);
  near('타격+기습+결투: 비방향성 일반 스킬', e1.rows[0].M / e0.rows[0].M, 1.17 * 1.076 * 1.076);
  const back = baseInp({ skills: [skill({ share: 100, dir: 'back', p: 100 })] });
  const k0 = LOA.evalBuild(build({}), back), k1 = LOA.evalBuild(build({ engr: ['ambush', 'hit'] }), back);
  near('기습의 대가: 백어택 성공 시 22.6%, 타격의 대가는 백어택 스킬에 미적용', k1.rows[0].M / k0.rows[0].M, 1.226);
}

// 2-4. 전투 분석기 대조용 수치
{
  const mc = LOA.evalBuild(build({}), baseInp({ otherCR: 130, skills: [skill({ share: 100 })] })).rows[0];
  near('치명타 적중률 100', mc.hit, 100);
  near('다중 치명타 적중률 30', mc.multi, 30);
  const th = LOA.evalBuild(build({ t5: { id: 'thorn', lv: 2 } }), baseInp({ otherCR: 130, skills: [skill({ share: 100 })] })).rows[0];
  near('뭉가: 치명타 적중률 80으로 제한', th.hit, 80);
  near('뭉가: 다중 치명타 없음', th.multi, 0);
}

// 3. 일격: 방향성 스킬이면 성공 여부와 무관하게 치피 적용, 백어택 치적은 성공 시에만
{
  const inp = baseInp({ skills: [skill({ share: 100, dir: 'back', p: 0 }), skill({ share: 0, dir: 'none' })] });
  const ev = LOA.evalBuild(build({ t3: { infinite: 0, allout: 0, strike: 2, tank: 0, timing: 0 } }), inp);
  near('일격 방향성 스킬 치피 (성공률 0%)', ev.rows[0].cd, 232);
  near('일격 비방향성 스킬 치피', ev.rows[1].cd, 200);
  near('백어택 실패 시 치적', ev.rows[0].cr, 20);
  const inp2 = baseInp({ skills: [skill({ share: 100, dir: 'back', p: 100 })] });
  near('백어택 성공 시 치적 +10', LOA.evalBuild(build({}), inp2).rows[0].cr, 10);
  const inp3 = baseInp({ skills: [skill({ share: 100, dir: 'head', p: 100 })] });
  near('헤드어택은 치적 보정 없음', LOA.evalBuild(build({}), inp3).rows[0].cr, 0);
}

// 4. 쿨감 묶음: 같은 묶음은 합, 다른 묶음은 곱, 각성기는 최적화/타이밍 제외
{
  const inp = baseInp({ skills: [skill({ share: 50, mana: 100 }), skill({ share: 50, type: 'awakening' })] });
  const ev = LOA.evalBuild(build({
    t2: { endless: 2, forbidden: 0, keen: 0, limit: 0, optim: 1 },
    t3: { infinite: 2, allout: 0, strike: 0, tank: 0, timing: 0 }
  }), inp);
  near('마나 스킬 쿨 배율 (1-0.28)(1-0.04)', ev.rows[0].cdf, 0.72 * 0.96);
  near('각성기 쿨 배율 (노드 제외)', ev.rows[1].cdf, 1);
}

// 5. 스톤: 예둔 Lv4 = 치피 52+15, 같은 각인 중복은 첫 칸만
{
  const inp = baseInp({ stone: [{ id: 'blunt', lv: 4 }, { id: 'blunt', lv: 4 }], skills: [skill({ share: 100 })] });
  near('예둔 + 스톤 Lv4 치피', LOA.evalBuild(build({ engr: ['blunt'] }), inp).rows[0].cd, 267);
  truthy('스톤 각인은 한 번만 강제', LOA.forcedEngr(inp).length === 1);
}

// 6. 전수 탐색 검증: 고속 경로 점수 = 정석 계산, 그리고 무작위 세팅이 최적을 넘지 못함
function rnd(seed) { let s = seed; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function randomInput(R) {
  const types = ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'hyper', 'identity', 'awakening'];
  const skills = types.map((type, i) => {
    const dir = type === 'awakening' ? 'none' : ['none', 'back', 'head'][Math.floor(R() * 3)];
    return skill({ name: 's' + i, type, share: R() < 0.15 ? 0 : Math.round(R() * 20), r: Math.round(R() * 100),
      cr: R() < 0.4 ? Math.round(R() * 60) : 0, cd: R() < 0.3 ? Math.round(R() * 80) : 0, dir, p: Math.round(R() * 100),
      charge: type !== 'awakening' && R() < 0.2, hold: type !== 'awakening' && R() < 0.2,
      mana: type !== 'awakening' && R() < 0.6 ? Math.round(R() * 600) : 0 });
  });
  const ids = LOA.ENGR_ORDER, bids = Object.keys(LOA.BRACELET);
  const stone = R() < 0.7 ? [{ id: ids[Math.floor(R() * ids.length)], lv: 1 + Math.floor(R() * 4) },
                             { id: ids[Math.floor(R() * ids.length)], lv: Math.floor(R() * 5) }] : [];
  return baseInp({
    baseCrit: Math.round(R() * 400), baseSwift: Math.round(R() * 400), extraAS: Math.round(R() * 30), extraMS: Math.round(R() * 30),
    otherCR: Math.round(R() * 5), otherH: Math.round(R() * 20) / 10, otherCD: Math.round(R() * 10), otherAdd: 30, otherAtk: Math.round(R() * 5),
    karma: Math.floor(R() * 7), otherEvo: 0, syn10: R() < 0.5, syn20: R() < 0.2,
    bracelet: { grade: R() < 0.5 ? 'ancient' : 'relic', slots: [0, 1, 2].map(() => ({ id: bids[Math.floor(R() * bids.length)], tier: Math.floor(R() * 3) })) },
    stone, skills
  });
}
const curBuild = build({ engr: ['grudge', 'blunt', 'adrenaline', 'raid', 'doll'], t1: { crit: 30, spec: 0, swift: 10 }, pet: 'crit',
  t2: { endless: 0, forbidden: 0, keen: 0, limit: 3, optim: 0 }, t3: { infinite: 0, allout: 2, strike: 0, tank: 0, timing: 0 },
  t4: { crit: true, master: false, crush: true }, t5: { id: 'stand', lv: 2 } });

for (let seed = 1; seed <= 4; seed++) {
  const R = rnd(seed * 7919), inp = randomInput(R);
  const opts = { tenacity: R() < 0.5, barricade: R() < 0.5, mass: R() < 0.5, spec: Math.floor(R() * 11), pet: 'auto' };
  const t0 = Date.now();
  const res = LOA.runSync(inp, curBuild, opts);
  const ms = Date.now() - t0;
  let maxDiff = 0, bestRatio = 0;
  const forced = LOA.forcedEngr(inp);
  res.results.forEach(r => r.picks.forEach(p => {
    maxDiff = Math.max(maxDiff, Math.abs(p.fast - p.ratio));
    bestRatio = Math.max(bestRatio, p.ratio);
    truthy(`seed ${seed} ${r.t5}: 스톤 각인 포함`, forced.every(id => p.build.engr.includes(id)) && p.build.engr.length === 5 && new Set(p.build.engr).size === 5,
      p.build.engr.join(','));
  }));
  near(`seed ${seed}: 고속 경로 = 정석 계산 (조합 ${res.nSets}, ${ms}ms)`, maxDiff, 0, 1e-9);

  // 무작위로 고른 합법 세팅이 최적값을 넘지 않는지 확인
  const sets = LOA.engravingSets(inp, opts, inp.skills.filter(s => s.share > 0));
  const t2s = [], t3s = [];
  const k2 = Object.keys(LOA.T2), k3 = Object.keys(LOA.T3);
  let worst = 0;
  for (let n = 0; n < 4000; n++) {
    const t2 = {}, t3 = {}; k2.forEach(k => t2[k] = 0); k3.forEach(k => t3[k] = 0);
    for (let i = 0; i < 3; i++) { let k; do { k = k2[Math.floor(R() * k2.length)]; } while (t2[k] >= LOA.T2[k].max); t2[k]++; }
    for (let i = 0; i < 2; i++) { let k; do { k = k3[Math.floor(R() * k3.length)]; } while (t3[k] >= 2); t3[k]++; }
    const t4k = ['crit', 'master', 'crush'], drop = t4k[Math.floor(R() * 3)];
    const rem = 40 - opts.spec, lo = Math.max(0, rem - 30), hi = Math.min(30, rem);
    const c = lo + Math.floor(R() * (hi - lo + 1));
    const b = build({ engr: sets[Math.floor(R() * sets.length)], t1: { crit: c, swift: rem - c, spec: opts.spec },
      pet: R() < 0.5 ? 'crit' : 'swift', t2, t3, t4: { crit: drop !== 'crit', master: drop !== 'master', crush: drop !== 'crush' },
      t5: { id: ['thorn', 'sonic', 'stand', 'furnace'][Math.floor(R() * 4)], lv: 2 } });
    const ev = LOA.evalBuild(b, inp);
    if (b.engr.includes('mass') && !opts.mass && !forced.includes('mass') && ev.ctx.AS < 40 - 1e-9) continue;   // 질량 증가 자동 조건 미충족
    worst = Math.max(worst, LOA.compare(inp, ev, res.cur).ratio);
  }
  truthy(`seed ${seed}: 무작위 4000개 세팅 ≤ 최적`, worst <= bestRatio + 1e-9, `무작위 최고 ${worst.toFixed(5)} / 최적 ${bestRatio.toFixed(5)}`);
}

// 7. 현재 세팅 자체는 정확히 1.0
{
  const inp = randomInput(rnd(42));
  const ev = LOA.evalBuild(curBuild, inp);
  near('현재 세팅 대비 현재 세팅', LOA.compare(inp, ev, ev).ratio, 1);
}

console.log(fails ? `\n실패 ${fails}건` : '\n모든 검증 통과');
process.exit(fails ? 1 : 0);

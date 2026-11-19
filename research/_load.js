// 테스트 공용: index.html에서 엔진을 꺼내고, 입력·세팅 생성 도우미와 결과 집계기를 제공한다.
const fs = require('fs');
const path = require('path');
const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const engineCode = html.match(/<script id="engine">([\s\S]*?)<\/script>/)[1];
const uiCode = html.match(/<script id="ui">([\s\S]*?)<\/script>/)[1];
const mod = { exports: {} };
new Function('module', engineCode)(mod);
const LOA = mod.exports;

const skill = (o) => Object.assign({ name: 's', type: 'normal', share: 0, r: 0, cr: 0, cd: 0, dir: 'none', p: 0, charge: false, hold: false, mana: 0 }, o);
const baseInp = (o) => Object.assign({
  baseCrit: 0, baseSwift: 0, extraAS: 0, extraMS: 0, otherCR: 0, otherCD: 0, otherAdd: 0, otherAtk: 0, otherH: 0,
  karma: 0, otherEvo: 0, syn10: false, syn20: false,
  bracelet: { grade: 'ancient', slots: [] }, stone: [], skills: []
}, o);
const build = (o) => Object.assign({
  engr: [], t1: { crit: 0, spec: 0, swift: 0 }, pet: 'spec',
  t2: { endless: 0, forbidden: 0, keen: 0, limit: 0, optim: 0 },
  t3: { infinite: 0, allout: 0, strike: 0, tank: 0, timing: 0 },
  t4: { crit: false, master: false, crush: false }, t5: { id: 'none', lv: 0 }
}, o);

function rnd(seed) { let s = seed >>> 0; return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296; }
const TYPES = ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'hyper', 'identity', 'awakening'];
function randomInput(R, o) {
  o = o || {};
  const skills = TYPES.slice(0, o.nSkills || 11).map((type, i) => {
    const dir = type === 'awakening' ? 'none' : ['none', 'back', 'head'][Math.floor(R() * 3)];
    return skill({ name: 's' + i, type, share: R() < 0.15 ? 0 : 1 + Math.round(R() * 20), r: Math.round(R() * 100),
      cr: R() < 0.4 ? Math.round(R() * 60) : 0, cd: R() < 0.3 ? Math.round(R() * 80) : 0, dir, p: Math.round(R() * 100),
      charge: type !== 'awakening' && R() < 0.2, hold: type !== 'awakening' && R() < 0.2,
      mana: type !== 'awakening' && R() < 0.6 ? Math.round(R() * 600) : 0 });
  });
  const ids = LOA.ENGR_ORDER, bids = Object.keys(LOA.BRACELET);
  const stone = R() < 0.7 ? [{ id: ids[Math.floor(R() * ids.length)], lv: 1 + Math.floor(R() * 4) },
                             { id: ids[Math.floor(R() * ids.length)], lv: Math.floor(R() * 5) }] : [];
  return baseInp({
    baseCrit: Math.round(R() * 400), baseSwift: Math.round(R() * 400), extraAS: Math.round(R() * 30), extraMS: Math.round(R() * 30),
    otherCR: Math.round(R() * 5), otherCD: Math.round(R() * 10), otherAdd: Math.round(R() * 40), otherAtk: Math.round(R() * 5),
    otherH: Math.round(R() * 20) / 10, karma: Math.floor(R() * 7), otherEvo: Math.round(R() * 5), syn10: R() < 0.5, syn20: R() < 0.2,
    bracelet: { grade: R() < 0.5 ? 'ancient' : 'relic', slots: [0, 1, 2].map(() => ({ id: bids[Math.floor(R() * bids.length)], tier: Math.floor(R() * 3) })) },
    stone, skills
  });
}
// 티어 제한을 지키는 무작위 세팅. engr는 주어진 후보 목록에서 5개(중복 없이)
function randomBuild(R, pool, spec) {
  const k2 = Object.keys(LOA.T2), k3 = Object.keys(LOA.T3);
  const t2 = {}, t3 = {}; k2.forEach(k => t2[k] = 0); k3.forEach(k => t3[k] = 0);
  for (let i = 0; i < 3; i++) { let k; do { k = k2[Math.floor(R() * k2.length)]; } while (t2[k] >= LOA.T2[k].max); t2[k]++; }
  for (let i = 0; i < 2; i++) { let k; do { k = k3[Math.floor(R() * k3.length)]; } while (t3[k] >= 2); t3[k]++; }
  const drop = ['crit', 'master', 'crush'][Math.floor(R() * 3)];
  spec = spec || 0;
  const rem = 40 - spec, lo = Math.max(0, rem - 30), hi = Math.min(30, rem), c = lo + Math.floor(R() * (hi - lo + 1));
  const p = pool.slice(), engr = [];
  while (engr.length < 5 && p.length) engr.push(p.splice(Math.floor(R() * p.length), 1)[0]);
  const t5ids = ['thorn', 'sonic', 'stand', 'furnace', 'infight'];
  return build({ engr, t1: { crit: c, swift: rem - c, spec }, pet: ['crit', 'swift', 'spec'][Math.floor(R() * 3)], t2, t3,
    t4: { crit: drop !== 'crit', master: drop !== 'master', crush: drop !== 'crush' },
    t5: { id: t5ids[Math.floor(R() * t5ids.length)], lv: 1 + Math.floor(R() * 2) } });
}

// 결과 집계: 실패만 자세히 출력하고 구역별 통과 수를 요약한다
function makeReporter(title) {
  let pass = 0, fail = 0, sec = null, secPass = 0, secFail = 0;
  const flush = () => { if (sec !== null) console.log(`${secFail ? 'FAIL' : 'ok  '} ${sec}: ${secPass}건 통과${secFail ? `, ${secFail}건 실패` : ''}`); };
  const T = {
    section(name) { flush(); sec = name; secPass = 0; secFail = 0; },
    ok(name, cond, info) {
      if (cond) { pass++; secPass++; } else { fail++; secFail++; console.log(`   ✗ ${name}${info !== undefined ? ' — ' + info : ''}`); }
      return cond;
    },
    near(name, got, want, tol) {
      const t = tol === undefined ? 1e-9 : tol;
      return T.ok(name, Number.isFinite(got) && Math.abs(got - want) <= t, `얻은 값 ${got}, 기대 ${want}`);
    },
    done() { flush(); console.log(`\n[${title}] 통과 ${pass} / 실패 ${fail}`); process.exit(fail ? 1 : 0); },
    counts: () => ({ pass, fail })
  };
  return T;
}

module.exports = { LOA, html, htmlPath, engineCode, uiCode, skill, baseInp, build, rnd, randomInput, randomBuild, makeReporter, TYPES };

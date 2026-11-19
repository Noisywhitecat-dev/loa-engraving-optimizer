// 독립 구현(Python 참조 모델)과 JS 엔진의 수치 대조.  실행: node research/test_cross.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { LOA, rnd, randomInput, randomBuild, makeReporter } = require('./_load.js');
const T = makeReporter('독립 구현 대조');

const N = 600, cases = [], js = [];
for (let n = 0; n < N; n++) {
  const R = rnd(31000 + n), inp = randomInput(R);
  if (n % 5 === 0) { inp.otherCR += 60 + Math.round(R() * 120); inp.otherCD += Math.round(R() * 80); }   // 다중 치명 구간
  if (n % 7 === 0) { inp.extraAS += 30; inp.extraMS += 30; }                                              // 속도 상한 초과 구간
  const b = randomBuild(R, LOA.ENGR_ORDER, Math.floor(R() * 11)), cur = randomBuild(R, LOA.ENGR_ORDER, 0);
  if (n % 11 === 0) b.t5 = { id: 'none', lv: 0 };
  cases.push({ inp, build: b, cur });
  const ev = LOA.evalBuild(b, inp), evC = LOA.evalBuild(cur, inp);
  js.push({ rows: ev.rows, ratio: LOA.compare(inp, ev, evC).ratio, AS: ev.ctx.AS, MS: ev.ctx.MS, H: ev.ctx.H, atk: ev.ctx.atk, add: ev.ctx.add });
}
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'loa-cross-'));
const fin = path.join(dir, 'cases.json'), fout = path.join(dir, 'out.json');
fs.writeFileSync(fin, JSON.stringify(cases));
execFileSync('python', ['-X', 'utf8', path.join(__dirname, 'reference_model.py'), fin, fout], { stdio: 'inherit' });
const py = JSON.parse(fs.readFileSync(fout, 'utf8'));
fs.rmSync(dir, { recursive: true, force: true });

T.section(`무작위 ${N}건 (스킬 ${N * 11}개): 스킬별 수치`);
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-12, Math.abs(a), Math.abs(b));
const worst = { M: 0, cr: 0, cd: 0, evo: 0, hit: 0, multi: 0, cdf: 0 };
let rowsChecked = 0;
for (let n = 0; n < N; n++) for (let i = 0; i < js[n].rows.length; i++) {
  rowsChecked++;
  for (const k of Object.keys(worst)) {
    const a = js[n].rows[i][k], b = py[n].rows[i][k], d = k === 'M' || k === 'cdf' ? rel(a, b) : Math.abs(a - b);
    if (d > worst[k]) worst[k] = d;
  }
}
const label = { M: '1회 피해 배율', cr: '치명타 적중률', cd: '치명타 피해', evo: '진화형 피해', hit: '실제 치명 확률', multi: '다중 치명 확률', cdf: '쿨타임 배율' };
for (const k of Object.keys(worst)) T.ok(`${label[k]}: 최대 차이 ${worst[k].toExponential(2)}`, worst[k] < 1e-9);
T.ok(`대조한 스킬 수 ${rowsChecked}`, rowsChecked === N * 11);

T.section('세팅 공통 수치와 DPS 비율');
const w2 = { ratio: 0, AS: 0, MS: 0, H: 0, atk: 0, add: 0 };
for (let n = 0; n < N; n++) for (const k of Object.keys(w2)) { const d = k === 'ratio' ? rel(js[n][k], py[n][k]) : Math.abs(js[n][k] - py[n][k]); if (d > w2[k]) w2[k] = d; }
const l2 = { ratio: '현재 세팅 대비 DPS 비율', AS: '공격 속도', MS: '이동 속도', H: '치명 시 피해', atk: '공격력 배율', add: '추가 피해 배율' };
for (const k of Object.keys(w2)) T.ok(`${l2[k]}: 최대 차이 ${w2[k].toExponential(2)}`, w2[k] < 1e-9);
const spread = js.map(x => x.ratio).sort((a, b) => a - b);
T.ok(`사례의 DPS 비율 범위 ${spread[0].toFixed(3)} ~ ${spread[N - 1].toFixed(3)} (다양한 구간을 덮음)`, spread[0] < 0.8 && spread[N - 1] > 1.25);
const multi = js.filter(x => x.rows.some(r => r.multi > 0)).length, thorn = cases.filter(c => c.build.t5.id === 'thorn').length, sonicCap = cases.filter((c, i) => c.build.t5.id === 'sonic' && js[i].AS > 40 && js[i].MS > 40).length;
T.ok(`다중 치명 사례 ${multi}건, 뭉가 ${thorn}건, 음속 돌파 상한 초과 ${sonicCap}건 포함`, multi > 50 && thorn > 50 && sonicCap > 5);

T.done();

// 데이터 대조, 성질 검사, 최적화 검증, 시뮬레이션, 견고성, 성능.  실행: node research/test_properties.js
const { LOA, skill, baseInp, build, rnd, randomInput, randomBuild, makeReporter } = require('./_load.js');
const T = makeReporter('데이터·성질·최적화·시뮬레이션');
const t2 = (o) => Object.assign({ endless: 0, forbidden: 0, keen: 0, limit: 0, optim: 0 }, o);
const t3 = (o) => Object.assign({ infinite: 0, allout: 0, strike: 0, tank: 0, timing: 0 }, o);
const t4 = (o) => Object.assign({ crit: false, master: false, crush: false }, o);
const EPS = 1e-9;

// 탐침용 스킬: 0 일반, 1 마나 300, 2 백 100%, 3 헤드 100%, 4 백 0%, 5 차지, 6 홀딩, 7 각성기, 8 마나 1000
const PS = [skill({ share: 10, r: 100 }), skill({ share: 10, r: 100, mana: 300 }), skill({ share: 10, r: 100, dir: 'back', p: 100 }),
  skill({ share: 10, r: 100, dir: 'head', p: 100 }), skill({ share: 10, r: 100, dir: 'back', p: 0 }), skill({ share: 10, r: 100, charge: true }),
  skill({ share: 10, r: 100, hold: true }), skill({ share: 10, r: 100, type: 'awakening' }), skill({ share: 10, r: 100, mana: 1000 })];
const P0 = baseInp({ skills: PS });
const rows = (b, inp) => LOA.evalBuild(build(b || {}), inp || P0).rows;
const ctx = (b, inp) => LOA.evalBuild(build(b || {}), inp || P0).ctx;
const base = rows({});

// ───────────────────────── 1. 진화 노드 수치 ─────────────────────────
T.section('진화 2티어 노드 수치');
for (let L = 1; L <= 2; L++) {
  let r = rows({ t2: t2({ endless: L }) });
  T.near(`끝없는 마나 Lv${L}: 마나 스킬 쿨 -${7 * L}%`, r[1].cdf, 1 - 0.07 * L);
  T.near(`끝없는 마나 Lv${L}: 비마나 스킬 쿨 변화 없음`, r[0].cdf, 1);
  T.near(`끝없는 마나 Lv${L}: 진피 없음`, r[1].evo, base[1].evo);
  r = rows({ t2: t2({ forbidden: L }) });
  T.near(`금단의 주문 Lv${L}: 진피 +${5 * L}`, r[0].evo - base[0].evo, 5 * L);
  T.near(`금단의 주문 Lv${L}: 마나 스킬 진피 +${10 * L}`, r[1].evo - base[1].evo, 10 * L);
  T.near(`금단의 주문 Lv${L}: 각성기(비마나) +${5 * L}`, r[7].evo - base[7].evo, 5 * L);
  r = rows({ t2: t2({ keen: L }) });
  T.near(`예리한 감각 Lv${L}: 치적 +${4 * L}`, r[0].cr - base[0].cr, 4 * L);
  T.near(`예리한 감각 Lv${L}: 진피 +${5 * L}`, r[0].evo - base[0].evo, 5 * L);
  r = rows({ t2: t2({ optim: L }) });
  T.near(`최적화 훈련 Lv${L}: 쿨 -${4 * L}%`, r[0].cdf, 1 - 0.04 * L);
  T.near(`최적화 훈련 Lv${L}: 각성기 제외`, r[7].cdf, 1);
  T.near(`최적화 훈련 Lv${L}: 진피 +${5 * L}`, r[0].evo - base[0].evo, 5 * L);
}
for (let L = 1; L <= 3; L++) T.near(`한계 돌파 Lv${L}: 진피 +${10 * L}`, rows({ t2: t2({ limit: L }) })[0].evo - base[0].evo, 10 * L);

T.section('진화 3티어 노드 수치');
for (let L = 1; L <= 2; L++) {
  let r = rows({ t3: t3({ infinite: L }) });
  T.near(`무한한 마력 Lv${L}: 진피 +${8 * L}`, r[0].evo - base[0].evo, 8 * L);
  T.near(`무한한 마력 Lv${L}: 마나 스킬 쿨 -${7 * L}%`, r[1].cdf, 1 - 0.07 * L);
  T.near(`무한한 마력 Lv${L}: 비마나 쿨 변화 없음`, r[0].cdf, 1);
  r = rows({ t3: t3({ allout: L }) });
  T.near(`혼신의 강타 Lv${L}: 치적 +${12 * L}`, r[0].cr - base[0].cr, 12 * L);
  T.near(`혼신의 강타 Lv${L}: 진피 +${2 * L}`, r[0].evo - base[0].evo, 2 * L);
  r = rows({ t3: t3({ strike: L }) });
  T.near(`일격 Lv${L}: 치적 +${10 * L} (비방향성)`, r[0].cr - base[0].cr, 10 * L);
  T.near(`일격 Lv${L}: 치적 +${10 * L} (각성기)`, r[7].cr - base[7].cr, 10 * L);
  T.near(`일격 Lv${L}: 백어택 스킬 치피 +${16 * L}`, r[2].cd - base[2].cd, 16 * L);
  T.near(`일격 Lv${L}: 헤드어택 스킬 치피 +${16 * L}`, r[3].cd - base[3].cd, 16 * L);
  T.near(`일격 Lv${L}: 방향 성공률 0%여도 치피 +${16 * L}`, r[4].cd - base[4].cd, 16 * L);
  T.near(`일격 Lv${L}: 비방향성 스킬 치피 변화 없음`, r[0].cd - base[0].cd, 0);
  r = rows({ t3: t3({ tank: L }) });
  T.near(`파괴 전차 Lv${L}: 진피 +${12 * L}`, r[0].evo - base[0].evo, 12 * L);
  T.near(`파괴 전차 Lv${L}: 공속 +${4 * L}`, ctx({ t3: t3({ tank: L }) }).AS - ctx({}).AS, 4 * L);
  T.near(`파괴 전차 Lv${L}: 이속 변화 없음`, ctx({ t3: t3({ tank: L }) }).MS - ctx({}).MS, 0);
  r = rows({ t3: t3({ timing: L }) });
  T.near(`타이밍 지배 Lv${L}: 쿨 -${5 * L}%`, r[0].cdf, 1 - 0.05 * L);
  T.near(`타이밍 지배 Lv${L}: 각성기 제외`, r[7].cdf, 1);
  T.near(`타이밍 지배 Lv${L}: 진피 +${8 * L}`, r[0].evo - base[0].evo, 8 * L);
}

T.section('쿨감 묶음 (합연산 / 곱연산)');
{
  let r = rows({ t2: t2({ endless: 2 }), t3: t3({ infinite: 2 }) });
  T.near('끝없는 마나 2 + 무한한 마력 2 = 28% 합연산', r[1].cdf, 0.72);
  r = rows({ t2: t2({ optim: 2 }), t3: t3({ timing: 2 }) });
  T.near('최적화 훈련 2 + 타이밍 지배 2 = 18% 합연산', r[0].cdf, 0.82);
  r = rows({ t2: t2({ endless: 1, optim: 2 }), t3: t3({ infinite: 1, timing: 1 }) });
  T.near('두 묶음은 곱연산: (1-0.14)(1-0.13)', r[1].cdf, 0.86 * 0.87);
  T.near('비마나 스킬은 최적화·타이밍만', r[0].cdf, 0.87);
  r = rows({ t1: { crit: 0, spec: 0, swift: 10 }, t2: t2({ optim: 2 }), t3: t3({ timing: 2 }) });
  T.near('신속 쿨감과도 곱연산', r[0].cdf, (1 - 500 / 46.5731 / 100) * 0.82);
  T.near('각성기는 신속만', r[7].cdf, 1 - 500 / 46.5731 / 100);
}

T.section('진화 4티어·5티어 노드 수치');
{
  T.near('회심: 치명 시 피해 12%', ctx({ t4: t4({ crit: true }) }).H, 0.12);
  T.near('회심 없음: 0', ctx({}).H, 0);
  let r = rows({ t4: t4({ master: true }) });
  T.near('달인: 치적 +7 (1.4 × 5중첩)', r[0].cr - base[0].cr, 7);
  T.near('달인: 추가 피해 +8.5 (1.7 × 5중첩)', ctx({ t4: t4({ master: true }) }).add, 1.085);
  T.near('분쇄: 진피 +20', rows({ t4: t4({ crush: true }) })[0].evo - base[0].evo, 20);
  T.near('서포터 정열의 춤사위: 기본 진피 12', base[0].evo, 12);
  T.near('입식 타격가 Lv1: 10.5', rows({ t5: { id: 'stand', lv: 1 } })[0].evo - 12, 10.5);
  T.near('입식 타격가 Lv2: 21', rows({ t5: { id: 'stand', lv: 2 } })[0].evo - 12, 21);
  T.near('인파이팅 Lv1: 9', rows({ t5: { id: 'infight', lv: 1 } })[0].evo - 12, 9);
  T.near('인파이팅 Lv2: 18', rows({ t5: { id: 'infight', lv: 2 } })[0].evo - 12, 18);
  T.near('뭉가 Lv1 (치적 80 이하): 9.5', rows({ t5: { id: 'thorn', lv: 1 } })[0].evo - 12, 9.5);
  T.near('뭉가 Lv2 (치적 80 이하): 19', rows({ t5: { id: 'thorn', lv: 2 } })[0].evo - 12, 19);
  const hi = baseInp({ otherCR: 100, skills: PS });
  T.near('뭉가 Lv1 치적 100: 9.5 + 1.2×20', rows({ t5: { id: 'thorn', lv: 1 } }, hi)[0].evo - 12, 33.5);
  T.near('뭉가 Lv2 치적 100: 19 + 1.4×20', rows({ t5: { id: 'thorn', lv: 2 } }, hi)[0].evo - 12, 47);
  T.near('뭉가: 백어택 성공 스킬은 치적 110 기준 19 + 1.4×30', rows({ t5: { id: 'thorn', lv: 2 } }, hi)[2].evo - 12, 61);
  T.near('뭉가: 실제 치명타 적중률 80', rows({ t5: { id: 'thorn', lv: 2 } }, hi)[0].hit, 80);
  T.near('마나 용광로 Lv2 마나 300: 15', rows({ t5: { id: 'furnace', lv: 2 } })[1].evo - 12, 15);
  T.near('마나 용광로 Lv1 마나 300: 7.5', rows({ t5: { id: 'furnace', lv: 1 } })[1].evo - 12, 7.5);
  T.near('마나 용광로 Lv2 마나 1000: 상한 24', rows({ t5: { id: 'furnace', lv: 2 } })[8].evo - 12, 24);
  T.near('마나 용광로 Lv1 마나 1000: 상한 12', rows({ t5: { id: 'furnace', lv: 1 } })[8].evo - 12, 12);
  T.near('마나 용광로: 비마나 스킬 0', rows({ t5: { id: 'furnace', lv: 2 } })[0].evo - 12, 0);
  const sp = (as, ms) => baseInp({ extraAS: as - 9, extraMS: ms - 9, skills: PS });
  const sonic = (as, ms, lv) => rows({ t5: { id: 'sonic', lv } }, sp(as, ms))[0].evo - 12;
  T.near('음속 돌파 Lv2 140/140: 8', sonic(40, 40, 2), 8);
  T.near('음속 돌파 Lv1 140/140: 4', sonic(40, 40, 1), 4);
  T.near('음속 돌파 Lv2 150/150: 8 + 8 + 0.3×20 = 22', sonic(50, 50, 2), 22);
  T.near('음속 돌파 Lv1 150/150: 4 + 4 + 0.15×20 = 11', sonic(50, 50, 1), 11);
  T.near('음속 돌파 Lv2 153.34/153.34: 상한 24', sonic(53.34, 53.34, 2), 24);
  T.near('음속 돌파 Lv2 170/170: 상한 24', sonic(70, 70, 2), 24);
  T.near('음속 돌파 Lv1 170/170: 상한 12', sonic(70, 70, 1), 12);
  T.near('음속 돌파 Lv2 150/140(한쪽이 상한 정확히): 8만', sonic(50, 40, 2), 8);
  T.near('음속 돌파 Lv2 120/130: 0.1×(20+30) = 5', sonic(20, 30, 2), 5);
  T.near('음속 돌파 Lv2 공속 음수는 0으로: 0.1×40', sonic(-5, 40, 2), 4);
  T.near('음속 돌파: 한쪽만 초과(160/135)면 0.1×(40+35)', sonic(60, 35, 2), 7.5);
}

T.section('1티어 스탯·펫·기본 스탯 환산');
{
  for (const n of [1, 10, 30]) {
    T.near(`치명 ${n}포인트: 치적 ${50 * n}/27.944`, rows({ t1: { crit: n, spec: 0, swift: 0 } })[0].cr, 50 * n / 27.944);
    const c = ctx({ t1: { crit: 0, spec: 0, swift: n } });
    T.near(`신속 ${n}포인트: 공속`, c.AS, 50 * n / 58.2449 + 9);
    T.near(`신속 ${n}포인트: 이속`, c.MS, 50 * n / 58.2211 + 9);
    T.near(`신속 ${n}포인트: 쿨감`, c.swiftCdr, 50 * n / 46.5731 / 100);
    T.near(`특화 ${n}포인트: 영향 없음`, rows({ t1: { crit: 0, spec: n, swift: 0 } })[0].M, base[0].M);
  }
  T.near('펫 치명 +160', rows({ pet: 'crit' })[0].cr, 160 / 27.944);
  T.near('펫 신속 +160', ctx({ pet: 'swift' }).swiftStat, 160);
  T.near('펫 특화: 영향 없음', rows({ pet: 'spec' })[0].M, base[0].M);
  T.near('기본 치명 279.44 = 치적 10%', rows({}, baseInp({ baseCrit: 279.44, skills: PS }))[0].cr, 10);
  T.near('기본 신속 465.731 = 쿨감 10%', ctx({}, baseInp({ baseSwift: 465.731, skills: PS })).swiftCdr, 0.1);
  T.near('서포터 축복의 여신: 공이속 +9', ctx({}).AS, 9);
}

// ───────────────────────── 2. 각인 수치 ─────────────────────────
T.section('각인 수치 (유물 4단계 + 스톤 Lv0~4)');
{
  const S3 = [0, 3, 3.75, 5.25, 6], S15 = [0, 7.5, 9.4, 13.2, 15], SAMB = [0, 2.7, 3.4, 4.7, 5.4], SADR = [0, 0.48, 0.6, 0.83, 0.95];
  const flat = { grudge: 21, doll: 17, tenacity: 17, barricade: 17, stable: 17, mass: 19 };
  const ratio = (id, lv, idx, inp0, slot) => {
    const st = slot === 1 ? [{ id: 'none', lv: 0 }, { id, lv }] : [{ id, lv }];
    const inp = Object.assign({}, inp0 || P0, { stone: lv ? st : [] });
    return LOA.evalBuild(build({ engr: [id] }), inp).rows[idx].M / LOA.evalBuild(build({}), inp).rows[idx].M;
  };
  for (let lv = 0; lv <= 4; lv++) {
    for (const id of Object.keys(flat)) {
      T.near(`${LOA.ENGR[id].name} 스톤 Lv${lv}: 일반 스킬 ×${1 + (flat[id] + S3[lv]) / 100}`, ratio(id, lv, 0), 1 + (flat[id] + S3[lv]) / 100);
      T.near(`${LOA.ENGR[id].name} 스톤 Lv${lv}: 각성기에도 적용`, ratio(id, lv, 7), 1 + (flat[id] + S3[lv]) / 100);
    }
    T.near(`타격의 대가 Lv${lv}: 비방향성`, ratio('hit', lv, 0), 1 + (17 + S3[lv]) / 100);
    T.near(`타격의 대가 Lv${lv}: 백어택 스킬(성공) 미적용`, ratio('hit', lv, 2), 1);
    T.near(`타격의 대가 Lv${lv}: 백어택 스킬(실패) 미적용`, ratio('hit', lv, 4), 1);
    T.near(`타격의 대가 Lv${lv}: 헤드어택 스킬 미적용`, ratio('hit', lv, 3), 1);
    T.near(`타격의 대가 Lv${lv}: 각성기 미적용`, ratio('hit', lv, 7), 1);
    T.near(`슈퍼 차지 Lv${lv}: 차지 스킬`, ratio('charge', lv, 5), 1 + (21 + S3[lv]) / 100);
    T.near(`슈퍼 차지 Lv${lv}: 비차지 스킬 미적용`, ratio('charge', lv, 0), 1);
    T.near(`속전속결 Lv${lv}: 홀딩·캐스팅 스킬`, ratio('rapid', lv, 6), 1 + (21 + S3[lv]) / 100);
    T.near(`속전속결 Lv${lv}: 그 외 미적용`, ratio('rapid', lv, 0), 1);
    T.near(`마나 효율 증가 Lv${lv}: 마나 스킬`, ratio('mana', lv, 1), 1 + (16 + S3[lv]) / 100);
    T.near(`마나 효율 증가 Lv${lv}: 비마나 미적용`, ratio('mana', lv, 0), 1);
    T.near(`기습의 대가 Lv${lv}: 비방향성 ${7.6 + SAMB[lv]}%`, ratio('ambush', lv, 0), 1 + (7.6 + SAMB[lv]) / 100);
    T.near(`기습의 대가 Lv${lv}: 백어택 성공 ${22.6 + SAMB[lv]}%`, ratio('ambush', lv, 2), 1 + (22.6 + SAMB[lv]) / 100);
    T.near(`기습의 대가 Lv${lv}: 백어택 실패는 기본만`, ratio('ambush', lv, 4), 1 + (7.6 + SAMB[lv]) / 100);
    T.near(`기습의 대가 Lv${lv}: 헤드어택 스킬은 기본만`, ratio('ambush', lv, 3), 1 + (7.6 + SAMB[lv]) / 100);
    T.near(`기습의 대가 Lv${lv}: 각성기 미적용`, ratio('ambush', lv, 7), 1);
    T.near(`결투의 대가 Lv${lv}: 헤드어택 성공 ${22.6 + SAMB[lv]}%`, ratio('duel', lv, 3), 1 + (22.6 + SAMB[lv]) / 100);
    T.near(`결투의 대가 Lv${lv}: 백어택 스킬은 기본만`, ratio('duel', lv, 2), 1 + (7.6 + SAMB[lv]) / 100);
    T.near(`결투의 대가 Lv${lv}: 각성기 미적용`, ratio('duel', lv, 7), 1);
    const st = lv ? [{ id: 'blunt', lv }] : [];
    T.near(`예리한 둔기 Lv${lv}: 치피 +${52 + S15[lv]}`, rows({ engr: ['blunt'] }, baseInp({ stone: st, skills: PS }))[0].cd, 252 + S15[lv]);
    T.near(`예리한 둔기 Lv${lv}: 기대 0.98배 (치적 0)`, ratio('blunt', lv, 0), 0.98);
    const sd = lv ? [{ id: 'dagger', lv }] : [];
    T.near(`정밀 단도 Lv${lv}: 치적 +${21 + S3[lv]}`, rows({ engr: ['dagger'] }, baseInp({ stone: sd, skills: PS }))[0].cr, 21 + S3[lv]);
    T.near(`정밀 단도 Lv${lv}: 치피 -6`, rows({ engr: ['dagger'] }, baseInp({ stone: sd, skills: PS }))[0].cd, 194);
    const sa = lv ? [{ id: 'adrenaline', lv }] : [];
    T.near(`아드레날린 Lv${lv}: 치적 +20 (스톤 무관)`, rows({ engr: ['adrenaline'] }, baseInp({ stone: sa, skills: PS }))[0].cr, 20);
    T.near(`아드레날린 Lv${lv}: 공격력 ${(6 * (0.9 + SADR[lv])).toFixed(2)}%`, ctx({ engr: ['adrenaline'] }, baseInp({ stone: sa, skills: PS })).atk, 1 + 6 * (0.9 + SADR[lv]) / 100);
    const ms20 = baseInp({ extraMS: 11, skills: PS }), ms60 = baseInp({ extraMS: 51, skills: PS });
    T.near(`돌격대장 Lv${lv}: 이속 +20% → ${(20 * (48 + S15[lv]) / 100).toFixed(2)}%`, ratio('raid', lv, 0, ms20), 1 + 20 * (48 + S15[lv]) / 100 / 100);
    T.near(`돌격대장 Lv${lv}: 이속 +60%는 40%로 제한`, ratio('raid', lv, 0, ms60), 1 + 40 * (48 + S15[lv]) / 100 / 100);
    if (lv) T.near(`스톤 둘째 칸도 인식 (원한 Lv${lv})`, ratio('grudge', lv, 0, null, 1), 1 + (21 + S3[lv]) / 100);
  }
  T.near('질량 증가: 공속 -10', ctx({ engr: ['mass'] }).AS - ctx({}).AS, -10);
  T.near('질량 증가: 이속 변화 없음', ctx({ engr: ['mass'] }).MS - ctx({}).MS, 0);
  T.near('아드레날린 공격력은 기타 공격력과 합연산', ctx({ engr: ['adrenaline'] }, baseInp({ otherAtk: 10, skills: PS })).atk, 1.154);
  T.near('돌격대장: 이속 음수는 0', ratio('raid', 0, 0, baseInp({ extraMS: -30, skills: PS })), 1);
  const two = LOA.evalBuild(build({ engr: ['grudge', 'doll', 'mass'] }), P0).rows[0].M / base[0].M;
  T.near('각인끼리는 곱연산: 1.21 × 1.17 × 1.19', two, 1.21 * 1.17 * 1.19);
  T.near('스톤이 다른 각인에는 영향 없음', LOA.evalBuild(build({ engr: ['doll'] }), baseInp({ stone: [{ id: 'grudge', lv: 4 }], skills: PS })).rows[0].M / base[0].M, 1.17);
  T.near('장착하지 않은 스톤 각인은 효과 없음', LOA.evalBuild(build({}), baseInp({ stone: [{ id: 'grudge', lv: 4 }], skills: PS })).rows[0].M, base[0].M);
}

// ───────────────────────── 3. 팔찌 ─────────────────────────
T.section('팔찌 특수 옵션 수치 (유물/고대 × 하/중/상)');
{
  const EXP = {
    crH: { relic: [2.6, 3.4, 4.2], ancient: [3.4, 4.2, 5.0], f: 'cr', h: 1 }, cdH: { relic: [5.2, 6.8, 8.4], ancient: [6.8, 8.4, 10.0], f: 'cd', h: 1 },
    cr: { relic: [2.6, 3.4, 4.2], ancient: [3.4, 4.2, 5.0], f: 'cr' }, cd: { relic: [5.2, 6.8, 8.4], ancient: [6.8, 8.4, 10.0], f: 'cd' },
    add: { relic: [2.5, 3.0, 3.5], ancient: [3.0, 3.5, 4.0], f: 'add' }, addDemon: { relic: [2.0, 2.5, 3.0], ancient: [2.5, 3.0, 3.5], f: 'add' },
    speed: { relic: [3, 4, 5], ancient: [4, 5, 6], f: 'speed' }, wpSpeed: { relic: [6, 6, 6], ancient: [6, 6, 6], f: 'speed' }
  };
  const c0 = ctx({});
  for (const id of Object.keys(LOA.BRACELET)) for (const grade of ['relic', 'ancient']) for (let tier = 0; tier < 3; tier++) {
    if (id === 'none') continue;
    const c = ctx({}, baseInp({ bracelet: { grade, slots: [{ id, tier }] }, skills: PS }));
    const e = EXP[id], v = e ? e[grade][tier] : 0, tag = `${id} ${grade} ${tier}`;
    T.near(`${tag}: 치적`, c.cr - c0.cr, e && e.f === 'cr' ? v : 0);
    T.near(`${tag}: 치피`, c.cd - c0.cd, e && e.f === 'cd' ? v : 0);
    T.near(`${tag}: 추가 피해`, c.add - c0.add, e && e.f === 'add' ? v / 100 : 0);
    T.near(`${tag}: 공속`, c.AS - c0.AS, e && e.f === 'speed' ? v : 0);
    T.near(`${tag}: 이속`, c.MS - c0.MS, e && e.f === 'speed' ? v : 0);
    T.near(`${tag}: 치명 시 피해`, c.H, e && e.h ? 0.015 : 0);
    if (!e) T.near(`${tag}: 비교에 영향 없음`, LOA.evalBuild(build({}), baseInp({ bracelet: { grade, slots: [{ id, tier }] }, skills: PS })).rows[0].M, base[0].M);
  }
  const twoR = baseInp({ bracelet: { grade: 'ancient', slots: [{ id: 'crH', tier: 2 }, { id: 'cdH', tier: 2 }] }, skills: PS });
  T.near('치명 시 피해 두 줄: 합산 3%', ctx({}, twoR).H, 0.03);
  T.near('치명 시 피해 두 줄 + 회심: 1.12 × 1.03', ctx({ t4: t4({ crit: true }) }, twoR).H, 1.12 * 1.03 - 1);
  T.near('두 줄 치적·치피는 각각 반영', ctx({}, twoR).cr + ctx({}, twoR).cd, 5 + 210);
  T.near('팔찌 추피 + 달인 + 기타 추피는 합연산', ctx({ t4: t4({ master: true }) }, baseInp({ otherAdd: 30, bracelet: { grade: 'ancient', slots: [{ id: 'add', tier: 2 }] }, skills: PS })).add, 1 + (30 + 4 + 8.5) / 100);
  T.near('아크 그리드 치명 시 피해는 회심·팔찌와 곱연산', ctx({ t4: t4({ crit: true }) }, baseInp({ otherH: 1.1, bracelet: { grade: 'ancient', slots: [{ id: 'crH', tier: 2 }] }, skills: PS })).H, 1.12 * 1.015 * 1.011 - 1);
}

T.section('기타 입력 반영');
{
  T.near('시너지 치적 +10', rows({}, baseInp({ syn10: true, skills: PS }))[0].cr, 10);
  T.near('시너지 치적 +20', rows({}, baseInp({ syn20: true, skills: PS }))[0].cr, 20);
  T.near('시너지 둘 다 +30', rows({}, baseInp({ syn10: true, syn20: true, skills: PS }))[0].cr, 30);
  T.near('카르마 6랭크: 진피 +6', rows({}, baseInp({ karma: 6, skills: PS }))[0].evo, 18);
  T.near('기타 진화형 피해 합산', rows({}, baseInp({ otherEvo: 7, skills: PS }))[0].evo, 19);
  T.near('기타 치적·치피 합산', rows({}, baseInp({ otherCR: 3, otherCD: 8, skills: PS }))[0].cr + rows({}, baseInp({ otherCR: 3, otherCD: 8, skills: PS }))[0].cd, 211);
  T.near('스킬 트포 치적·치피', rows({}, baseInp({ skills: [skill({ share: 1, cr: 40, cd: 60 })] }))[0].cr + rows({}, baseInp({ skills: [skill({ share: 1, cr: 40, cd: 60 })] }))[0].cd, 300);
  T.near('백어택 성공: 피해 1.05 × 치적 +10', base[2].M / base[0].M, 1.05 * 1.1);
  T.near('헤드어택 성공: 피해 1.2', base[3].M / base[0].M, 1.2);
  T.near('방향 성공률 0%: 보정 없음', base[4].M / base[0].M, 1);
  const half = rows({}, baseInp({ skills: [skill({ share: 1, dir: 'back', p: 50 })] }))[0];
  T.near('방향 성공률 50%: 반반 가중 (서포터 진피 12% 포함)', half.M, 1.12 * (0.5 * 1.05 * 1.1 + 0.5));
  T.near('방향 성공률 50%: 평균 치적 5', half.cr, 5);
}

// ───────────────────────── 4. 성질 검사 ─────────────────────────
T.section('불변식과 단조성 (무작위 120건)');
{
  const noEff = Object.keys(LOA.BRACELET).filter(id => id !== 'none' && !LOA.BRACELET[id].eff);
  let finite = 0, scale = 0, perm = 0, zero = 0, brac = 0, self = 0, rebase = 0, monoCR = 0, monoCD = 0, monoEvo = 0, monoSwift = 0, sep = 0, crush = 0;
  const N = 120;
  for (let n = 0; n < N; n++) {
    const R = rnd(1000 + n), inp = randomInput(R), pool = LOA.ENGR_ORDER;
    const cur = randomBuild(R, pool), A = randomBuild(R, pool), B = randomBuild(R, pool);
    const evC = LOA.evalBuild(cur, inp), evA = LOA.evalBuild(A, inp), evB = LOA.evalBuild(B, inp);
    const rA = LOA.compare(inp, evA, evC).ratio, rB = LOA.compare(inp, evB, evC).ratio;
    if ([rA, rB].every(x => Number.isFinite(x) && x > 0) && evA.rows.every(r => Number.isFinite(r.M) && r.M > 0 && r.cdf > 0)) finite++;
    // 지분 전체에 상수를 곱해도 같다
    const inpS = Object.assign({}, inp, { skills: inp.skills.map(s => Object.assign({}, s, { share: s.share * 3.7 })) });
    if (Math.abs(LOA.compare(inpS, LOA.evalBuild(A, inpS), LOA.evalBuild(cur, inpS)).ratio - rA) < 1e-12) scale++;
    // 스킬 순서를 바꿔도 같다
    const order = inp.skills.map((_, i) => i).sort(() => R() - 0.5);
    const inpP = Object.assign({}, inp, { skills: order.map(i => inp.skills[i]) });
    if (Math.abs(LOA.compare(inpP, LOA.evalBuild(A, inpP), LOA.evalBuild(cur, inpP)).ratio - rA) < 1e-12) perm++;
    // 지분 0인 스킬의 값은 결과에 영향 없다
    const inpZ = Object.assign({}, inp, { skills: inp.skills.map(s => s.share > 0 ? s : Object.assign({}, s, { cr: 77, cd: 55, mana: 999, r: 13, dir: 'back', p: 40 })) });
    if (Math.abs(LOA.compare(inpZ, LOA.evalBuild(A, inpZ), LOA.evalBuild(cur, inpZ)).ratio - rA) < 1e-12) zero++;
    // "비교에 영향 없음" 팔찌 옵션을 넣거나 빼도 같다
    const inpB = Object.assign({}, inp, { bracelet: { grade: inp.bracelet.grade, slots: inp.bracelet.slots.map(s => LOA.BRACELET[s.id].eff ? s : { id: noEff[Math.floor(R() * noEff.length)], tier: 1 }) } });
    if (Math.abs(LOA.compare(inpB, LOA.evalBuild(A, inpB), LOA.evalBuild(cur, inpB)).ratio - rA) < 1e-12) brac++;
    if (Math.abs(LOA.compare(inp, evC, evC).ratio - 1) < 1e-12) self++;
    // 기준 세팅을 B로 옮겨(지분·소화 비율 재계산) A를 비교하면 rA / rB 와 같아야 한다
    const cmpB = LOA.compare(inp, evB, evC);
    const inpR = Object.assign({}, inp, { skills: inp.skills.map((s, i) => {
      if (!(s.share > 0)) return s;
      const rho = evB.rows[i].cdf / evC.rows[i].cdf, r = s.r / 100;
      return Object.assign({}, s, { share: s.share * cmpB.per[i].dmg * cmpB.per[i].use, r: 100 * r * rho / (1 - r * (1 - rho)) });
    }) });
    if (Math.abs(LOA.compare(inpR, LOA.evalBuild(A, inpR), LOA.evalBuild(B, inpR)).ratio - rA / rB) < 1e-10) rebase++;
    // 단조성
    const up = (k, d) => LOA.evalBuild(A, Object.assign({}, inp, { [k]: inp[k] + d }));
    if (up('otherCR', 5).rows.every((r, i) => r.M >= evA.rows[i].M - 1e-12)) monoCR++;
    if (up('otherCD', 10).rows.every((r, i) => r.M >= evA.rows[i].M - 1e-12)) monoCD++;
    if (up('otherEvo', 5).rows.every((r, i) => r.M > evA.rows[i].M)) monoEvo++;
    if (up('baseSwift', 100).rows.every((r, i) => r.cdf < evA.rows[i].cdf)) monoSwift++;
    // 원한은 다른 조건과 무관하게 정확히 (1 + 0.21 + 스톤)배
    if (!A.engr.includes('grudge')) {
      const A2 = Object.assign({}, A, { engr: A.engr.slice(0, 4).concat('grudge') }), A1 = Object.assign({}, A, { engr: A.engr.slice(0, 4) });
      const want = 1 + (21 + LOA.stoneBonus(inp, 'grudge')) / 100;
      if (LOA.evalBuild(A2, inp).rows.every((r, i) => Math.abs(r.M / LOA.evalBuild(A1, inp).rows[i].M - want) < 1e-12)) sep++;
    } else sep++;
    // 분쇄의 효과는 진피 합 E에 대해 (1+E+0.2)/(1+E)
    const Ac = Object.assign({}, A, { t4: { crit: A.t4.crit, master: A.t4.master, crush: true } }), An = Object.assign({}, A, { t4: { crit: A.t4.crit, master: A.t4.master, crush: false } });
    const eC = LOA.evalBuild(Ac, inp), eN = LOA.evalBuild(An, inp);
    if (eN.rows.every((r, i) => { const d = eC.rows[i].evo - r.evo; return Math.abs(d - 20) < 1e-9; })) crush++;
  }
  T.ok(`결과가 유한한 양수 (${finite}/${N})`, finite === N);
  T.ok(`지분 배율 불변 (${scale}/${N})`, scale === N);
  T.ok(`스킬 순서 불변 (${perm}/${N})`, perm === N);
  T.ok(`지분 0 스킬 무영향 (${zero}/${N})`, zero === N);
  T.ok(`영향 없는 팔찌 옵션 무영향 (${brac}/${N})`, brac === N);
  T.ok(`현재 세팅 = 1 (${self}/${N})`, self === N);
  T.ok(`기준 세팅을 옮겨도 일관 (${rebase}/${N})`, rebase === N);
  T.ok(`치적 증가 → 피해 감소 없음 (${monoCR}/${N})`, monoCR === N);
  T.ok(`치피 증가 → 피해 감소 없음 (${monoCD}/${N})`, monoCD === N);
  T.ok(`진피 증가 → 피해 증가 (${monoEvo}/${N})`, monoEvo === N);
  T.ok(`신속 증가 → 쿨타임 감소 (${monoSwift}/${N})`, monoSwift === N);
  T.ok(`원한은 항상 같은 배율 (${sep}/${N})`, sep === N);
  T.ok(`분쇄는 진피 +20 (${crush}/${N})`, crush === N);
}

// ───────────────────────── 5. 최적화 결과 ─────────────────────────
function combos(arr, k) {
  const out = [], pick = [];
  (function rec(s) { if (pick.length === k) { out.push(pick.slice()); return; } for (let i = s; i < arr.length; i++) { pick.push(arr[i]); rec(i + 1); pick.pop(); } })(0);
  return out;
}
T.section('추천 결과의 제약 준수 (무작위 16건 × 5티어 4종 × 상위 조합)');
{
  let picks = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const R = rnd(50 + seed), inp = randomInput(R);
    const opts = { tenacity: R() < 0.5, barricade: R() < 0.5, mass: R() < 0.4, spec: Math.floor(R() * 31), pet: R() < 0.25 ? 'spec' : 'auto' };
    const cur = randomBuild(R, LOA.ENGR_ORDER, 0);
    const res = LOA.runSync(inp, cur, opts), forced = LOA.forcedEngr(inp);
    T.ok(`seed ${seed}: 5티어 4종 결과`, res.results.length === 4 && res.results.map(r => r.t5).join() === 'thorn,sonic,stand,furnace');
    const again = LOA.runSync(inp, cur, opts);
    T.ok(`seed ${seed}: 같은 입력이면 같은 결과`, JSON.stringify(again.results.map(r => r.picks.map(p => [p.build, p.ratio]))) === JSON.stringify(res.results.map(r => r.picks.map(p => [p.build, p.ratio]))));
    res.results.forEach(r => {
      T.ok(`seed ${seed} ${r.t5}: 후보 있음`, r.picks.length >= 1);
      T.ok(`seed ${seed} ${r.t5}: 내림차순`, r.picks.every((p, i) => i === 0 || p.ratio <= r.picks[i - 1].ratio + 1e-12));
      T.ok(`seed ${seed} ${r.t5}: 조합 중복 없음`, new Set(r.picks.map(p => p.build.engr.slice().sort().join())).size === r.picks.length);
      r.picks.forEach(p => {
        picks++;
        const b = p.build, tag = `seed ${seed} ${r.t5} [${b.engr.join(',')}]`;
        T.ok(`${tag}: 각인 5개, 중복 없음`, b.engr.length === 5 && new Set(b.engr).size === 5 && b.engr.every(id => LOA.ENGR[id]));
        T.ok(`${tag}: 스톤 각인 포함`, forced.every(id => b.engr.includes(id)));
        T.ok(`${tag}: 체크한 각인 포함`, ['tenacity', 'barricade', 'mass'].every(id => !opts[id] || b.engr.includes(id)));
        T.ok(`${tag}: 달인의 저력은 체크·스톤일 때만`, !b.engr.includes('tenacity') || opts.tenacity || forced.includes('tenacity'));
        T.ok(`${tag}: 바리케이드는 체크·스톤일 때만`, !b.engr.includes('barricade') || opts.barricade || forced.includes('barricade'));
        T.ok(`${tag}: 안정된 상태는 스톤일 때만`, !b.engr.includes('stable') || forced.includes('stable'));
        T.ok(`${tag}: 질량 증가는 체크·스톤이거나 패널티 후 공속 140% 이상`, !b.engr.includes('mass') || opts.mass || forced.includes('mass') || p.ev.ctx.AS >= 40 - EPS, 'AS ' + p.ev.ctx.AS);
        T.ok(`${tag}: 1티어 합 40, 노드당 30 이하`, b.t1.crit + b.t1.swift + b.t1.spec === 40 && b.t1.crit <= 30 && b.t1.swift <= 30 && b.t1.crit >= 0 && b.t1.swift >= 0);
        T.ok(`${tag}: 특화 고정 포인트 반영`, b.t1.spec === opts.spec);
        T.ok(`${tag}: 펫 설정 반영`, opts.pet === 'spec' ? b.pet === 'spec' : (b.pet === 'crit' || b.pet === 'swift'));
        T.ok(`${tag}: 2티어 3레벨, 노드 상한`, Object.values(b.t2).reduce((a, x) => a + x, 0) === 3 && Object.keys(b.t2).every(k => b.t2[k] <= LOA.T2[k].max && b.t2[k] >= 0));
        T.ok(`${tag}: 3티어 2레벨, 노드 상한`, Object.values(b.t3).reduce((a, x) => a + x, 0) === 2 && Object.keys(b.t3).every(k => b.t3[k] <= 2 && b.t3[k] >= 0));
        T.ok(`${tag}: 4티어 정확히 2개`, Object.values(b.t4).filter(Boolean).length === 2);
        T.ok(`${tag}: 5티어 Lv2`, b.t5.id === r.t5 && b.t5.lv === 2);
        T.near(`${tag}: 표시값 = 고속 탐색값`, p.fast, p.ratio, 1e-9);
        T.near(`${tag}: 표시값 = 직접 재계산`, LOA.compare(inp, LOA.evalBuild(b, inp), LOA.evalBuild(cur, inp)).ratio, p.ratio, 1e-12);
      });
    });
  }
  T.ok(`검사한 추천 조합 수 ${picks}`, picks >= 16 * 4);
}

T.section('조건부 각인 규칙');
{
  const one = (o) => baseInp(Object.assign({ skills: [skill({ share: 100, r: 50 })] }, o));
  const cur = build({ engr: ['grudge'], t5: { id: 'stand', lv: 2 } });
  const bestOf = (res, t5) => res.results.find(r => r.t5 === t5).picks;
  const anyHas = (res, id) => res.results.some(r => r.picks.some(p => p.build.engr.includes(id)));
  let res = LOA.runSync(one({ extraAS: 45 }), cur, { spec: 0, pet: 'auto' });
  T.ok('공속 여유가 충분하면(추가 +45%) 체크 없이도 질량 증가 추천', bestOf(res, 'stand')[0].build.engr.includes('mass'));
  res = LOA.runSync(one({ extraAS: -200 }), cur, { spec: 0, pet: 'auto' });
  T.ok('공속이 모자라면 질량 증가는 어디에도 없음', !anyHas(res, 'mass'));
  res = LOA.runSync(one({ extraAS: -200 }), cur, { mass: true, spec: 0, pet: 'auto' });
  T.ok('체크하면 공속과 무관하게 질량 증가 후보', bestOf(res, 'stand')[0].build.engr.includes('mass'));
  res = LOA.runSync(one({}), cur, { spec: 0, pet: 'auto' });
  T.ok('체크 안 하면 달인의 저력·바리케이드·안정된 상태 없음', !anyHas(res, 'tenacity') && !anyHas(res, 'barricade') && !anyHas(res, 'stable'));
  res = LOA.runSync(one({ stone: [{ id: 'stable', lv: 4 }, { id: 'barricade', lv: 1 }] }), cur, { spec: 0, pet: 'auto' });
  T.ok('스톤에 있으면 안정된 상태·바리케이드 강제 포함', res.results.every(r => r.picks.every(p => p.build.engr.includes('stable') && p.build.engr.includes('barricade'))));
  // 패널티 전 공속이 정확히 150% 경계: 1티어를 전부 특화·치명에 묶어 신속으로 공속을 올릴 수 없게 한다 (파괴 전차 +8 가능 → 추가 공속으로 경계 조절)
  // 쿨타임 위주(소화 100%)에 치피를 낮춰, 신속 10포인트 + 파괴 전차 2레벨이 어차피 최적이 되게 한다
  const edge = (as) => LOA.runSync(baseInp({ extraAS: as, otherCD: -90, skills: [skill({ share: 100, r: 100 })] }), cur, { spec: 30, pet: 'spec' });
  // rem = 10 → 치명 10, 신속 0 도 가능하고 신속 10(+8.58%)·파괴 전차(+8%)도 가능하므로, 가능한 최대 공속 = 추가 + 9 + 8.585 + 8
  const maxExtra = 9 + 500 / 58.2449 + 8;
  T.ok('최대로 올려도 149.9%면 질량 증가 없음', !anyHas(edge(49.9 - maxExtra), 'mass'));
  const e2 = edge(50.1 - maxExtra), top = bestOf(e2, 'stand')[0];
  T.ok('최대로 올려 150.1%면 질량 증가가 1위 조합에 포함', top.build.engr.includes('mass') && top.build.t1.swift === 10 && top.build.t3.tank === 2, top.build.engr.join(',') + ' 신속 ' + top.build.t1.swift + ' 파괴 전차 ' + top.build.t3.tank);
  T.near('그때 패널티 후 공속은 140.1%', top.ev.ctx.AS, 40.1, 1e-9);
}

T.section('체크한 각인은 효율과 상관없이 반드시 포함');
{
  const inp = baseInp({ extraAS: 35, extraMS: 35, otherAdd: 30, skills: [skill({ share: 60, r: 80 }), skill({ share: 40, r: 60, dir: 'back', p: 80, mana: 300 })] });
  const cur = build({ engr: ['grudge'], t5: { id: 'stand', lv: 2 } });
  const all = (res, f) => res.results.length === 4 && res.results.every(r => r.picks.length > 0 && r.picks.every(f));
  const top = (res, t5) => res.results.find(r => r.t5 === t5).picks[0];
  const none = LOA.runSync(inp, cur, { spec: 0, pet: 'auto' });
  let res = LOA.runSync(inp, cur, { tenacity: true, spec: 0, pet: 'auto' });
  T.ok('달인의 저력 체크 → 모든 추천 조합에 포함', all(res, p => p.build.engr.includes('tenacity')));
  res = LOA.runSync(inp, cur, { barricade: true, spec: 0, pet: 'auto' });
  T.ok('바리케이드 체크 → 모든 추천 조합에 포함', all(res, p => p.build.engr.includes('barricade')));
  res = LOA.runSync(inp, cur, { mass: true, spec: 0, pet: 'auto' });
  T.ok('질량 증가 체크 → 모든 추천 조합에 포함', all(res, p => p.build.engr.includes('mass')));
  T.ok('음속 돌파에서는 손해여도 포함 (체크 전 ' + top(none, 'sonic').ratio.toFixed(4) + ' → 체크 후 ' + top(res, 'sonic').ratio.toFixed(4) + ')',
    top(res, 'sonic').build.engr.includes('mass') && top(res, 'sonic').ratio < top(none, 'sonic').ratio && !top(none, 'sonic').build.engr.includes('mass'));
  T.ok('체크를 늘리면 최적값은 같거나 낮아짐 (제약이 늘어남)', ['thorn', 'stand', 'furnace'].every(t => {
    const three = LOA.runSync(inp, cur, { tenacity: true, barricade: true, mass: true, spec: 0, pet: 'auto' });
    return top(three, t).ratio <= top(res, t).ratio + 1e-12;
  }));
  res = LOA.runSync(inp, cur, { tenacity: true, barricade: true, mass: true, spec: 0, pet: 'auto' });
  T.ok('세 개 모두 체크 → 셋 다 포함, 남은 두 칸만 선택', all(res, p => ['tenacity', 'barricade', 'mass'].every(id => p.build.engr.includes(id)) && p.build.engr.length === 5));
  const st = Object.assign({}, inp, { stone: [{ id: 'blunt', lv: 3 }, { id: 'adrenaline', lv: 2 }] });
  res = LOA.runSync(st, cur, { tenacity: true, barricade: true, mass: true, spec: 0, pet: 'auto' });
  T.ok('스톤 2개 + 체크 3개 → 조합은 하나뿐', res.nSets === 1 && all(res, p => p.build.engr.slice().sort().join() === 'adrenaline,barricade,blunt,mass,tenacity'), 'nSets ' + res.nSets);
  T.ok('그 경우에도 5티어 4종 모두 결과', res.results.every(r => r.picks.length === 1 && Number.isFinite(r.picks[0].ratio)));
  const ov = Object.assign({}, inp, { stone: [{ id: 'mass', lv: 4 }, { id: 'tenacity', lv: 1 }] });
  res = LOA.runSync(ov, cur, { tenacity: true, mass: true, spec: 0, pet: 'auto' });
  T.ok('스톤과 체크가 겹치면 한 번만 셈', LOA.requiredEngr(ov, { tenacity: true, mass: true }).join() === 'mass,tenacity' && all(res, p => new Set(p.build.engr).size === 5));
  T.near('겹친 각인의 스톤 보너스는 그대로 적용 (질량 증가 19 + 6)', LOA.evalBuild(build({ engr: ['mass'] }), ov).rows[0].M / LOA.evalBuild(build({}), ov).rows[0].M, 1.25);
  T.ok('필수 목록 순서: 스톤 → 체크', LOA.requiredEngr(st, { barricade: true, tenacity: true }).join() === 'blunt,adrenaline,tenacity,barricade');
  T.ok('체크 없음·스톤 없음 → 필수 없음', LOA.requiredEngr(inp, {}).length === 0 && LOA.requiredEngr(inp, undefined).length === 0);
  T.ok('결과에 필수 목록 포함', res.required.join() === 'mass,tenacity' && res.forced.join() === 'mass,tenacity' && LOA.runSync(inp, cur, { barricade: true }).required.join() === 'barricade');
}

T.section('특화 고정 30 + 특화 펫');
{
  const cur = build({ engr: ['grudge', 'blunt', 'adrenaline', 'raid', 'doll'], t1: { crit: 0, spec: 30, swift: 10 }, pet: 'spec', t2: t2({ limit: 3 }), t3: t3({ allout: 2 }), t4: { crit: true, master: false, crush: true }, t5: { id: 'stand', lv: 2 } });
  for (let seed = 1; seed <= 6; seed++) {
    const R = rnd(4400 + seed), inp = randomInput(R);
    const res = LOA.runSync(inp, cur, { spec: 30, pet: 'spec' }), auto = LOA.runSync(inp, cur, { spec: 30, pet: 'auto' });
    const picks = res.results.flatMap(r => r.picks);
    T.ok(`seed ${seed}: 5티어 4종 모두 결과`, res.results.length === 4 && res.results.every(r => r.picks.length > 0));
    T.ok(`seed ${seed}: 특화 30 고정, 치명 + 신속 = 10`, picks.every(p => p.build.t1.spec === 30 && p.build.t1.crit + p.build.t1.swift === 10 && p.build.t1.crit >= 0 && p.build.t1.swift >= 0));
    T.ok(`seed ${seed}: 펫은 특화`, picks.every(p => p.build.pet === 'spec'));
    T.ok(`seed ${seed}: 치명 스탯 = 기본 + 50×포인트 (펫 160 미포함)`, picks.every(p => p.ev.ctx.critStat === inp.baseCrit + 50 * p.build.t1.crit));
    T.ok(`seed ${seed}: 신속 스탯 = 기본 + 50×포인트 (펫 160 미포함)`, picks.every(p => p.ev.ctx.swiftStat === inp.baseSwift + 50 * p.build.t1.swift));
    T.ok(`seed ${seed}: 결과가 유한한 양수`, picks.every(p => Number.isFinite(p.ratio) && p.ratio > 0));
    T.ok(`seed ${seed}: 펫을 치명·신속에 줄 수 있을 때보다 높지 않음`, res.results.every((r, i) => r.picks[0].ratio <= auto.results[i].picks[0].ratio + 1e-12));
    T.ok(`seed ${seed}: 현재 세팅이 같은 조건이면 최적은 1 이상`, Math.max(...res.results.map(r => r.picks[0].ratio)) >= 1 - 1e-12 || LOA.forcedEngr(inp).length > 0);
  }
}

T.section('각인 후보 가지치기의 무손실성 (전체 조합과 대조)');
{
  let cases = 0, okc = 0, worstGap = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const R = rnd(900 + seed), inp = randomInput(R);
    const opts = { tenacity: R() < 0.6, barricade: R() < 0.6, mass: R() < 0.4, spec: 0, pet: 'auto' };
    const forced = LOA.requiredEngr(inp, opts), act = inp.skills.filter(s => s.share > 0);
    const cur = randomBuild(R, LOA.ENGR_ORDER), evC = LOA.evalBuild(cur, inp);
    const pruned = LOA.engravingSets(inp, opts, act);
    const allowed = LOA.ENGR_ORDER.filter(id => forced.includes(id) || !(id === 'stable' || (id === 'tenacity' && !opts.tenacity) || (id === 'barricade' && !opts.barricade)));
    const free = allowed.filter(id => !forced.includes(id));
    const full = combos(free, 5 - forced.length).map(c => forced.concat(c));
    const massFree = opts.mass || forced.includes('mass');
    const bestOver = (sets, b) => {
      let best = 0;
      for (const engr of sets) {
        const bb = Object.assign({}, b, { engr }), ev = LOA.evalBuild(bb, inp);
        if (engr.includes('mass') && !massFree && ev.ctx.AS < 40 - EPS) continue;
        const r = LOA.compare(inp, ev, evC).ratio;
        if (r > best) best = r;
      }
      return best;
    };
    for (let n = 0; n < 25; n++) {
      const b = randomBuild(R, LOA.ENGR_ORDER);
      b.t5 = { id: ['thorn', 'sonic', 'stand', 'furnace'][n % 4], lv: 2 };
      b.pet = n % 2 ? 'crit' : 'swift';
      const f = bestOver(full, b), p = bestOver(pruned, b);
      cases++; worstGap = Math.max(worstGap, f - p);
      if (f - p <= 1e-12) okc++;
    }
    T.ok(`seed ${seed}: 전체 ${full.length}개 조합 vs 가지치기 후 ${pruned.length}개 — 최댓값 동일`, okc === cases, `차이 ${worstGap}`);
  }
}

T.section('완전 전수 대조 (엔진과 무관하게 다시 열거한 모든 조합)');
{
  // 엔진의 열거 코드에 기대지 않고 진화 조합을 직접 만든다
  const T2s = [], T3s = [], T4s = [{ crit: true, master: true, crush: false }, { crit: true, master: false, crush: true }, { crit: false, master: true, crush: true }];
  for (let a = 0; a <= 2; a++) for (let b = 0; b <= 2; b++) for (let c = 0; c <= 2; c++) for (let d = 0; d <= 3; d++) for (let e = 0; e <= 2; e++)
    if (a + b + c + d + e === 3) T2s.push({ endless: a, forbidden: b, keen: c, limit: d, optim: e });
  for (let a = 0; a <= 2; a++) for (let b = 0; b <= 2; b++) for (let c = 0; c <= 2; c++) for (let d = 0; d <= 2; d++) for (let e = 0; e <= 2; e++)
    if (a + b + c + d + e === 2) T3s.push({ infinite: a, allout: b, strike: c, tank: d, timing: e });
  T.ok('2티어 조합 31개', T2s.length === 31);
  T.ok('3티어 조합 15개', T3s.length === 15);
  const scenarios = [
    { name: '비방향성 3스킬', spec: 30, inp: baseInp({ baseCrit: 150, baseSwift: 120, extraAS: 12, extraMS: 15, otherAdd: 30, karma: 6, syn10: true,
        stone: [{ id: 'blunt', lv: 3 }, { id: 'grudge', lv: 2 }],
        skills: [skill({ share: 50, r: 90, cr: 20 }), skill({ share: 30, r: 60, cd: 40 }), skill({ share: 20, r: 100, type: 'awakening' })] }) },
    { name: '백어택·마나·차지 혼합', spec: 28, inp: baseInp({ baseCrit: 60, baseSwift: 300, extraAS: 25, extraMS: 28, otherAdd: 25, otherH: 1.1, karma: 3,
        bracelet: { grade: 'ancient', slots: [{ id: 'crH', tier: 2 }, { id: 'speed', tier: 1 }] }, stone: [{ id: 'adrenaline', lv: 4 }, { id: 'ambush', lv: 1 }],
        skills: [skill({ share: 45, r: 95, dir: 'back', p: 70, mana: 420, cr: 30 }), skill({ share: 35, r: 80, mana: 250, charge: true }), skill({ share: 20, r: 40, type: 'hyper', mana: 600 })] }) },
    { name: '특화 30 + 특화 펫', spec: 30, pets: ['spec'], petOpt: 'spec', inp: baseInp({ baseCrit: 210, baseSwift: 180, extraAS: 20, extraMS: 22, otherAdd: 28, otherCD: 6, karma: 6, syn10: true,
        bracelet: { grade: 'ancient', slots: [{ id: 'cdH', tier: 1 }] }, stone: [{ id: 'grudge', lv: 4 }, { id: 'dagger', lv: 2 }],
        skills: [skill({ share: 40, r: 85, cr: 15, dir: 'head', p: 75 }), skill({ share: 35, r: 70, mana: 380, hold: true }), skill({ share: 15, r: 100, type: 'awakening' }), skill({ share: 10, r: 0, type: 'identity', cd: 30 })] }) }
  ];
  for (const sc of scenarios) {
    const inp = sc.inp, opts = { spec: sc.spec, pet: sc.petOpt || 'auto' };
    const cur = build({ engr: ['grudge', 'blunt', 'adrenaline', 'raid', 'doll'], t1: { crit: 5, spec: sc.spec, swift: 40 - sc.spec - 5 }, pet: 'crit',
      t2: t2({ limit: 3 }), t3: t3({ allout: 2 }), t4: { crit: true, master: false, crush: true }, t5: { id: 'stand', lv: 2 } });
    const evC = LOA.evalBuild(cur, inp), sets = LOA.engravingSets(inp, opts, inp.skills);
    const forced = LOA.forcedEngr(inp), rem = 40 - sc.spec, sum = inp.skills.reduce((a, s) => a + s.share, 0);
    const t0 = Date.now(), best = { thorn: 0, sonic: 0, stand: 0, furnace: 0 };
    let count = 0;
    for (const t5 of Object.keys(best)) for (const a of T2s) for (const b of T3s) for (const c of T4s)
      for (let cr = Math.max(0, rem - 30); cr <= Math.min(30, rem); cr++) for (const pet of (sc.pets || ['crit', 'swift'])) for (const engr of sets) {
        const ev = LOA.evalBuild({ engr, t1: { crit: cr, swift: rem - cr, spec: sc.spec }, pet, t2: a, t3: b, t4: c, t5: { id: t5, lv: 2 } }, inp);
        if (engr.includes('mass') && !forced.includes('mass') && ev.ctx.AS < 40 - EPS) continue;
        let tot = 0;
        for (let i = 0; i < inp.skills.length; i++) {
          const s = inp.skills[i];
          tot += s.share * (ev.rows[i].M / evC.rows[i].M) / (1 - s.r / 100 * (1 - ev.rows[i].cdf / evC.rows[i].cdf));
        }
        tot /= sum; count++;
        if (tot > best[t5]) best[t5] = tot;
      }
    const res = LOA.runSync(inp, cur, opts);
    T.ok(`${sc.name}: 조합 ${count.toLocaleString()}개 전수 계산 (${((Date.now() - t0) / 1000).toFixed(1)}초)`, count > 2e5);
    for (const r of res.results) T.near(`${sc.name} ${r.t5}: 최적값 일치 (${r.picks[0].ratio.toFixed(6)})`, r.picks[0].ratio, best[r.t5], 1e-10);
  }
}

// ───────────────────────── 6. 시뮬레이션 ─────────────────────────
T.section('난수 시뮬레이션: 치명·다중 치명 기대값');
{
  const N = 400000;
  const simCrit = (cr, cd, H, R) => {
    let sum = 0;
    for (let i = 0; i < N; i++) { let k = Math.floor(cr); if (R() < cr - k) k++; sum += k === 0 ? 1 : (1 + k * (cd - 1)) * (1 + H); }
    return sum / N;
  };
  const cases = [[0.35, 2.0, 0], [0.6, 2.5, 0.12], [0.8, 2.52, 0.1368], [1.0, 2.0, 0.12], [1.2, 2.5, 0], [1.2, 2.5, 0.12], [1.75, 3.0, 0.015], [2.3, 2.0, 0], [2.6, 2.7, 0.1368]];
  cases.forEach(([cr, cd, H], i) => {
    const sim = simCrit(cr, cd, H, rnd(7000 + i)), exact = LOA.critMult(cr, cd, H);
    T.ok(`치적 ${cr * 100}% 치피 ${cd * 100}% 치명 시 피해 ${(H * 100).toFixed(2)}%: 실험 ${sim.toFixed(4)} / 식 ${exact.toFixed(4)}`, Math.abs(sim / exact - 1) < 0.004, `오차 ${((sim / exact - 1) * 100).toFixed(3)}%`);
  });
  // 스킬 한 발 전체를 규칙 문장 그대로 흉내: 백어택 성공 여부, 뭉가 전환, 기습의 대가, 회심
  const simSkill = (o, R) => {
    let sum = 0;
    for (let i = 0; i < N; i++) {
      const succ = R() < o.p;
      let cr = o.cr + (succ ? 10 : 0), evo = o.evo;
      if (o.thorn) { evo += 19 + 1.4 * Math.max(0, cr - 80); cr = Math.min(cr, 80); }
      let k = Math.floor(cr / 100); if (R() < cr / 100 - k) k++;
      let d = (1 + evo / 100) * (k === 0 ? 1 : (1 + k * (o.cd / 100 - 1)) * (o.heart ? 1.12 : 1));
      if (succ) d *= 1.05;
      if (o.ambush) d *= 1 + (7.6 + (succ ? 15 : 0)) / 100;
      sum += d;
    }
    return sum / N;
  };
  const sk = [{ p: 0.7, cr: 85, cd: 250, evo: 52, thorn: true, heart: true, ambush: true }, { p: 0.4, cr: 115, cd: 230, evo: 40, thorn: false, heart: true, ambush: true },
    { p: 1, cr: 60, cd: 200, evo: 30, thorn: true, heart: false, ambush: false }, { p: 0.5, cr: 140, cd: 260, evo: 60, thorn: true, heart: true, ambush: false }];
  sk.forEach((o, i) => {
    const inp = baseInp({ otherCR: o.cr, otherCD: o.cd - 200, otherEvo: o.evo - 12, skills: [skill({ share: 100, dir: 'back', p: o.p * 100 })] });
    const b = build({ engr: o.ambush ? ['ambush'] : [], t4: { crit: o.heart, master: false, crush: false }, t5: o.thorn ? { id: 'thorn', lv: 2 } : { id: 'none', lv: 0 } });
    const exact = LOA.evalBuild(b, inp).rows[0].M, sim = simSkill(o, rnd(8000 + i));
    T.ok(`스킬 시나리오 ${i + 1} (백 ${o.p * 100}%, 치적 ${o.cr}, ${o.thorn ? '뭉가' : '비뭉가'}): 실험 ${sim.toFixed(4)} / 엔진 ${exact.toFixed(4)}`, Math.abs(sim / exact - 1) < 0.004, `오차 ${((sim / exact - 1) * 100).toFixed(3)}%`);
  });
}

T.section('타임라인 시뮬레이션: 쿨타임과 사용 횟수');
{
  const uses = (CD, w, Tend) => { let t = 0, n = 0; while (t <= Tend) { n++; t += CD + w; } return n; };
  for (const [CD, w, rho] of [[20, 5, 0.8], [30, 0, 0.9], [12, 12, 0.7], [45, 3, 0.6], [8, 40, 0.5], [24, 6, 1.1]]) {
    const r = CD / (CD + w), sim = uses(CD * rho, w, 5e6) / uses(CD, w, 5e6), exact = LOA.useGain(r, rho);
    T.ok(`쿨 ${CD}초·대기 ${w}초(소화 ${(r * 100).toFixed(0)}%)·쿨 ${rho}배: 실험 ${sim.toFixed(5)} / 식 ${exact.toFixed(5)}`, Math.abs(sim / exact - 1) < 1e-4);
    // 바뀐 뒤의 소화 비율도 식과 일치하는지
    const r2 = (CD * rho) / (CD * rho + w);
    T.near(`  └ 바뀐 뒤 소화 비율 ${(r2 * 100).toFixed(2)}%`, r * rho / (1 - r * (1 - rho)), r2, 1e-12);
  }
}

// ───────────────────────── 7. 견고성·성능 ─────────────────────────
T.section('비정상 입력에 대한 견고성');
{
  const cur = build({ engr: ['grudge', 'blunt', 'adrenaline', 'raid', 'doll'], t1: { crit: 30, spec: 0, swift: 10 }, pet: 'crit', t2: t2({ limit: 3 }), t3: t3({ allout: 2 }), t4: { crit: true, master: false, crush: true }, t5: { id: 'stand', lv: 2 } });
  const good = baseInp({ skills: [skill({ share: 60, r: 80 }), skill({ share: 40, r: 50, dir: 'back', p: 70, mana: 200 })] });
  const run = (inp, c, o) => { try { const res = LOA.runSync(inp, c || cur, o || { spec: 0, pet: 'auto' }); return { res, ok: res.results.every(r => r.picks.every(p => Number.isFinite(p.ratio) && p.ratio > 0)) }; } catch (e) { return { err: e.message, ok: false }; } };
  const weird = ['', null, undefined, 'abc', NaN, Infinity, -50, 1e9];
  for (const k of ['baseCrit', 'baseSwift', 'extraAS', 'extraMS', 'otherCR', 'otherCD', 'otherAdd', 'otherAtk', 'otherH', 'karma', 'otherEvo'])
    for (const v of weird) { const r = run(Object.assign({}, good, { [k]: v })); T.ok(`${k} = ${String(v)}`, r.ok, r.err); }
  for (const k of ['share', 'r', 'cr', 'cd', 'p', 'mana'])
    for (const v of weird) {
      const inp = Object.assign({}, good, { skills: [Object.assign({}, good.skills[0]), Object.assign({}, good.skills[1], { [k]: v })] });
      const r = run(inp); T.ok(`스킬 ${k} = ${String(v)}`, r.ok || (r.res && r.res.results.length === 0), r.err);
    }
  let r = run(Object.assign({}, good, { skills: good.skills.map(s => Object.assign({}, s, { share: 0 })) }));
  T.ok('모든 지분 0 → 빈 결과, 오류 없음', !r.err && r.res.results.length === 0, r.err);
  r = run(Object.assign({}, good, { skills: [] }));
  T.ok('스킬 없음 → 빈 결과', !r.err && r.res.results.length === 0, r.err);
  r = run(Object.assign({}, good, { stone: [{ id: 'zzz', lv: 9 }, { id: 'grudge', lv: -3 }] }));
  T.ok('알 수 없는 스톤 각인·범위 밖 레벨', r.ok, r.err);
  r = run(Object.assign({}, good, { stone: [{ id: 'grudge', lv: 99 }] }));
  T.ok('스톤 레벨 99는 Lv4로 취급', r.ok && LOA.stoneBonus({ stone: [{ id: 'grudge', lv: 99 }] }, 'grudge') === 6);
  r = run(Object.assign({}, good, { bracelet: { grade: 'mythic', slots: [{ id: 'nope', tier: 7 }, { id: 'crH', tier: -2 }, null] } }));
  T.ok('알 수 없는 팔찌 등급·옵션·수치', r.ok, r.err);
  r = run(Object.assign({}, good, { bracelet: undefined, stone: undefined }));
  T.ok('팔찌·스톤 정보 없음', r.ok, r.err);
  r = run(good, Object.assign({}, cur, { engr: ['none', 'zzz', undefined] }));
  T.ok('현재 세팅에 알 수 없는 각인', r.ok, r.err);
  r = run(good, Object.assign({}, cur, { engr: [] , t5: { id: 'none', lv: 0 } }));
  T.ok('현재 세팅에 각인·5티어 없음', r.ok, r.err);
  r = run(good, Object.assign({}, cur, { t5: undefined }));
  T.ok('현재 세팅 5티어 정보 누락', r.ok, r.err);
  r = run(good, cur, { spec: 99, pet: 'auto' });
  T.ok('특화 고정 99 → 30으로 제한', r.ok && r.res.results[0].picks[0].build.t1.spec === 30, r.err);
  r = run(good, cur, { spec: -5, pet: 'auto' });
  T.ok('특화 고정 음수 → 0', r.ok && r.res.results[0].picks[0].build.t1.spec === 0, r.err);
  r = run(good, cur, undefined);
  T.ok('옵션 생략', r.ok, r.err);
  r = run(Object.assign({}, good, { baseSwift: 6000 }));
  T.ok('신속 6000 (쿨감 100% 초과)에서도 유한한 결과', r.ok, r.err || 'ratio ' + (r.res && r.res.results[0].picks[0].ratio));
  r = run(Object.assign({}, good, { skills: good.skills.map(s => Object.assign({}, s, { r: 100 })), baseSwift: 4600 }));
  T.ok('소화 비율 100% + 극단적 신속', r.ok, r.err);
  r = run(Object.assign({}, good, { otherCR: 900, otherCD: 900 }));
  T.ok('치적 900% (9중 치명)', r.ok, r.err);
  r = run(Object.assign({}, good, { otherCR: -500 }));
  T.ok('치적 음수 → 0으로 취급', r.ok && LOA.evalBuild(cur, Object.assign({}, good, { otherCR: -500 })).rows[0].hit === 0, r.err);
  r = run(Object.assign({}, good, { skills: [skill({ share: 100, r: 250, p: 300, dir: 'back' })] }));
  T.ok('소화 비율 250%, 성공률 300% → 100으로 제한', r.ok, r.err);
  r = run(Object.assign({}, good, { skills: [skill({ share: 100, dir: 'sideways', type: 'mystery' })] }));
  T.ok('알 수 없는 방향·스킬 종류', r.ok, r.err);
}

T.section('성능');
{
  const sk = (o) => skill(Object.assign({ share: 10, r: 80 }, o));
  const inp = baseInp({ baseCrit: 100, baseSwift: 100, extraAS: 10, extraMS: 10, otherAdd: 30, karma: 6,
    skills: [sk({ dir: 'back', p: 80, charge: true, mana: 300 }), sk({ dir: 'head', p: 80, hold: true, mana: 200 }), sk({ mana: 100 }), sk({ dir: 'back', p: 60 }), sk({ dir: 'head', p: 60 }),
      sk({ charge: true }), sk({ hold: true }), sk({}), sk({ type: 'hyper', mana: 400 }), sk({ type: 'identity', r: 0 }), sk({ type: 'awakening' })] });
  const cur = build({ engr: ['grudge', 'blunt', 'adrenaline', 'raid', 'doll'], t1: { crit: 30, spec: 0, swift: 10 }, pet: 'crit', t2: t2({ limit: 3 }), t3: t3({ allout: 2 }), t4: { crit: true, master: false, crush: true }, t5: { id: 'stand', lv: 2 } });
  let t0 = Date.now(); let res = LOA.runSync(inp, cur, { tenacity: true, barricade: true, mass: true, spec: 0, pet: 'auto' });
  let ms = Date.now() - t0;
  T.ok(`최악 조건 (각인 조합 ${res.nSets}개 × 진화 ${(res.nEvo * 4).toLocaleString()}개): ${ms}ms`, ms < 15000);
  const typ = Object.assign({}, inp, { stone: [{ id: 'grudge', lv: 3 }, { id: 'blunt', lv: 2 }] });
  t0 = Date.now(); res = LOA.runSync(typ, cur, { spec: 0, pet: 'auto' }); ms = Date.now() - t0;
  T.ok(`일반 조건 (스톤 있음, 각인 조합 ${res.nSets}개): ${ms}ms`, ms < 4000);
  let steps = 0, last = -1, mono = true;
  for (const v of LOA.optimize(typ, cur, { spec: 0, pet: 'auto' })) { steps++; if (v < last || v < 0 || v > 1) mono = false; last = v; }
  T.ok(`진행률이 0~1 사이에서 단조 증가 (${steps}회 보고, 마지막 ${last.toFixed(3)})`, mono && steps > 50 && last > 0.99);
}

T.done();

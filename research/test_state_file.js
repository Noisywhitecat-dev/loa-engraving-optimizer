// 입력 상태의 검증(sanitize)과 저장 파일(저장·불러오기) 테스트.  실행: node research/test_state_file.js
const { LOA, rnd, makeReporter } = require('./_load.js');
const T = makeReporter('입력 검증·저장 파일');
const J = x => JSON.stringify(x);
const clone = x => JSON.parse(JSON.stringify(x));
const NOW = new Date('2026-11-21T03:04:05.000Z');

// 객체의 키 구조와 값 종류를 문자열로 (기본값과 같은 모양인지 비교용)
const shape = (x) => Array.isArray(x) ? '[' + x.map(shape).join(',') + ']' : (x && typeof x === 'object')
  ? '{' + Object.keys(x).map(k => k + ':' + shape(x[k])).join(',') + '}' : typeof x;
const SHAPE = shape(LOA.defaults());
const ENGR_IDS = ['none'].concat(LOA.ENGR_ORDER), BR_IDS = Object.keys(LOA.BRACELET), T5_IDS = ['none'].concat(Object.keys(LOA.T5));

// 화면에서 만들 수 있는 정상 상태를 무작위로
function randomState(R) {
  const s = LOA.defaults(), pickOf = a => a[Math.floor(R() * a.length)], n = (lo, hi) => Math.round((lo + R() * (hi - lo)) * 10) / 10;
  s.label = pickOf(['', '기상술사 질풍', '버서커(광기)', 'Sorceress 점화', '블레이드 버스트 #2', '창술사_절정']);
  ['baseCrit', 'baseSwift'].forEach(k => { s[k] = Math.round(R() * 800); });
  ['extraAS', 'extraMS'].forEach(k => { s[k] = n(-12, 40); });
  ['otherCR', 'otherCD', 'otherAdd', 'otherAtk', 'otherH', 'otherEvo'].forEach(k => { s[k] = n(0, 40); });
  s.karma = Math.floor(R() * 7); s.syn10 = R() < 0.5; s.syn20 = R() < 0.3;
  s.bracelet = { grade: pickOf(['ancient', 'relic']), slots: [0, 1, 2].map(() => ({ id: pickOf(BR_IDS), tier: Math.floor(R() * 3) })) };
  s.stone = [0, 1].map(() => ({ id: pickOf(ENGR_IDS), lv: Math.floor(R() * 5) }));
  s.skills.forEach((k, i) => {
    const awk = k.type === 'awakening';
    k.name = pickOf(['스킬 ' + (i + 1), '폭풍의 눈', '<b>굵게</b>', '   공백  ', 'Skill "A" & B', '가'.repeat(40)]);
    k.share = n(0, 30); k.r = n(0, 100); k.cr = n(0, 80); k.cd = n(0, 100); k.p = n(0, 100);
    k.dir = awk ? 'none' : pickOf(['none', 'back', 'head']); k.charge = !awk && R() < 0.3; k.hold = !awk && R() < 0.3; k.mana = awk ? 0 : Math.round(R() * 700);
  });
  const lv = (def) => { const o = {}; Object.keys(def).forEach(k => { o[k] = Math.floor(R() * (def[k].max + 1)); }); return o; };
  const fl = (def) => { const o = {}; Object.keys(def).forEach(k => { o[k] = R() < 0.5; }); return o; };
  s.cur = { engr: [0, 1, 2, 3, 4].map(() => pickOf(ENGR_IDS)), t1: { crit: Math.floor(R() * 31), spec: Math.floor(R() * 31), swift: Math.floor(R() * 31) },
            pet: pickOf(['crit', 'swift', 'spec']), t2: lv(LOA.T2), t3: lv(LOA.T3), t4: fl(LOA.T4), t5: { id: pickOf(T5_IDS), lv: 1 + Math.floor(R() * 2) } };
  s.opt = { tenacity: R() < 0.5, barricade: R() < 0.5, mass: R() < 0.5 };
  s.fix = { t1: { crit: Math.floor(R() * 31), spec: Math.floor(R() * 31), swift: Math.floor(R() * 31) }, pet: pickOf(['auto', 'crit', 'swift', 'spec']),
            t2: lv(LOA.T2), t3: lv(LOA.T3), t4: fl(LOA.T4), t5: pickOf(['auto'].concat(Object.keys(LOA.T5))) };
  return s;
}
const fileOf = (s) => JSON.parse(LOA.packFile(s, NOW));
const load = (obj) => LOA.unpackFile(typeof obj === 'string' ? obj : JSON.stringify(obj));

// ───────── 1. 기본값과 검증 ─────────
T.section('기본값과 검증의 기본 성질');
{
  const d = LOA.defaults();
  T.ok('기본값: 스킬 11행, 종류는 일반 8 + 초각성 + 아이덴티티 + 각성기', d.skills.map(s => s.type).join() === 'normal,normal,normal,normal,normal,normal,normal,normal,hyper,identity,awakening');
  T.ok('기본값은 매번 새 객체 (서로 영향 없음)', (() => { const a = LOA.defaults(); a.skills[0].share = 99; a.cur.t2.limit = 0; return LOA.defaults().skills[0].share === 11 && LOA.defaults().cur.t2.limit === 3; })());
  T.ok('기본값을 검증해도 그대로', J(LOA.sanitize(d)) === J(d));
  T.ok('검증 결과는 입력과 다른 새 객체', LOA.sanitize(d) !== d && LOA.sanitize(d).skills !== d.skills);
  for (const bad of [null, undefined, 0, 'x', true, [], {}, { skills: [] }, { skills: d.skills, cur: d.cur }, { skills: d.skills, opt: d.opt },
    { skills: d.skills.slice(0, 10), cur: d.cur, opt: d.opt }, { skills: d.skills.concat(d.skills[0]), cur: d.cur, opt: d.opt }, { skills: 'x'.repeat(11), cur: d.cur, opt: d.opt },
    { skills: d.skills, cur: [], opt: d.opt }, { skills: d.skills, cur: d.cur, opt: 'x' }])
    T.ok(`형식이 아닌 값은 거부: ${String(J(bad)).slice(0, 40)}`, LOA.sanitize(bad) === null);
  let idem = 0, same = 0, shp = 0;
  for (let i = 0; i < 200; i++) {
    const s = randomState(rnd(100 + i)), a = LOA.sanitize(s);
    if (J(LOA.sanitize(a)) === J(a)) idem++;
    if (J(a) === J(s)) same++;
    if (shape(a) === SHAPE) shp++;
  }
  T.ok(`정상 상태 200건: 검증해도 값이 바뀌지 않음 (${same})`, same === 200);
  T.ok(`검증을 두 번 해도 같음 (${idem})`, idem === 200);
  T.ok(`검증 결과의 구조가 기본값과 같음 (${shp})`, shp === 200);
}

// ───────── 2. 저장 → 불러오기 왕복 ─────────
T.section('저장 파일 왕복');
{
  const f = fileOf(LOA.defaults());
  T.ok('파일 머리 정보: app, version, savedAt, label, data', Object.keys(f).join() === 'app,version,savedAt,label,data' && f.app === 'loa-engraving-optimizer' && f.version === 1 && f.savedAt === NOW.toISOString());
  T.ok('사람이 읽을 수 있게 들여쓰기된 JSON', LOA.packFile(LOA.defaults(), NOW).includes('\n  "data": {'));
  T.ok('파일 크기는 수 KB', LOA.packFile(LOA.defaults(), NOW).length < 20000);
  let ok = 0, lab = 0, stable = 0;
  for (let i = 0; i < 300; i++) {
    const s = randomState(rnd(500 + i)), text = LOA.packFile(s, NOW), r = LOA.unpackFile(text);
    if (r.ok && J(r.state) === J(s)) ok++;
    if (r.ok && JSON.parse(text).label === s.label && r.state.label === s.label && r.savedAt === NOW.toISOString() && r.newer === false) lab++;
    if (r.ok && LOA.packFile(r.state, NOW) === text) stable++;
  }
  T.ok(`무작위 상태 300건: 저장 후 불러오면 모든 값이 동일 (${ok})`, ok === 300);
  T.ok(`기록 이름·저장 시각 보존 (${lab})`, lab === 300);
  T.ok(`불러온 것을 다시 저장하면 같은 파일 (${stable})`, stable === 300);
  let same = 0, ran = 0;
  for (let i = 0; i < 6; i++) {
    const s = randomState(rnd(900 + i)); s.fix = LOA.defaults().fix; s.skills.forEach(k => { k.share = Math.max(1, k.share); });
    const back = LOA.unpackFile(LOA.packFile(s, NOW)).state;
    const run = st => { const cur = Object.assign({}, st.cur, { engr: st.cur.engr.filter(id => LOA.ENGR[id]) }); return LOA.runSync(st, cur, Object.assign({}, st.opt, { fix: st.fix })); };
    const a = run(s), b = run(back); ran++;
    if (J(a.results.map(r => r.picks.map(p => [p.build, p.ratio]))) === J(b.results.map(r => r.picks.map(p => [p.build, p.ratio]))) && a.results.length === 4) same++;
  }
  T.ok(`왕복 전후의 추천 결과가 완전히 동일 (${same}/${ran})`, same === ran);
  const withBom = '\uFEFF' + LOA.packFile(randomState(rnd(1)), NOW);
  T.ok('BOM이 붙은 파일도 읽음', LOA.unpackFile(withBom).ok);
  const newer = fileOf(LOA.defaults()); newer.version = 7; newer.futureField = { a: 1 };
  T.ok('더 새 버전 파일: 읽되 표시', load(newer).ok && load(newer).newer === true);
  const lg = fileOf(LOA.defaults()); delete lg.data.fix; delete lg.data.label; delete lg.data.otherH; lg.data.asm = { hAdd: true }; lg.data.opt.spec = 7; lg.data.opt.pet = 'spec';
  const lr = load(lg);
  T.ok('이전 형식 파일: 특화 고정·펫 설정을 고정 메뉴로 옮기고 없는 칸은 기본값', lr.ok && lr.state.fix.t1.spec === 7 && lr.state.fix.pet === 'spec' && lr.state.otherH === 0 && lr.state.label === '' && lr.state.asm === undefined && lr.state.opt.spec === undefined);
}

// ───────── 3. 형식이 아닌 파일 ─────────
T.section('형식이 아닌 파일은 거부');
{
  const good = fileOf(LOA.defaults());
  const cases = [
    ['빈 파일', '', '비어'], ['공백뿐', '  \n\t ', '비어'], ['글자', 'hello world', 'JSON'], ['잘린 JSON', LOA.packFile(LOA.defaults(), NOW).slice(0, 500), 'JSON'],
    ['뒤에 쓰레기', LOA.packFile(LOA.defaults(), NOW) + 'x', 'JSON'], ['숫자', '123', '저장 파일이 아닙니다'], ['문자열', '"abc"', '저장 파일이 아닙니다'],
    ['null', 'null', '저장 파일이 아닙니다'], ['배열', '[]', '저장 파일이 아닙니다'], ['빈 객체', '{}', '저장 파일이 아닙니다'],
    ['다른 프로그램', J(Object.assign({}, good, { app: 'other-app' })), '저장 파일이 아닙니다'], ['app 없음', J({ version: 1, data: good.data }), '저장 파일이 아닙니다'],
    ['app이 배열', J(Object.assign({}, good, { app: ['loa-engraving-optimizer'] })), '저장 파일이 아닙니다'],
    ['data 없음', J({ app: good.app, version: 1 }), '저장 파일이 아닙니다'], ['data가 배열', J(Object.assign({}, good, { data: [good.data] })), '저장 파일이 아닙니다'],
    ['data가 문자열', J(Object.assign({}, good, { data: J(good.data) })), '저장 파일이 아닙니다'],
    ['스킬 3행', J(Object.assign({}, good, { data: Object.assign({}, good.data, { skills: good.data.skills.slice(0, 3) }) })), '내용이 올바르지'],
    ['스킬 없음', J(Object.assign({}, good, { data: Object.assign({}, good.data, { skills: undefined }) })), '내용이 올바르지'],
    ['현재 세팅 없음', J(Object.assign({}, good, { data: Object.assign({}, good.data, { cur: null }) })), '내용이 올바르지'],
    ['1MB 초과', J(Object.assign({}, good, { pad: 'x'.repeat(1024 * 1024) })), '너무 큽니다']
  ];
  for (const [name, text, word] of cases) { const r = LOA.unpackFile(text); T.ok(`${name} → 거부 ("${r.error}")`, r.ok === false && r.state === undefined && r.error.includes(word)); }
  for (const v of [undefined, null, 5, {}, [], true]) T.ok(`글자가 아닌 입력(${J(v)}) → 거부`, LOA.unpackFile(v).ok === false);
  let threw = false, r;
  try { r = LOA.unpackFile('['.repeat(200000) + ']'.repeat(200000)); } catch (e) { threw = true; }
  T.ok('극단적으로 깊게 중첩된 JSON에도 예외 없이 거부', !threw && r.ok === false);
  T.ok('1MB 바로 아래의 군더더기는 허용하고 버림', (() => { const x = Object.assign({}, good, { pad: 'x'.repeat(1000000) }); const q = load(x); return q.ok && J(q.state) === J(LOA.defaults()); })());
}

// ───────── 4. 손상·악의적 내용 ─────────
T.section('프로토타입 오염 시도');
{
  const base = LOA.packFile(LOA.defaults(), NOW);
  const inject = [
    base.replace('"data": {', '"__proto__": {"polluted": 1}, "data": {'),
    base.replace('"data": {', '"data": {"__proto__": {"polluted": 1, "skills": []},'),
    base.replace('"cur": {', '"cur": {"__proto__": {"polluted": 1}, "constructor": {"prototype": {"polluted": 1}},'),
    base.replace('"opt": {', '"opt": {"__proto__": {"mass": true, "polluted": 1},'),
    base.replace('"fix": {', '"fix": {"__proto__": {"t5": "thorn", "polluted": 1}, "constructor": {"prototype": {"polluted": 1}},'),
    base.replace('"name": "스킬 1",', '"name": "스킬 1", "__proto__": {"polluted": 1, "share": 99}, "constructor": {"prototype": {"polluted": 1}},'),
    base.replace('"t2": {', '"t2": {"__proto__": {"limit": 3, "polluted": 1},')
  ];
  inject.forEach((text, i) => {
    const r = LOA.unpackFile(text);
    T.ok(`시도 ${i + 1}: 읽기는 되지만 오염 없음`, r.ok && ({}).polluted === undefined && Object.prototype.polluted === undefined && [].polluted === undefined && r.state.polluted === undefined);
    T.ok(`시도 ${i + 1}: 결과 구조가 기본값과 동일, 값도 기본값`, shape(r.state) === SHAPE && J(r.state) === J(LOA.defaults()));
    T.ok(`시도 ${i + 1}: 결과 객체는 모두 평범한 객체`, [r.state, r.state.cur, r.state.opt, r.state.fix, r.state.fix.t2, r.state.skills[0], r.state.bracelet].every(o => Object.getPrototypeOf(o) === Object.prototype));
  });
  T.ok('Object.prototype에 새 속성이 생기지 않음', Object.keys(Object.prototype).length === 0);
}

T.section('모르는 항목은 버리고, 틀린 형식은 기본값으로');
{
  const f = fileOf(LOA.defaults());
  Object.assign(f.data, { evil: '<script>alert(1)</script>', onload: 'x', __html: '<img>', results: [1, 2, 3] });
  f.data.cur.extra = { a: 1 }; f.data.cur.t2.hack = 3; f.data.skills[0].onclick = 'alert(1)'; f.data.skills[0].extra = [1];
  f.data.fix.t2.hack = 2; f.data.fix.t9 = {}; f.data.opt.spec = 5; f.data.opt.evil = true; f.data.bracelet.slots[0].extra = 1; f.data.stone[0].x = 1; f.data.bracelet.slots.push({ id: 'crH', tier: 2 });
  f.data.stone.push({ id: 'grudge', lv: 4 }); f.data.cur.engr.push('grudge');
  const r = load(f);
  T.ok('모르는 항목이 섞여 있어도 읽음', r.ok);
  T.ok('모르는 항목은 전부 버려짐 (구조가 기본값과 동일)', shape(r.state) === SHAPE && J(r.state) === J(LOA.defaults()));

  const d = LOA.defaults(), junk = [null, 'abc', '', {}, [], true, false, [1, 2], { a: { b: 1 } }, -0, 1e999, -1e999];
  const paths = ['label', 'baseCrit', 'extraAS', 'otherH', 'karma', 'syn10', 'bracelet', 'bracelet.grade', 'bracelet.slots', 'bracelet.slots.0', 'bracelet.slots.0.id', 'bracelet.slots.1.tier',
    'stone', 'stone.0', 'stone.0.id', 'stone.1.lv', 'skills.0', 'skills.0.name', 'skills.0.share', 'skills.3.r', 'skills.3.dir', 'skills.3.p', 'skills.3.charge', 'skills.8.mana', 'skills.10.type',
    'cur.engr', 'cur.engr.2', 'cur.t1', 'cur.t1.crit', 'cur.pet', 'cur.t2', 'cur.t2.limit', 'cur.t3.strike', 'cur.t4', 'cur.t4.crit', 'cur.t5', 'cur.t5.id', 'cur.t5.lv',
    'opt.tenacity', 'opt.mass', 'fix', 'fix.t1', 'fix.t1.spec', 'fix.pet', 'fix.t2', 'fix.t2.endless', 'fix.t3.strike', 'fix.t4', 'fix.t4.master', 'fix.t5'];
  const setPath = (o, p, v) => { const ks = p.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  let n = 0, okShape = 0, okFinite = 0;
  for (const p of paths) for (const v of junk) {
    const g = clone(fileOf(d)); setPath(g.data, p, v);
    const text = JSON.stringify(g).replace(/:null(?=[,}])/g, m => m);   // 1e999는 JSON으로 쓰면 null이 되므로 아래에서 따로 다룬다
    const q = LOA.unpackFile(text); n++;
    if (q.ok && shape(q.state) === SHAPE) okShape++;
    if (q.ok && J(q.state).length < 6000 && !/null|NaN|Infinity/.test(J(q.state))) okFinite++;
  }
  T.ok(`${paths.length}개 항목 × 엉뚱한 값 ${junk.length}종 = ${n}건: 모두 읽히고 구조 유지 (${okShape})`, okShape === n);
  T.ok(`같은 ${n}건: 결과에 null·NaN·Infinity 없음 (${okFinite})`, okFinite === n);
  const inf = LOA.packFile(d, NOW).replace('"baseCrit": 0', '"baseCrit": 1e999').replace('"extraAS": 0', '"extraAS": -1e999').replace('"share": 11', '"share": 1e400');
  const qi = LOA.unpackFile(inf);
  T.ok('JSON 안의 1e999(무한대)는 기본값으로', qi.ok && qi.state.baseCrit === 0 && qi.state.extraAS === 0 && qi.state.skills[0].share === 11);
}

T.section('이름·범위·종류 검사');
{
  const mk = (edit) => { const f = fileOf(LOA.defaults()); edit(f.data); return load(f).state; };
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'zzz', '', 'GRUDGE', ' grudge'])
    T.ok(`알 수 없는 각인 이름 "${id}" → 없음`, mk(d => { d.stone[0].id = id; d.cur.engr[0] = id; }).stone[0].id === 'none' && mk(d => { d.cur.engr[0] = id; }).cur.engr[0] === 'none');
  for (const id of ['constructor', '__proto__', 'valueOf', 'nope'])
    T.ok(`알 수 없는 팔찌·5티어 이름 "${id}" → 없음`, mk(d => { d.bracelet.slots[0].id = id; }).bracelet.slots[0].id === 'none' && mk(d => { d.cur.t5.id = id; }).cur.t5.id === 'none' && mk(d => { d.fix.t5 = id; }).fix.t5 === 'auto');
  T.ok('알 수 없는 펫·방향·등급 → 기본값', mk(d => { d.cur.pet = 'dog'; }).cur.pet === 'crit' && mk(d => { d.fix.pet = 'dog'; }).fix.pet === 'auto' && mk(d => { d.skills[0].dir = 'sideways'; }).skills[0].dir === 'none' && mk(d => { d.bracelet.grade = 'mythic'; }).bracelet.grade === 'ancient');
  T.ok('스톤 레벨 99 → 4, -3 → 0, 2.6 → 3', mk(d => { d.stone[0].lv = 99; }).stone[0].lv === 4 && mk(d => { d.stone[0].lv = -3; }).stone[0].lv === 0 && mk(d => { d.stone[0].lv = 2.6; }).stone[0].lv === 3);
  T.ok('팔찌 수치 9 → 2, -1 → 0', mk(d => { d.bracelet.slots[0].tier = 9; }).bracelet.slots[0].tier === 2 && mk(d => { d.bracelet.slots[0].tier = -1; }).bracelet.slots[0].tier === 0);
  T.ok('노드 레벨은 노드별 최대치로 제한 (한계 돌파 9 → 3, 예리한 감각 9 → 2, 일격 9 → 2)', (() => { const s = mk(d => { d.cur.t2.limit = 9; d.cur.t2.keen = 9; d.cur.t3.strike = 9; d.fix.t2.limit = 9; d.fix.t3.strike = -4; }); return s.cur.t2.limit === 3 && s.cur.t2.keen === 2 && s.cur.t3.strike === 2 && s.fix.t2.limit === 3 && s.fix.t3.strike === 0; })());
  T.ok('1티어 포인트 500 → 30, -5 → 0', (() => { const s = mk(d => { d.cur.t1.crit = 500; d.cur.t1.swift = -5; d.fix.t1.spec = 500; }); return s.cur.t1.crit === 30 && s.cur.t1.swift === 0 && s.fix.t1.spec === 30; })());
  T.ok('5티어 레벨 7 → 2, 0 → 1', mk(d => { d.cur.t5.lv = 7; }).cur.t5.lv === 2 && mk(d => { d.cur.t5.lv = 0; }).cur.t5.lv === 1);
  T.ok('숫자는 ±100만으로 제한', mk(d => { d.baseCrit = 1e12; }).baseCrit === 1e6 && mk(d => { d.extraAS = -1e12; }).extraAS === -1e6 && mk(d => { d.skills[0].mana = 5e9; }).skills[0].mana === 1e6);
  T.ok('숫자 모양의 글자는 숫자로, 아닌 글자는 기본값', mk(d => { d.baseCrit = '412.5'; }).baseCrit === 412.5 && mk(d => { d.baseCrit = '12abc'; }).baseCrit === 0 && mk(d => { d.otherAdd = ' '; }).otherAdd === 30);
  T.ok('참·거짓 칸은 정확히 true일 때만 참 ("true", 1, {} 는 거짓)', (() => { const s = mk(d => { d.syn10 = 'true'; d.syn20 = 1; d.opt.mass = {}; d.cur.t4.crit = 'yes'; d.skills[0].charge = 1; d.fix.t4.master = 'true'; }); return !s.syn10 && !s.syn20 && !s.opt.mass && !s.cur.t4.crit && !s.skills[0].charge; })());
  const ty = mk(d => { d.skills[0].type = 'awakening'; d.skills[10].type = 'normal'; d.skills[10].dir = 'back'; d.skills[10].charge = true; d.skills[10].hold = true; d.skills[10].mana = 500; d.skills[8].type = 'x'; });
  T.ok('스킬 종류는 파일로 바꿀 수 없음 (줄 위치로 결정)', ty.skills[0].type === 'normal' && ty.skills[10].type === 'awakening' && ty.skills[8].type === 'hyper');
  T.ok('각성기 줄의 방향·차지·홀딩·마나는 항상 비어 있음', ty.skills[10].dir === 'none' && !ty.skills[10].charge && !ty.skills[10].hold && ty.skills[10].mana === 0);
  const html = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
  T.ok('이름의 HTML은 글자 그대로 보존 (화면에서 이스케이프해 표시)', mk(d => { d.skills[1].name = html.slice(0, 40); }).skills[1].name === html.slice(0, 40) && mk(d => { d.label = '<b>x</b>'; }).label === '<b>x</b>');
  T.ok('이름은 40자로 자름', mk(d => { d.skills[1].name = 'a'.repeat(5000); d.label = '가'.repeat(5000); }).skills[1].name.length === 40 && mk(d => { d.label = '가'.repeat(5000); }).label.length === 40);
  T.ok('이름의 제어 문자는 제거', mk(d => { d.skills[1].name = 'a\u0000b\nc\td\u007fe\u001b[31m'; }).skills[1].name === 'abcde[31m');
  T.ok('이름이 글자가 아니면 기본 이름', mk(d => { d.skills[1].name = { toString: 'x' }; d.label = ['a']; }).skills[1].name === '스킬 2' && mk(d => { d.label = 5; }).label === '');
  T.ok('스킬 줄이 객체가 아니면 그 줄은 기본값', (() => { const s = mk(d => { d.skills[2] = null; d.skills[3] = 5; d.skills[4] = 'x'; d.skills[5] = [1, 2]; }); return [2, 3, 4, 5].every(i => J(s.skills[i]) === J(LOA.defaults().skills[i])); })());
  T.ok('현재 각인이 5개보다 적으면 빈 칸으로 채움', J(mk(d => { d.cur.engr = ['grudge']; }).cur.engr) === J(['grudge', 'none', 'none', 'none', 'none']) && J(mk(d => { d.cur.engr = 'grudge'; }).cur.engr) === J(['none', 'none', 'none', 'none', 'none']));
}

T.section('검증을 거치지 않은 값이 엔진에 직접 들어와도 안전');
{
  const d = LOA.defaults(); d.skills.forEach(s => { s.share = 10; });
  const cur = Object.assign({}, d.cur);
  const tryRun = (inp, c, o) => { try { const r = LOA.runSync(inp, c || cur, o || {}); return r.results.every(x => x.picks.every(p => Number.isFinite(p.ratio))); } catch (e) { return 'throw: ' + e.message; } };
  for (const id of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    T.ok(`스톤 각인 이름 "${id}"`, tryRun(Object.assign({}, d, { stone: [{ id, lv: 4 }, { id, lv: 2 }] })) === true);
    T.ok(`팔찌 옵션 이름 "${id}"`, tryRun(Object.assign({}, d, { bracelet: { grade: id, slots: [{ id, tier: 2 }] } })) === true);
    T.ok(`현재 각인 이름 "${id}"`, tryRun(d, Object.assign({}, cur, { engr: [id, id, 'grudge'] })) === true);
    T.ok(`고정 5티어 이름 "${id}"`, tryRun(d, cur, { fix: { t5: id } }) === true && LOA.normFix({ fix: { t5: id } }).t5 === 'auto');
  }
  T.ok('스톤이 배열이 아니어도', tryRun(Object.assign({}, d, { stone: 'grudge' })) === true && tryRun(Object.assign({}, d, { stone: { 0: { id: 'grudge', lv: 4 }, length: 1 } })) === true);
}

// ───────── 5. 무작위 변조 ─────────
T.section('무작위로 변조한 파일 400건');
{
  const junkPool = (R) => [null, true, false, 0, -1, 3.7, 1e308, -1e308, '', 'x', '<script>alert(1)</script>', 'a'.repeat(3000), '__proto__', 'constructor', [], [1, [2, [3]]], {}, { a: 1, __x: { b: [] } },
    { length: 11 }, Array.from({ length: 11 }, () => ({})), Array.from({ length: 11 }, () => null), '0', '12', 'NaN', 'Infinity', '\u0000\u0001', 99999999, -99999999][Math.floor(R() * 28)];
  let n = 0, noThrow = 0, okCount = 0, good = 0, ran = 0, ranOk = 0;
  const checkClean = (s) => {
    if (shape(s) !== SHAPE || J(LOA.sanitize(s)) !== J(s)) return false;
    let ok = true;
    (function walk(v) {
      if (typeof v === 'number') { if (!Number.isFinite(v) || Math.abs(v) > 1e6) ok = false; }
      else if (typeof v === 'string') { if (v.length > 40 || /[\u0000-\u001f\u007f]/.test(v)) ok = false; }
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    })(s);
    return ok && ENGR_IDS.includes(s.stone[0].id) && s.cur.engr.every(id => ENGR_IDS.includes(id)) && BR_IDS.includes(s.bracelet.slots[2].id)
      && T5_IDS.includes(s.cur.t5.id) && ['auto'].concat(Object.keys(LOA.T5)).includes(s.fix.t5) && s.skills.map(k => k.type).join() === LOA.defaults().skills.map(k => k.type).join();
  };
  for (let i = 0; i < 400; i++) {
    const R = rnd(40000 + i), f = fileOf(randomState(R));
    const muts = 1 + Math.floor(R() * 6);
    for (let m = 0; m < muts; m++) {
      let node = (R() < 0.85 && f.data && typeof f.data === 'object') ? f.data : f, depth = 1 + Math.floor(R() * 4);
      while (depth-- > 1) { const ks = Object.keys(node).filter(k => node[k] && typeof node[k] === 'object'); if (!ks.length) break; node = node[ks[Math.floor(R() * ks.length)]]; }
      const ks = Object.keys(node); if (!ks.length) continue;
      const k = ks[Math.floor(R() * ks.length)], roll = R();
      if (roll < 0.15) delete node[k]; else if (roll < 0.25) node['k' + m] = junkPool(R); else node[k] = junkPool(R);
    }
    let r; n++;
    try { r = LOA.unpackFile(JSON.stringify(f)); noThrow++; } catch (e) { console.log('   예외:', e.message); continue; }
    if (!r.ok) { if (typeof r.error === 'string' && r.error.length > 0 && r.state === undefined) good++; continue; }
    okCount++;
    if (checkClean(r.state)) good++;
    if (ran < 40) {
      ran++;
      try {
        const st = r.state, cur = Object.assign({}, st.cur, { engr: st.cur.engr.filter(id => LOA.ENGR[id]) });
        const res = LOA.runSync(st, cur, Object.assign({}, st.opt, { fix: st.fix }));
        if (Array.isArray(res.results) && res.results.every(x => x.picks.every(p => Number.isFinite(p.ratio) && p.ratio > 0))) ranOk++;
      } catch (e) { console.log('   계산 예외:', e.message); }
    }
  }
  T.ok(`변조 파일 ${n}건: 예외 없이 처리 (${noThrow})`, noThrow === n);
  T.ok(`읽힌 ${okCount}건은 모두 깨끗한 상태(구조·범위·이름 유효), 거부된 ${n - okCount}건은 이유 문구 있음 (${good})`, good === n);
  T.ok(`읽힌 파일 중 ${ran}건으로 계산: 예외 없이 유한한 결과 (${ranOk})`, ran === 40 && ranOk === ran);
}

// ───────── 6. 파일 이름 ─────────
T.section('파일 이름');
{
  const at = new Date(2026, 10, 21, 9, 5);   // 로컬 시각
  T.ok('기본 형식', LOA.fileName('기상술사 질풍', at) === '로아세팅_기상술사 질풍_20261121-0905.json');
  T.ok('이름이 없으면 "이름없음"', LOA.fileName('', at) === '로아세팅_이름없음_20261121-0905.json' && LOA.fileName(undefined, at) === LOA.fileName('   ', at) && LOA.fileName(null, at).includes('이름없음'));
  T.ok('한 자리 월·일·시·분은 0을 채움', LOA.fileName('a', new Date(2027, 0, 3, 4, 7)) === '로아세팅_a_20270103-0407.json');
  for (const bad of ['../../etc/passwd', 'C:\\Windows\\system32', 'a/b\\c:d*e?f"g<h>i|j', '..', '.hidden', 'CON', 'a\u0000b\nc', '   앞뒤 공백   ', 'x'.repeat(500), '<script>']) {
    const name = LOA.fileName(bad, at);
    T.ok(`"${bad.slice(0, 20).replace(/[\u0000-\u001f]/g, '?')}" → 경로·금지 문자 없는 이름`, !/[\\/:*?"<>|\u0000-\u001f]/.test(name) && name.startsWith('로아세팅_') && name.endsWith('_20261121-0905.json') && name.length <= 70 && !name.includes('_.'));
  }
  T.ok('경로 이동 문자가 이름에 남지 않음', !LOA.fileName('../../etc/passwd', at).includes('/') && !LOA.fileName('..\\..\\x', at).includes('\\'));
}

T.done();

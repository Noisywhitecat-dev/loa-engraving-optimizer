// 브라우저 UI 테스트 본문. 페이지 안에서 실행된다 (phase 번호를 받아 결과 배열을 돌려준다).
// 로컬 서버(http://127.0.0.1:8765)로 index.html을 연 뒤, 콘솔에서:
//   const code = await fetch('/research/ui_test.js').then(r => r.text());
//   await new Function('phase', 'return (async () => {' + code + '})()')(1)
// 단계 사이에는 페이지를 새로고침한다 (저장·복원 확인용). 1 → 2 → 3 → 4 → 5 순서.
const KEY = 'loa-opt-v1';
const res = [];
const ok = (name, cond, info) => { res.push({ name, ok: !!cond, info: cond ? undefined : info }); return !!cond; };
const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
const b = path => q(`[data-b="${path}"]`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fire = (el, type) => el.dispatchEvent(new Event(type, { bubbles: true }));
const setVal = (path, v) => { const el = b(path); el.value = v; if (el.tagName === 'INPUT') fire(el, 'input'); fire(el, 'change'); };
const setChk = (path, v) => { const el = b(path); el.checked = v; fire(el, 'change'); };
const saved = () => JSON.parse(localStorage.getItem(KEY));
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
const fmt = r => `${r >= 1 ? '+' : '−'}${Math.abs((r - 1) * 100).toFixed(2)}%`;
const runAndWait = async () => { q('#run').click(); for (let i = 0; i < 600; i++) { await sleep(50); if (!q('#run').disabled) break; } await sleep(50); };
const engineResult = () => { const st = saved(); const cur = Object.assign({}, st.cur, { engr: st.cur.engr.filter(id => LOA.ENGR[id]) }); return LOA.runSync(st, cur, Object.assign({}, st.opt, { fix: st.fix })); };
const bad = t => /NaN|undefined|Infinity|\[object/.test(t);

if (phase === 1) {
  ok('제목', document.title === '로스트아크 각인 · 아크패시브 최적화');
  ok('입력 영역 6개가 그려짐', ['char', 'bracelet', 'stone', 'skills', 'current', 'options'].every(id => q('#' + id).children.length > 0));
  ok('처음에는 결과 영역 숨김', q('#results').hidden);
  ok('스킬 11행', qa('#skills tbody tr').length === 11);
  ok('행 이름: 스킬 1~8, 초각성 스킬, 아이덴티티 스킬, 각성기',
    qa('#skills tbody tr td:first-child input').map(e => e.value).join('|') === '스킬 1|스킬 2|스킬 3|스킬 4|스킬 5|스킬 6|스킬 7|스킬 8|초각성 스킬|아이덴티티 스킬|각성기');
  ok('화면에 NaN·undefined 없음', !bad(document.body.innerText));

  // 저장 유도 후, 모든 입력 요소가 상태값과 일치하는지
  setVal('baseCrit', 0);
  const st0 = saved();
  ok('입력하면 저장소에 기록됨', !!st0 && Array.isArray(st0.skills));
  const mism = qa('[data-b]').filter(el => {
    const v = get(st0, el.dataset.b);
    if (v === undefined) return true;
    if (el.type === 'checkbox') return el.checked !== v;
    if (el.type === 'number') return Number(el.value) !== v;
    return String(el.value) !== String(v);
  }).map(el => el.dataset.b);
  ok(`입력 요소 ${qa('[data-b]').length}개가 모두 상태값과 일치`, mism.length === 0, mism.join(', '));
  const unnamed = qa('input, select').filter(el => !el.closest('label') && !el.getAttribute('aria-label')).length;
  ok('모든 입력칸에 이름표(label 또는 aria-label)', unnamed === 0, unnamed + '개 누락');

  // 숫자·체크박스 연동
  const nums = { baseCrit: 420, baseSwift: 350, extraAS: 12.5, extraMS: -3, otherCR: 2.6, otherCD: 8, otherH: 1.1, otherAdd: 33.5, otherAtk: 3.1, karma: 5, otherEvo: 1 };
  for (const k of Object.keys(nums)) setVal(k, nums[k]);
  ok('캐릭터 숫자 입력 11종 반영', Object.keys(nums).every(k => saved()[k] === nums[k]), JSON.stringify(Object.keys(nums).filter(k => saved()[k] !== nums[k])));
  setChk('syn10', true);
  ok('시너지 체크 반영', saved().syn10 === true && saved().syn20 === false);

  // 스킬 표
  setVal('skills.0.share', 30); setVal('skills.0.r', 90); setVal('skills.0.cr', 25); setVal('skills.0.cd', 40);
  ok('방향 "없음"이면 성공률 칸 없음', !b('skills.0.p'));
  setVal('skills.0.dir', 'back');
  ok('방향을 백어택으로 바꾸면 성공률 칸이 열림 (기본 80)', !!b('skills.0.p') && b('skills.0.p').value === '80');
  setVal('skills.0.p', 65); setChk('skills.0.charge', true); setVal('skills.0.mana', 320);
  setVal('skills.1.dir', 'head'); setVal('skills.1.p', 55); setChk('skills.1.hold', true);
  const s0 = saved().skills[0], s1 = saved().skills[1];
  ok('스킬 1 값 반영', s0.share === 30 && s0.r === 90 && s0.cr === 25 && s0.cd === 40 && s0.dir === 'back' && s0.p === 65 && s0.charge === true && s0.mana === 320, JSON.stringify(s0));
  ok('스킬 2 값 반영', s1.dir === 'head' && s1.p === 55 && s1.hold === true);
  ok('다시 그려도 입력값 유지', b('skills.0.share').value === '30' && b('skills.0.p').value === '65' && b('skills.0.charge').checked);
  ok('각성기 행: 방향·차지·홀딩·마나 비활성', b('skills.10.dir').disabled && b('skills.10.charge').disabled && b('skills.10.hold').disabled && b('skills.10.mana').disabled);
  ok('초각성 스킬 행: 마나 입력 가능', !b('skills.8.mana').disabled && !b('skills.8.dir').disabled);
  const sum = saved().skills.reduce((a, s) => a + Math.max(0, s.share), 0);
  ok('딜지분 합계 표시', q('#shareSum').textContent.startsWith(+sum.toFixed(2) + '%'), q('#shareSum').textContent);
  ok('합계가 100%가 아니면 안내 문구', sum === 100 || /환산/.test(q('#shareSum').textContent));
  setVal('skills.0.share', 11 + (100 - sum) + 19);
  ok('합계 100%면 안내 문구 없음', q('#shareSum').textContent === '100%', q('#shareSum').textContent);
  setVal('skills.2.name', '<img src=x onerror="window.__xss=1"><b>굵게</b>');

  // 팔찌
  ok('옵션 없음이면 수치 칸 비활성', b('bracelet.slots.0.tier').disabled);
  setVal('bracelet.slots.0.id', 'crH');
  ok('옵션을 고르면 수치 칸 활성', !b('bracelet.slots.0.tier').disabled);
  ok('고대 수치 3.4 / 4.2 / 5', [...b('bracelet.slots.0.tier').options].map(o => o.text).join() === '하 (3.4%),중 (4.2%),상 (5%)', [...b('bracelet.slots.0.tier').options].map(o => o.text).join());
  setVal('bracelet.grade', 'relic');
  ok('유물로 바꾸면 2.6 / 3.4 / 4.2', [...b('bracelet.slots.0.tier').options].map(o => o.text).join() === '하 (2.6%),중 (3.4%),상 (4.2%)');
  setVal('bracelet.slots.0.tier', 1); setVal('bracelet.slots.1.id', 'wp'); setVal('bracelet.slots.2.id', 'speed'); setVal('bracelet.slots.2.tier', 2);
  ok('팔찌 값 반영 (수치는 숫자형)', saved().bracelet.grade === 'relic' && saved().bracelet.slots[0].id === 'crH' && saved().bracelet.slots[0].tier === 1 && saved().bracelet.slots[2].tier === 2);
  ok('영향 없는 옵션에 표시', [...b('bracelet.slots.1.id').options].find(o => o.value === 'wp').text.includes('비교에 영향 없음') && ![...b('bracelet.slots.1.id').options].find(o => o.value === 'crH').text.includes('영향 없음'));
  ok('무기 공격력 옵션은 % 없이 표시', [...b('bracelet.slots.1.tier').options].map(o => o.text).join() === '하 (6300),중 (7200),상 (8100)', [...b('bracelet.slots.1.tier').options].map(o => o.text).join());
  ok('팔찌 옵션 목록 = 엔진 표', b('bracelet.slots.0.id').options.length === Object.keys(LOA.BRACELET).length);

  // 스톤
  ok('스톤 없음이면 레벨 칸 비활성', b('stone.0.lv').disabled);
  setVal('stone.0.id', 'blunt'); setVal('stone.0.lv', 4); setVal('stone.1.id', 'blunt');
  ok('같은 각인 두 번이면 경고', /같은 각인/.test(q('#stone').innerText));
  setVal('stone.1.id', 'grudge'); setVal('stone.1.lv', 3);
  ok('다른 각인으로 바꾸면 경고 사라짐', !/같은 각인/.test(q('#stone').innerText));
  ok('스톤 값 반영', JSON.stringify(saved().stone) === '[{"id":"blunt","lv":4},{"id":"grudge","lv":3}]', JSON.stringify(saved().stone));
  ok('스톤 각인 목록 = 없음 + 16종', b('stone.0.id').options.length === 17);

  // 현재 세팅
  ok('처음에는 티어 경고 없음', !q('#current .warn'));
  setVal('cur.t2.keen', 2);
  ok('2티어 초과 경고', /2티어가 5레벨/.test(q('#current').innerText), q('#current').innerText.slice(-80));
  setVal('cur.t2.keen', 0);
  setVal('cur.t1.swift', 20);
  ok('1티어 초과 경고', /1티어 합계가 50포인트/.test(q('#current').innerText));
  setVal('cur.t1.swift', 10);
  setVal('cur.t3.tank', 1);
  ok('3티어 초과 경고', /3티어가 3레벨/.test(q('#current').innerText));
  setVal('cur.t3.tank', 0);
  setChk('cur.t4.master', true);
  ok('4티어 3개 경고', /4티어는 2개까지/.test(q('#current').innerText));
  setChk('cur.t4.master', false);
  ok('바로잡으면 경고 없음', !q('#current .warn'));
  setVal('cur.t5.id', 'none');
  ok('5티어 없음이면 레벨 칸 비활성', b('cur.t5.lv').disabled);
  setVal('cur.t5.id', 'infight'); setVal('cur.t5.lv', 1);
  ok('현재 5티어에 인파이팅 선택 가능', saved().cur.t5.id === 'infight' && saved().cur.t5.lv === 1);
  setVal('cur.t5.id', 'stand'); setVal('cur.t5.lv', 2);
  setVal('cur.engr.4', 'none');
  ok('현재 각인 "없음 / 기타" 선택 가능', saved().cur.engr[4] === 'none');
  setVal('cur.engr.4', 'doll');
  setVal('cur.pet', 'swift');
  ok('현재 펫 반영', saved().cur.pet === 'swift');

  // 추천 조건
  setVal('fix.t1.spec', 5); setChk('opt.tenacity', true);
  ok('추천 조건 반영', saved().fix.t1.spec === 5 && saved().opt.tenacity === true && saved().opt.mass === false && saved().opt.spec === undefined);
  ok('제거한 "계산 가정" 영역 없음', !/계산 가정/.test(q('#options').innerText));

  // 계산 실행
  await runAndWait();
  ok('계산 완료 표시', q('#status').textContent === '완료', q('#status').textContent);
  ok('진행 막대 100%', q('#prog').style.width === '100%');
  ok('계산 버튼 다시 활성', !q('#run').disabled);
  ok('결과 영역 표시', !q('#results').hidden);
  const cards = qa('#results .card');
  ok('카드 4장', cards.length === 4);
  const er = engineResult(), sorted = er.results.filter(r => r.picks.length).sort((a, c) => c.picks[0].ratio - a.picks[0].ratio);
  ok('카드 순서와 이름 = 엔진 결과 (이득 내림차순)', cards.map(c => c.querySelector('h3').childNodes[0].textContent).join() === sorted.map(r => LOA.T5[r.t5].name).join(),
    cards.map(c => c.querySelector('h3').textContent).join());
  ok('카드의 이득 수치 = 엔진 결과', cards.map(c => c.querySelector('.gain').textContent).join() === sorted.map(r => fmt(r.picks[0].ratio)).join(),
    cards.map(c => c.querySelector('.gain').textContent).join() + ' vs ' + sorted.map(r => fmt(r.picks[0].ratio)).join());
  ok('"최적" 표시는 첫 카드에만', cards[0].classList.contains('best') && !!cards[0].querySelector('.badge') && cards.slice(1).every(c => !c.querySelector('.badge')));
  ok('이득 색: 양수 초록, 음수 빨강', cards.every((c, i) => c.querySelector('.gain').classList.contains(sorted[i].picks[0].ratio >= 1 ? 'pos' : 'neg')));
  ok('각인 칩 = 엔진 추천 각인', cards.every((c, i) => [...c.querySelectorAll('.chip')].map(x => x.textContent.replace(/ [★✓]$/, '')).join() === sorted[i].picks[0].build.engr.map(id => LOA.ENGR[id].name).join()));
  ok('스톤 각인(예리한 둔기, 원한)에 ★', cards.every(c => [...c.querySelectorAll('.chip.st')].map(x => x.textContent).sort().join() === '예리한 둔기 ★,원한 ★'));
  ok('체크한 달인의 저력이 모든 카드에 ✓로 포함', cards.every(c => [...c.querySelectorAll('.chip.rq')].map(x => x.textContent).join() === '달인의 저력 ✓'));
  ok('1티어 분배 문구에 특화 5 표시', cards.every(c => /특화 5/.test(c.innerText)));
  ok('다른 각인 조합 목록의 수치 = 엔진', cards.every((c, i) => { const alt = [...c.querySelectorAll('.alt div span:last-child')].map(x => x.textContent); return alt.join() === sorted[i].picks.slice(1).map(p => fmt(p.ratio)).join(); }));
  const active = saved().skills.filter(s => s.share > 0).length;
  ok('스킬별 변화 표: 지분 있는 스킬 수만큼', cards.every(c => c.querySelectorAll('details tbody tr').length === active));
  ok('현재 세팅 예상 수치 표', qa('#results > .alt details tbody tr').length === active);
  const ev = LOA.evalBuild(Object.assign({}, saved().cur, { engr: saved().cur.engr.filter(id => LOA.ENGR[id]) }), saved());
  const firstRow = q('#results > .alt details tbody tr');
  ok('현재 세팅 예상 치적 = 엔진', firstRow.children[1].textContent === (+ev.rows[0].hit.toFixed(1)).toString() && firstRow.children[2].textContent === (+ev.rows[0].multi.toFixed(1)).toString(), firstRow.innerText);
  ok('결과에 NaN·undefined 없음', !bad(q('#results').innerText));
  ok('스킬 이름의 HTML은 실행되지 않음', window.__xss === undefined && !q('#results img') && !q('#skills td img'));
  ok('스킬 이름은 글자 그대로 표시 (접힌 표 포함)', q('#results').textContent.includes('<img src=x onerror="window.__xss=1"><b>굵게</b>'));
  ok('설명 문구에 탐색 규모 표시', /각인 조합 \d+개 × 진화 조합 [\d,]+개 전수 탐색/.test(qa('#results .desc').map(e => e.textContent).join(' ')));

  // 빈 칸, 연타, 지분 0
  setVal('baseCrit', '');
  ok('숫자 칸을 비우면 0', saved().baseCrit === 0);
  q('#run').click(); q('#run').click(); q('#run').click();
  for (let i = 0; i < 600; i++) { await sleep(50); if (!q('#run').disabled) break; }
  ok('계산 버튼 연타에도 정상 완료', q('#status').textContent === '완료' && qa('#results .card').length === 4 && !bad(q('#results').innerText));
  const shares = saved().skills.map(s => s.share);
  shares.forEach((_, i) => setVal(`skills.${i}.share`, 0));
  await runAndWait();
  ok('지분이 모두 0이면 안내 문구', /딜지분이 입력된 스킬이 없습니다/.test(q('#results').innerText) && qa('#results .card').length === 0);
  shares.forEach((v, i) => setVal(`skills.${i}.share`, v));
  setVal('skills.3.share', -20);
  await runAndWait();
  ok('음수 지분은 0으로 취급', qa('#results .card').length === 4 && !bad(q('#results').innerText));
  setVal('skills.3.share', shares[3]);
  setVal('baseCrit', 777);
  ok('오류 없이 끝남', true);
}

if (phase === 2) {
  ok('새로고침 후 숫자 복원', b('baseCrit').value === '777' && b('otherH').value === '1.1' && b('extraMS').value === '-3');
  ok('새로고침 후 스킬 복원 (방향·성공률·체크)', b('skills.0.dir').value === 'back' && b('skills.0.p').value === '65' && b('skills.0.charge').checked && b('skills.1.dir').value === 'head');
  ok('새로고침 후 팔찌·스톤 복원', b('bracelet.grade').value === 'relic' && b('bracelet.slots.0.id').value === 'crH' && b('bracelet.slots.0.tier').value === '1' && b('stone.0.id').value === 'blunt' && b('stone.1.lv').value === '3');
  ok('새로고침 후 현재 세팅·조건 복원', b('cur.pet').value === 'swift' && b('fix.t1.spec').value === '5' && b('opt.tenacity').checked);
  ok('새로고침 후 시너지 복원', b('syn10').checked && !b('syn20').checked);
  ok('새로고침 후 결과는 숨김', q('#results').hidden);
  ok('저장된 스킬 이름의 HTML은 새로고침 후에도 실행되지 않음', window.__xss === undefined && !q('#skills td img') && b('skills.2.name').value.startsWith('<img'));
  window.confirm = () => false; q('#reset').click();
  ok('초기화 취소 시 값 유지', b('baseCrit').value === '777');
  await runAndWait();
  window.confirm = () => true; q('#reset').click();
  ok('초기화 후 기본값', b('baseCrit').value === '0' && b('skills.0.dir').value === 'none' && b('bracelet.grade').value === 'ancient' && b('stone.0.id').value === 'none' && !b('syn10').checked);
  ok('초기화 후 결과 숨김', q('#results').hidden);
  ok('초기화 후 저장소도 기본값', saved().baseCrit === 0 && saved().skills[2].name === '스킬 3' && saved().fix.t1.spec === 0 && /고정 없음/.test(q('#fixed summary').textContent));
  localStorage.setItem(KEY, '{bad json');
}

if (phase === 3) {
  ok('손상된 저장값이어도 기본값으로 정상 표시', b('baseCrit').value === '0' && qa('#skills tbody tr').length === 11);
  setVal('baseCrit', 555);
  const old = saved();
  old.asm = { support: false, hAdd: true, awkEvo: false, awkSwift: false };
  delete old.otherH;
  delete old.fix; old.opt.spec = 7; old.opt.pet = 'spec';
  localStorage.setItem(KEY, JSON.stringify(old));
}

if (phase === 4) {
  ok('이전 형식(가정 옵션 포함, 새 입력칸 없음)의 저장값을 읽음', b('baseCrit').value === '555');
  ok('없던 입력칸은 기본값 0', b('otherH').value === '0');
  ok('예전의 특화 고정 포인트·펫 설정이 고정 메뉴로 옮겨짐', b('fix.t1.spec').value === '7' && b('fix.pet').value === 'spec' && !b('opt.spec') && !b('opt.pet'));
  setVal('otherCR', 1);
  ok('다시 저장하면 가정 옵션이 사라지고 새 칸이 생김', saved().asm === undefined && saved().otherH === 0 && saved().opt.spec === undefined && saved().fix.t1.spec === 7);
  await runAndWait();
  ok('이전 형식에서도 계산 정상', qa('#results .card').length === 4 && !bad(q('#results').innerText));
  const wrong = saved(); wrong.skills = wrong.skills.slice(0, 3);
  localStorage.setItem(KEY, JSON.stringify(wrong));
}

if (phase === 5) {
  ok('형식이 맞지 않는 저장값(스킬 3개)은 버리고 기본값', qa('#skills tbody tr').length === 11 && b('baseCrit').value === '0');
  localStorage.removeItem(KEY);
}

if (phase === 6) {   // 화면 폭·색상: 드라이버가 뷰포트를 바꾼 뒤 호출
  const de = document.documentElement;
  ok(`가로 넘침 없음 (폭 ${innerWidth}px)`, de.scrollWidth <= de.clientWidth, `${de.scrollWidth} > ${de.clientWidth}`);
  const tw = q('#skills .tw');
  ok('스킬 표는 자기 영역 안에서만 가로 스크롤', innerWidth > 1000 || tw.scrollWidth > tw.clientWidth);
  ok('모든 구역이 화면 폭 안', qa('section').every(s => s.getBoundingClientRect().right <= innerWidth + 0.5 && s.getBoundingClientRect().left >= -0.5));
  await runAndWait();
  ok('결과 카드가 화면 폭 안', qa('#results .card').length === 4 && qa('#results .card').every(c => c.getBoundingClientRect().right <= innerWidth + 0.5));
  ok('결과 표시 후에도 가로 넘침 없음', de.scrollWidth <= de.clientWidth, `${de.scrollWidth} > ${de.clientWidth}`);
  const r = q('#run').getBoundingClientRect();
  ok('계산 버튼이 화면 안에 고정', r.top >= 0 && r.bottom <= innerHeight + 1 && r.width > 80, JSON.stringify([r.top, r.bottom, innerHeight]));
  const cs = getComputedStyle(document.body);
  res.push({ name: 'info', ok: true, bg: cs.backgroundColor, ink: cs.color, dark: matchMedia('(prefers-color-scheme: dark)').matches, width: innerWidth });
}

if (phase === 7) {   // 특화 고정 30 + 특화 펫, 체크 각인 3종
  localStorage.removeItem(KEY);
  setVal('baseCrit', 300); setVal('baseSwift', 250); setVal('extraAS', 15);
  setVal('skills.0.dir', 'back'); setVal('skills.1.mana', 300);
  setVal('fix.t1.spec', 30); setVal('fix.pet', 'spec');
  ok('고정 메뉴 저장: 특화 30, 펫 특화', saved().fix.t1.spec === 30 && saved().fix.pet === 'spec');
  await runAndWait();
  let cards = qa('#results .card');
  const er = engineResult(), sorted = er.results.filter(r => r.picks.length).sort((a, c) => c.picks[0].ratio - a.picks[0].ratio);
  ok('카드 4장, 오류 문구 없음', cards.length === 4 && q('#status').textContent === '완료' && !bad(q('#results').innerText));
  ok('이득 수치 = 엔진 결과', cards.map(c => c.querySelector('.gain').textContent).join() === sorted.map(r => fmt(r.picks[0].ratio)).join());
  ok('1티어 문구: 치명 a · 신속 b · 특화 30 (a + b = 10)', cards.every((c, i) => { const t = sorted[i].picks[0].build.t1; return t.crit + t.swift === 10 && c.innerText.includes(`치명 ${t.crit} · 신속 ${t.swift} · 특화 30`); }), cards[0].innerText.slice(0, 200));
  ok('펫 표시: 특화', cards.every(c => /펫\s*특화/.test(c.innerText)));
  ok('스탯 표시 = 기본 + 50×포인트 (펫 미포함)', cards.every((c, i) => { const t = sorted[i].picks[0].build.t1; return c.innerText.includes(`치명 ${300 + 50 * t.crit} · 신속 ${250 + 50 * t.swift}`); }));
  setChk('opt.tenacity', true); setChk('opt.barricade', true); setChk('opt.mass', true);
  await runAndWait();
  cards = qa('#results .card');
  ok('세 각인 체크 → 모든 카드에 ✓ 세 개', cards.length === 4 && cards.every(c => [...c.querySelectorAll('.chip.rq')].map(x => x.textContent).sort().join() === '달인의 저력 ✓,바리케이드 ✓,질량 증가 ✓'));
  ok('다른 각인 조합에도 세 각인 포함', cards.every(c => [...c.querySelectorAll('.alt div span:first-child')].every(x => ['달인의 저력', '바리케이드', '질량 증가'].every(n => x.textContent.includes(n)))));
  ok('체크한 질량 증가에는 "자동 채용" 안내 없음', !/패널티 없이 채용/.test(q('#results').innerText));
  ok('안내 문구에 ✓ 설명', /✓는 추천 조건에서 체크한 각인/.test(qa('#results .desc').map(e => e.textContent).join(' ')));
  ok('추천 조건 설명: 반드시 포함', /체크한 각인은 효율과 상관없이 추천 각인에 반드시 포함/.test(q('#options').innerText));
  localStorage.removeItem(KEY);
}

if (phase === 8) {   // 고정할 아크패시브 노드 (저장소를 비우고 새로 연 상태에서 시작)
  const gains = () => qa('#results .card').map(c => c.querySelector('.gain').textContent).join();
  const sortedEr = () => engineResult().results.filter(r => r.picks.length).sort((a, c) => c.picks[0].ratio - a.picks[0].ratio);
  let det = q('#fixed details');
  ok('고정 메뉴가 추천 조건과 결과 영역 사이에 있음', !!det && !!(q('#options').compareDocumentPosition(q('#fixed')) & 4) && !!(q('#fixed').compareDocumentPosition(q('#results')) & 4));
  ok('처음에는 접혀 있고 "고정 없음"', !det.open && /고정 없음/.test(q('#fixed summary').textContent) && /눌러서 펼치기/.test(q('#fixed summary').textContent));
  det.open = true; await sleep(60);
  ok('펼치면 안내가 "눌러서 접기"로 바뀜', /눌러서 접기/.test(q('#fixed summary').textContent));
  ok('입력 구성: 1티어 3 + 펫 + 2티어 5 + 3티어 5 + 4티어 3 + 5티어 = 18칸', qa('#fixed [data-b^="fix."]').length === 18);
  ok('현재 세팅 입력과 같은 노드 구성', ['endless', 'forbidden', 'keen', 'limit', 'optim'].every(k => b('fix.t2.' + k)) && ['infinite', 'allout', 'strike', 'tank', 'timing'].every(k => b('fix.t3.' + k)) && ['crit', 'master', 'crush'].every(k => b('fix.t4.' + k)));
  ok('한계 돌파만 Lv.3까지 고를 수 있음', b('fix.t2.limit').options.length === 4 && b('fix.t2.keen').options.length === 3);
  ok('추천 조건에서 특화·펫 칸이 사라짐', !b('opt.spec') && !b('opt.pet'));

  setVal('fix.t3.strike', 2);
  ok('값을 고른 뒤에도 메뉴가 펼쳐진 채', q('#fixed details').open);
  ok('요약에 "1개 고정됨"', /1개 고정됨/.test(q('#fixed summary').textContent));
  ok('"현재 고정: 일격 Lv.2 이상" 표시', /현재 고정: 일격 Lv\.2 이상/.test(q('#fixed').textContent));
  ok('기본 스킬은 모두 비방향성 (일격 치피가 무의미한 상황)', saved().skills.every(s => s.dir === 'none'));
  await runAndWait();
  let cards = qa('#results .card');
  ok('방향성 스킬이 없어도 모든 카드에 "일격 2 (고정)"', cards.length === 4 && cards.every(c => c.innerText.includes('일격 2 (고정)')));
  ok('결과 위에 "고정 반영: 일격 Lv.2 이상"', !!q('#fixedNote') && q('#fixedNote').textContent.includes('일격 Lv.2 이상'));
  ok('이득 수치 = 엔진 결과', gains() === sortedEr().map(r => fmt(r.picks[0].ratio)).join());
  ok('엔진 결과의 모든 추천이 일격 2', engineResult().results.every(r => r.picks.every(p => p.build.t3.strike === 2)));

  setChk('fix.t4.master', true); setVal('fix.t1.crit', 25); setVal('fix.pet', 'swift'); setVal('fix.t2.endless', 1);
  ok('요약에 "5개 고정됨"', /5개 고정됨/.test(q('#fixed summary').textContent), q('#fixed summary').textContent);
  await runAndWait();
  cards = qa('#results .card');
  const er = engineResult();
  ok('여러 고정을 모두 지킴 (엔진)', er.results.length === 4 && er.results.every(r => r.picks.every(p => p.build.t3.strike === 2 && p.build.t4.master && p.build.t1.crit >= 25 && p.build.pet === 'swift' && p.build.t2.endless >= 1)));
  ok('카드에 고정 표시: 달인, 치명, 펫, 끝없는 마나', cards.length === 4 && cards.every(c => /달인 \(고정\)/.test(c.innerText) && /치명 \d+ \(고정\)/.test(c.innerText) && /신속 \(고정\)/.test(c.innerText) && /끝없는 마나 \d \(고정\)/.test(c.innerText)));
  ok('고정하지 않은 노드에는 표시 없음', cards.every(c => !/회심 \(고정\)|분쇄 \(고정\)|한계 돌파 \d \(고정\)/.test(c.innerText)));
  ok('이득 수치 = 엔진 결과 (여러 고정)', gains() === sortedEr().map(r => fmt(r.picks[0].ratio)).join());

  setVal('fix.t5', 'stand');
  await runAndWait();
  cards = qa('#results .card');
  ok('5티어 고정 → 카드 1장 (입식 타격가)', cards.length === 1 && cards[0].querySelector('h3').textContent.startsWith('입식 타격가'));
  ok('안내 문구: 5티어를 고정한 결과', /5티어를 입식 타격가\(으\)로 고정한 결과/.test(q('#results').innerText));
  setVal('fix.t5', 'infight');
  await runAndWait();
  cards = qa('#results .card');
  ok('인파이팅 고정 → 카드 1장, 수치 = 엔진', cards.length === 1 && cards[0].querySelector('h3').textContent.startsWith('인파이팅') && gains() === sortedEr().map(r => fmt(r.picks[0].ratio)).join());
  setVal('fix.t5', 'auto');

  setVal('fix.t2.limit', 3);   // 끝없는 마나 1 + 한계 돌파 3 = 4레벨
  ok('티어 제한을 넘으면 메뉴에 경고', /2티어 고정 레벨 합이 4/.test(q('#fixed').textContent) && !!q('#fixed .warn'));
  await runAndWait();
  ok('넘친 상태로 계산하면 결과 대신 이유 표시', qa('#results .card').length === 0 && /티어 제한을 넘어 계산할 수 없습니다/.test(q('#results').innerText) && /2티어 고정 레벨 합이 4/.test(q('#results').innerText) && q('#status').textContent === '완료' && !q('#run').disabled);
  setVal('fix.t2.limit', 0);
  ok('바로잡으면 경고 사라짐', !q('#fixed .warn'));
  ok('고정값이 저장소에 기록됨', saved().fix.t3.strike === 2 && saved().fix.t4.master === true && saved().fix.t1.crit === 25 && saved().fix.pet === 'swift' && saved().fix.t2.endless === 1 && saved().fix.t5 === 'auto');
  q('#fixed details').open = false;
  await runAndWait();
  ok('메뉴를 접어도 고정은 그대로 반영', qa('#results .card').length === 4 && qa('#results .card').every(c => c.innerText.includes('일격 2 (고정)')));
  ok('화면에 NaN·undefined 없음', !bad(q('#results').innerText) && !bad(q('#fixed').textContent));
}

if (phase === 9) {   // 8단계 뒤 새로고침
  ok('새로고침 후 고정값 복원', b('fix.t3.strike').value === '2' && b('fix.t4.master').checked && b('fix.t1.crit').value === '25' && b('fix.pet').value === 'swift' && b('fix.t2.endless').value === '1');
  ok('새로고침 후 메뉴는 접혀 있고 "5개 고정됨"', !q('#fixed details').open && /5개 고정됨/.test(q('#fixed summary').textContent));
  await runAndWait();
  ok('새로고침 후에도 고정 반영', qa('#results .card').length === 4 && qa('#results .card').every(c => c.innerText.includes('일격 2 (고정)') && /달인 \(고정\)/.test(c.innerText)));
  window.confirm = () => true; q('#reset').click();
  ok('초기화하면 고정도 모두 해제', /고정 없음/.test(q('#fixed summary').textContent) && b('fix.t3.strike').value === '0' && !b('fix.t4.master').checked && saved().fix.pet === 'auto');
  localStorage.removeItem(KEY);
}

if (phase === 10) {   // 파일로 저장 / 불러오기 (저장소를 비우고 새로 연 상태에서 시작)
  const allMatch = () => { const st = saved(); return qa('[data-b]').filter(el => { const v = get(st, el.dataset.b); if (v === undefined) return true;
    if (el.type === 'checkbox') return el.checked !== v; if (el.type === 'number') return Number(el.value) !== v; return String(el.value) !== String(v); }).map(el => el.dataset.b); };
  ok('도구 줄: 기록 이름, 파일로 저장, 파일 불러오기, 입력 초기화', !!b('label') && q('#exportBtn').textContent === '파일로 저장' && q('#importBtn').textContent === '파일 불러오기' && !!q('#reset'));
  ok('파일 선택 칸은 숨겨져 있고 JSON만 받음', q('#importFile').hidden && getComputedStyle(q('#importFile')).display === 'none' && q('#importFile').accept.includes('.json') && !!q('#importFile').getAttribute('aria-label'));

  // 기록 A
  setVal('label', '기상술사 / 질풍');
  setVal('baseCrit', 412); setVal('extraMS', -3.5); setChk('syn20', true);
  setVal('skills.0.name', '<img src=x onerror="window.__xss2=1">'); setVal('skills.0.dir', 'back'); setVal('skills.0.p', 65); setVal('skills.1.mana', 320); setChk('skills.1.hold', true);
  setVal('bracelet.grade', 'relic'); setVal('bracelet.slots.0.id', 'crH'); setVal('bracelet.slots.0.tier', 1);
  setVal('stone.0.id', 'blunt'); setVal('stone.0.lv', 4);
  setVal('cur.pet', 'swift'); setChk('opt.tenacity', true);
  setVal('fix.t3.strike', 2); setChk('fix.t4.master', true); setVal('fix.t1.spec', 12);
  const A = JSON.stringify(saved());
  ok('기록 이름이 상태에 저장됨', saved().label === '기상술사 / 질풍');

  // 내려받기를 가로채 파일 이름과 내용을 확인한다
  const cap = [], origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) cap.push({ name: this.download, href: this.href }); else origClick.call(this); };
  const grab = async () => { const c = cap[cap.length - 1]; return { name: c.name, text: await fetch(c.href).then(r => r.text()) }; };
  q('#exportBtn').click();
  const fa = await grab();
  ok('저장 버튼 → 파일 1개', cap.length === 1 && cap[0].href.startsWith('blob:'));
  ok('파일 이름: 로아세팅_기록이름_날짜-시각.json (금지 문자는 _로)', /^로아세팅_기상술사 _ 질풍_\d{8}-\d{4}\.json$/.test(fa.name), fa.name);
  const fobj = JSON.parse(fa.text);
  ok('파일 내용: 형식 정보 + 모든 입력', fobj.app === 'loa-engraving-optimizer' && fobj.version === 1 && fobj.label === '기상술사 / 질풍' && JSON.stringify(fobj.data) === A && !isNaN(Date.parse(fobj.savedAt)));
  ok('파일에는 입력 항목만 들어 있음 (계산 결과 없음)', Object.keys(fobj).join() === 'app,version,savedAt,label,data' && Object.keys(fobj.data).join() === Object.keys(LOA.defaults()).join());
  ok('저장 안내 문구', q('#toolMsg').textContent === '저장했습니다: ' + fa.name);
  ok('임시 링크가 문서에 남지 않음', !document.querySelector('a[download]'));

  // 기록 B
  window.confirm = () => true; q('#reset').click();
  ok('초기화하면 기록 이름과 안내 문구도 비워짐', b('label').value === '' && saved().label === '' && q('#toolMsg').textContent === '');
  setVal('label', '버서커'); setVal('baseCrit', 77); setVal('fix.t5', 'thorn');
  const B = JSON.stringify(saved());
  q('#exportBtn').click();
  const fb = await grab();
  ok('두 번째 기록도 따로 저장', cap.length === 2 && /^로아세팅_버서커_/.test(fb.name) && JSON.stringify(JSON.parse(fb.text).data) === B);

  // 실제 파일 선택 칸에 파일을 넣어 불러온다
  const give = async (text, name) => { const dt = new DataTransfer(); dt.items.add(new File([text], name || 'x.json', { type: 'application/json' }));
    const inp = q('#importFile'); inp.files = dt.files; fire(inp, 'change'); await sleep(200); };
  let asked = [];
  window.confirm = (m) => { asked.push(m); return false; };
  await give(fa.text, 'a.json');
  ok('불러오기 전에 확인 창 (기록 이름 표시)', asked.length === 1 && asked[0].includes('기상술사 / 질풍'));
  ok('확인을 취소하면 입력이 바뀌지 않음', JSON.stringify(saved()) === B && b('baseCrit').value === '77' && b('label').value === '버서커');
  window.confirm = (m) => { asked.push(m); return true; };
  await runAndWait();
  ok('(준비) 기록 B로 계산한 결과가 떠 있음', !q('#results').hidden);
  await give(fa.text, 'a.json');
  ok('불러오면 모든 값이 기록 A와 동일', JSON.stringify(saved()) === A);
  ok('화면 입력칸도 기록 A로 바뀜', b('label').value === '기상술사 / 질풍' && b('baseCrit').value === '412' && b('extraMS').value === '-3.5' && b('syn20').checked && b('skills.0.dir').value === 'back' && b('skills.0.p').value === '65'
    && b('skills.1.hold').checked && b('skills.1.mana').value === '320' && b('bracelet.grade').value === 'relic' && b('bracelet.slots.0.tier').value === '1' && b('stone.0.lv').value === '4' && b('cur.pet').value === 'swift'
    && b('opt.tenacity').checked && b('fix.t3.strike').value === '2' && b('fix.t4.master').checked && b('fix.t1.spec').value === '12' && b('fix.t5').value === 'auto');
  ok('모든 입력 요소가 상태값과 일치', allMatch().length === 0, allMatch().join(', '));
  ok('불러오면 이전 결과는 숨김', q('#results').hidden);
  ok('불러오기 안내 문구', q('#toolMsg').textContent === '불러왔습니다: 기상술사 / 질풍' && q('#toolMsg').className === 'hint');
  ok('고정 메뉴 요약도 갱신 (3개 고정됨)', /3개 고정됨/.test(q('#fixed summary').textContent));
  ok('저장된 스킬 이름의 HTML은 실행되지 않음', window.__xss2 === undefined && !q('#skills td img') && b('skills.0.name').value.startsWith('<img'));
  await runAndWait();
  let cards = qa('#results .card');
  const er = engineResult().results.filter(r => r.picks.length).sort((a, c) => c.picks[0].ratio - a.picks[0].ratio);
  ok('불러온 기록으로 계산: 수치 = 엔진, 고정·체크 반영', cards.length === 4 && cards.map(c => c.querySelector('.gain').textContent).join() === er.map(r => fmt(r.picks[0].ratio)).join()
    && cards.every(c => c.innerText.includes('일격 2 (고정)') && /달인 \(고정\)/.test(c.innerText) && c.innerText.includes('달인의 저력 ✓') && c.innerText.includes('예리한 둔기 ★')));
  const n0 = asked.length;
  await give(fa.text, 'a.json');
  ok('같은 파일을 연달아 다시 골라도 동작', asked.length === n0 + 1 && JSON.stringify(saved()) === A);
  await give(fb.text, 'b.json');
  ok('기록 B를 불러오면 B로 (직업 간 전환)', JSON.stringify(saved()) === B && b('label').value === '버서커' && b('fix.t5').value === 'thorn' && b('baseCrit').value === '77' && b('skills.0.dir').value === 'none');
  q('#exportBtn').click();
  const fb2 = await grab();
  ok('불러온 뒤 다시 저장하면 내용이 같음', JSON.stringify(JSON.parse(fb2.text).data) === B);

  // 잘못된 파일
  const before = JSON.stringify(saved()); asked = [];
  const badFiles = [['글자', 'hello', 'JSON'], ['다른 프로그램', '{"app":"x","data":{}}', '저장 파일이 아닙니다'], ['빈 파일', '', '비어 있습니다'],
    ['스킬 3행', JSON.stringify(Object.assign({}, fobj, { data: Object.assign({}, fobj.data, { skills: fobj.data.skills.slice(0, 3) }) })), '올바르지 않습니다'],
    ['1MB 초과', JSON.stringify(Object.assign({}, fobj, { pad: 'x'.repeat(1100000) })), '너무 큽니다']];
  for (const [name, text, word] of badFiles) {
    await give(text, 'bad.json');
    ok(`잘못된 파일(${name}) → 오류 문구, 입력은 그대로, 확인 창 없음`, q('#toolMsg').textContent.includes(word) && q('#toolMsg').className === 'warn' && JSON.stringify(saved()) === before && asked.length === 0, q('#toolMsg').textContent);
  }
  ok('오류 뒤에도 화면은 정상', allMatch().length === 0 && b('label').value === '버서커');

  // 악의적으로 만든 파일
  const evil = JSON.parse(fa.text);
  evil.label = '<img src=x onerror="window.__xss3=1">'; evil.data.label = '<svg onload="window.__xss3=1">';
  evil.data.skills[3].name = '<script>window.__xss3=1</script>'; evil.data.evil = '<script>window.__xss3=1</script>';
  evil.data.stone[0].id = 'constructor'; evil.data.cur.t5.id = '__proto__'; evil.data.skills[10].type = 'normal'; evil.data.baseCrit = '1e999'; evil.data.fix.t5 = 'toString';
  await give(JSON.stringify(evil).replace('"cur":{', '"cur":{"__proto__":{"polluted":1},'), 'evil.json');
  ok('악의적 파일: 확인 창 문구에 이름이 글자 그대로', asked.length === 1 && asked[0].includes('<svg onload'));
  await runAndWait();
  ok('악의적 파일: 스크립트 실행 없음, 객체 오염 없음', window.__xss3 === undefined && ({}).polluted === undefined && !document.querySelector('#tools img, #tools svg, #skills img, #skills script, #results img, #results script, #results svg'));
  ok('악의적 파일: 알 수 없는 값은 기본값으로, 모르는 항목은 버림', saved().stone[0].id === 'none' && saved().cur.t5.id === 'none' && saved().fix.t5 === 'auto' && saved().skills[10].type === 'awakening' && saved().evil === undefined && saved().baseCrit === 0);
  ok('악의적 파일: 이름은 글자 그대로 표시', b('label').value === '<svg onload="window.__xss3=1">' && q('#toolMsg').textContent.includes('<svg onload') && q('#results').textContent.includes('<script>window.__xss3=1</script>'));
  ok('악의적 파일을 불러온 뒤에도 계산 정상', qa('#results .card').length === 4 && !bad(q('#results').innerText));
  q('#exportBtn').click();
  const fe = await grab();
  ok('그 상태를 저장한 파일 이름에 금지 문자 없음', !/[\\/:*?"<>|]/.test(fe.name) && fe.name.endsWith('.json'), fe.name);

  await give(fa.text, 'a.json');   // 새로고침 확인용으로 기록 A를 남긴다
  HTMLAnchorElement.prototype.click = origClick;
  ok('오류 없이 끝남', JSON.stringify(saved()) === A);
}

if (phase === 11) {   // 10단계 뒤 새로고침
  ok('새로고침 후에도 불러온 기록이 유지됨', b('label').value === '기상술사 / 질풍' && b('baseCrit').value === '412' && b('fix.t3.strike').value === '2' && b('skills.0.dir').value === 'back' && b('stone.0.id').value === 'blunt');
  ok('새로고침 후 안내 문구는 비어 있음', q('#toolMsg').textContent === '');
  localStorage.removeItem(KEY);
}

return { phase, pass: res.filter(r => r.ok).length, fail: res.filter(r => !r.ok), info: res.filter(r => r.name === 'info') };

// 정적 검사: 문법, 외부 의존성, 참조 누락, 데이터 표의 형식.  실행: node research/test_static.js
const vm = require('vm');
const fs = require('fs');
const { LOA, html, htmlPath, engineCode, uiCode, makeReporter } = require('./_load.js');
const T = makeReporter('정적 검사');

T.section('파일 형식');
const raw = fs.readFileSync(htmlPath);
T.ok('UTF-8 BOM 없음', !(raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF));
T.ok('UTF-8로 손실 없이 해석', Buffer.from(raw.toString('utf8'), 'utf8').equals(raw));
T.ok('doctype', /^<!doctype html>/i.test(html));
T.ok('lang="ko"', /<html lang="ko">/.test(html));
T.ok('viewport 메타', /<meta name="viewport"/.test(html));
T.ok('title', /<title>[^<]+<\/title>/.test(html));
T.ok('파일 크기 1MB 미만', raw.length < 1e6, raw.length + ' bytes');

T.section('스크립트 문법');
let ok = true; try { new vm.Script(engineCode, { filename: 'engine' }); } catch (e) { ok = false; console.log(e.message); }
T.ok('엔진 스크립트 파싱', ok);
ok = true; try { new vm.Script(uiCode, { filename: 'ui' }); } catch (e) { ok = false; console.log(e.message); }
T.ok('UI 스크립트 파싱', ok);
T.ok('스크립트 블록은 2개', (html.match(/<script/g) || []).length === 2);
T.ok('엔진은 DOM을 쓰지 않음', !/\b(document|window|localStorage)\b/.test(engineCode));
T.ok('엔진에 console 출력 없음', !/console\./.test(engineCode));
T.ok('UI의 console은 오류 보고뿐', (uiCode.match(/console\.\w+/g) || []).every(x => x === 'console.error'));
T.ok('eval / new Function 미사용', !/\beval\(|new Function\(/.test(engineCode + uiCode));

T.section('외부 의존성 (오프라인 단일 파일)');
T.ok('외부 스크립트·스타일 없음', !/<script[^>]+src=|<link[^>]+href=/i.test(html));
T.ok('http(s) 리소스 요청 없음', !/(src|href|url\()\s*=?\s*["'(]?https?:/i.test(html));
T.ok('fetch / XHR / import 없음', !/\bfetch\(|XMLHttpRequest|\bimport\s*\(/.test(uiCode + engineCode));
T.ok('@import / 웹폰트 없음', !/@import|@font-face/.test(html));

T.section('참조 누락');
const ids = new Set((html.match(/\bid="([^"]+)"/g) || []).map(s => s.slice(4, -1)));
const used = new Set((uiCode.match(/\$\('#([\w-]+)[ ')]/g) || []).map(s => s.match(/#([\w-]+)/)[1]));
used.forEach(id => T.ok(`#${id} 요소 존재`, ids.has(id) || new RegExp(`id="${id}"`).test(uiCode)));
const secKeys = (uiCode.match(/const sections = \{([^}]+)\}/) || [])[1] || '';
secKeys.split(',').map(s => s.split(':')[0].trim()).filter(Boolean).forEach(k => T.ok(`section#${k} 존재`, ids.has(k)));
const rr = new Set((uiCode.match(/rr: '(\w+)'/g) || []).map(s => s.slice(5, -1)).concat((uiCode.match(/data-rr="(\w+)"/g) || []).map(s => s.slice(9, -1))));
rr.forEach(k => T.ok(`다시 그리기 대상 "${k}"가 sections에 있음`, new RegExp(`\\b${k}: render`).test(secKeys)));
T.ok('제거한 가정 옵션의 잔재 없음', !/asm\.|hAdd|awkEvo|awkSwift/.test(html));
const cssVars = new Set((html.match(/var\(--[\w-]+\)/g) || []).map(s => s.slice(4, -1)));
cssVars.forEach(v => T.ok(`CSS 변수 ${v} 정의됨`, new RegExp(`${v}:`).test(html)));
const lightVars = (html.match(/:root\{([^}]+)\}/) || [])[1].match(/--[\w-]+(?=:)/g);
const darkVars = (html.match(/prefers-color-scheme: dark\)\{\s*:root\{([^}]+)\}/) || [])[1].match(/--[\w-]+(?=:)/g);
T.ok('다크 모드가 모든 색 변수를 재정의', lightVars.every(v => darkVars.includes(v)), lightVars.filter(v => !darkVars.includes(v)).join(','));

T.section('데이터 표 형식');
T.ok('각인 16종', LOA.ENGR_ORDER.length === 16);
LOA.ENGR_ORDER.forEach(id => {
  const e = LOA.ENGR[id];
  T.ok(`${id}: 이름·수치·스톤 4단계`, typeof e.name === 'string' && e.name && Number.isFinite(e.val) && Array.isArray(e.stone) && e.stone.length === 4
    && e.stone.every((v, i) => v > 0 && (i === 0 || v > e.stone[i - 1])));
});
T.ok('각인 이름 중복 없음', new Set(LOA.ENGR_ORDER.map(id => LOA.ENGR[id].name)).size === 16);
Object.keys(LOA.BRACELET).forEach(id => {
  const b = LOA.BRACELET[id];
  if (id === 'none') return T.ok('팔찌 none', b.name === '없음');
  T.ok(`팔찌 ${id}: 유물/고대 3단계, 오름차순, 고대 ≥ 유물`, b.relic.length === 3 && b.ancient.length === 3
    && b.relic.every((v, i) => (i === 0 || v > b.relic[i - 1]) && b.ancient[i] >= v) && b.ancient.every((v, i) => i === 0 || v > b.ancient[i - 1]));
  T.ok(`팔찌 ${id}: 효과 종류 유효`, b.eff === undefined || ['cr', 'cd', 'add', 'speed'].includes(b.eff));
});
T.ok('팔찌 옵션 이름 중복 없음', new Set(Object.values(LOA.BRACELET).map(b => b.name)).size === Object.keys(LOA.BRACELET).length);
T.ok('2티어 노드 5종, 한계 돌파만 3레벨', Object.keys(LOA.T2).length === 5 && Object.keys(LOA.T2).every(k => LOA.T2[k].max === (k === 'limit' ? 3 : 2)));
T.ok('3티어 노드 5종, 모두 2레벨', Object.keys(LOA.T3).length === 5 && Object.values(LOA.T3).every(n => n.max === 2));
T.ok('4티어 노드 3종', Object.keys(LOA.T4).length === 3);
T.ok('5티어 노드 5종', Object.keys(LOA.T5).length === 5);
T.ok('상수: 치명 27.944 / 신속 58.2449·58.2211·46.5731', LOA.K.CRIT === 27.944 && LOA.K.SWIFT_AS === 58.2449 && LOA.K.SWIFT_MS === 58.2211 && LOA.K.SWIFT_CDR === 46.5731);
T.ok('상수: 속도 상한 40, 서포터 진피 12·공이속 9, 펫 160, 1티어 50', LOA.K.CAP === 40 && LOA.K.PARTY_EVO === 12 && LOA.K.PARTY_SPEED === 9 && LOA.K.PET === 160 && LOA.K.T1 === 50);

T.done();

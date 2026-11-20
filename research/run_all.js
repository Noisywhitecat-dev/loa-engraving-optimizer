// 자동 테스트 전체 실행.  실행: node research/run_all.js   (약 1~2분)
// 브라우저 UI 테스트(research/ui_test.js)는 페이지 안에서 따로 돌린다. 파일 머리말 참고.
const { spawnSync } = require('child_process');
const path = require('path');
const suites = [
  ['정적 검사', 'test_static.js'],
  ['엔진 단위 테스트', 'test_engine.js'],
  ['데이터·성질·최적화·시뮬레이션', 'test_properties.js'],
  ['독립 구현(Python) 대조', 'test_cross.js'],
  ['입력 검증·저장 파일', 'test_state_file.js']
];
let failed = 0;
for (const [name, file] of suites) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const fails = out.split('\n').filter(l => /FAIL|✗/.test(l));
  const okLines = (out.match(/^ok /gm) || []).length;
  const summary = (out.match(/\[.*\] 통과 (\d+) \/ 실패 (\d+)/) || [])[0] || `ok ${okLines}줄`;
  const bad = r.status !== 0 || fails.length > 0;
  if (bad) failed++;
  console.log(`${bad ? '실패' : '통과'}  ${name} — ${summary} (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  fails.slice(0, 20).forEach(l => console.log('      ' + l.trim()));
}
console.log(failed ? `\n${failed}개 묶음 실패` : '\n모든 묶음 통과');
process.exit(failed ? 1 : 0);

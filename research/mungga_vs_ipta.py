# 뭉툭한 가시 vs 입식 타격가 손익분기 계산 (2026-11-18 다중 치명타 패치 기준)
# 실행: python -X utf8 mungga_vs_ipta.py
#
# 가정
#  - 진화형 피해(진피)는 한 그룹 안에서 합연산, 다른 그룹과는 곱연산
#  - 다중 치명타: 기대 배율 = 1 + CR * (CD - 1)  (CR > 100%도 선형, 상한 없음)
#  - '치명타 적중 시' 곱연산 효과 H(회심 등)는 치명타 적중 시 1회만 곱해짐
#  - 뭉가: 치적 80% 고정, 다중 치명타 없음, 초과 치적 x 1.2/1.4 -> 진피, 상한 없음
#  - 입타: 6/12% + 스택당 0.75/1.5% (최대 6스택) -> 풀스택 10.5/21%
#  - 공통 요소(공증, 추피, 적주피, 예둔 0.98 패널티 등)는 양쪽에 같이 곱해지므로 비교에서 소거

def crit_mult(cr, cd, h=0.0):
    if cr <= 1:
        return (1 - cr) + cr * cd * (1 + h)
    return (1 + h) * (1 + cr * (cd - 1))


def ipta(cr, cd, E, h=0.0, stacks=6.0, lv=2):
    evo = (0.06 + 0.0075 * stacks) if lv == 1 else (0.12 + 0.015 * stacks)
    return (1 + E + evo) * crit_mult(cr, cd, h)


def mungga(cr, cd, E, h=0.0, lv=2):
    base, conv = (0.095, 1.2) if lv == 1 else (0.19, 1.4)
    evo = base + conv * max(0.0, cr - 0.8)
    return (1 + E + evo) * crit_mult(min(cr, 0.8), cd, h)


def breakeven(cd, E, h=0.0, stacks=6.0):
    """뭉가 2Lv가 입타 2Lv를 넘어서는 최소 총 치적. None = 3.0(300%)까지 못 넘음."""
    f = lambda cr: mungga(cr, cd, E, h) - ipta(cr, cd, E, h, stacks)
    lo, hi = 0.0, 3.0
    if f(lo) >= 0:
        return 0.0
    if f(hi) < 0:
        return None
    for _ in range(60):
        m = (lo + hi) / 2
        lo, hi = (m, hi) if f(m) < 0 else (lo, m)
    return (lo + hi) / 2


def fmt(b):
    return "  never" if b is None else f"{b:>7.1%}"


CDS = (2.0, 2.2, 2.5, 2.7, 3.0)

print("[1] 뭉가 2Lv가 입타 2Lv(풀스택 21%)를 이기기 시작하는 총 치적 (회심 없음)")
print("    타 진피 E / 치피 ", *[f"{cd:>7.0%}" for cd in CDS])
for E in (0.2, 0.3, 0.4, 0.6, 0.8, 1.0):
    print(f"    {E:>6.0%}           ", *[fmt(breakeven(cd, E)) for cd in CDS])

print("\n[2] 회심(치명 적중 시 적주피 +12%) 채용 시")
for E in (0.2, 0.4, 0.6):
    print(f"    {E:>6.0%}           ", *[fmt(breakeven(cd, E, h=0.12)) for cd in CDS])

print("\n[3] 입타 평균 스택 영향 (치피 250%, E=40%)")
print("    평균 4.67스택 이하면 치적과 무관하게 뭉가 2Lv(기본 19%)가 우위")
for s in (6, 5.5, 5, 4.67):
    print(f"    평균 {s}스택 -> 손익분기 치적 {fmt(breakeven(2.5, 0.4, stacks=s))}")
print("    스택 모델: 피격이상 1회 = -3스택, 2초당 +1 회복 -> 1회당 12 스택·초 손실")
for gap in (60, 30, 15, 9, 6):
    print(f"      {gap:>2}초마다 막지 못한 피격이상 1회 -> 평균 {6 - 12 / gap:.2f}스택")

print("\n[4] 예시: E=40%, 치피 250%")
for cr in (0.8, 0.9, 1.0, 1.1, 1.2, 1.4):
    a, b = ipta(cr, 2.5, 0.4), mungga(cr, 2.5, 0.4)
    print(f"    치적 {cr:>4.0%}: 입타 {a:.3f}  뭉가 {b:.3f}  뭉가/입타 {b / a - 1:+.2%}")

print("\n[5] 5티어 30포인트 분배: 뭉가1+입타1(풀스택) vs 뭉가2 (둘 다 치적 80% 고정)")
for cr in (0.8, 0.85, 0.9, 1.0, 1.2):
    ex = max(0.0, cr - 0.8)
    print(f"    치적 {cr:>4.0%}: 뭉가1+입타1 진피 {0.095 + 1.2 * ex + 0.105:.1%}   뭉가2 진피 {0.19 + 1.4 * ex:.1%}")

print("\n[6] 고치적 극한: 치적 1%p당 이득이 뭉가 쪽이 크려면 1.4*(1+0.8c) > (1+E+0.21)*c, c=치피-1")
for cd in (2.0, 2.5, 3.0):
    c = cd - 1
    print(f"    치피 {cd:.0%}: 타 진피 E < {1.4 * (1 + 0.8 * c) / c - 1.21:.1%} 이면 치적이 오를수록 뭉가가 유리")

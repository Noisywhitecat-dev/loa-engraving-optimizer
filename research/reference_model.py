# 독립 구현 참조 모델.
# index.html의 엔진 코드를 옮긴 것이 아니라 damage_model_research.md의 규칙을 보고 따로 작성했다.
# test_cross.js가 만든 사례(JSON)를 읽어 스킬별 수치와 세팅 간 DPS 비율을 계산해 JSON으로 돌려준다.
#   python -X utf8 reference_model.py cases.json out.json
import json
import math
import sys

CRIT_STAT_PER_PCT = 27.944
SWIFT_PER_ATTACK_SPEED_PCT = 58.2449
SWIFT_PER_MOVE_SPEED_PCT = 58.2211
SWIFT_PER_COOLDOWN_PCT = 46.5731
SPEED_CAP = 40.0            # 140% 상한 = 증가량 40%p
SUPPORT_EVO = 12.0          # 정열의 춤사위
SUPPORT_SPEED = 9.0         # 축복의 여신
PET_STAT = 160
STAT_PER_T1_POINT = 50

STONE_STD = [3, 3.75, 5.25, 6]
STONE_BIG = [7.5, 9.4, 13.2, 15]
STONE_DIR = [2.7, 3.4, 4.7, 5.4]
STONE_ADR = [0.48, 0.6, 0.83, 0.95]
STONE_TABLE = {
    'grudge': STONE_STD, 'doll': STONE_STD, 'tenacity': STONE_STD, 'barricade': STONE_STD, 'stable': STONE_STD,
    'mass': STONE_STD, 'hit': STONE_STD, 'charge': STONE_STD, 'rapid': STONE_STD, 'mana': STONE_STD, 'dagger': STONE_STD,
    'blunt': STONE_BIG, 'raid': STONE_BIG, 'ambush': STONE_DIR, 'duel': STONE_DIR, 'adrenaline': STONE_ADR,
}
# 조건 없이 모든 스킬에 곱해지는 "적에게 주는 피해" 각인
ALWAYS_ON_DAMAGE = {'grudge': 21, 'doll': 17, 'tenacity': 17, 'barricade': 17, 'stable': 17, 'mass': 19}

BRACELET_VALUES = {
    'crH': ('crit_rate', [2.6, 3.4, 4.2], [3.4, 4.2, 5.0], True),
    'cdH': ('crit_damage', [5.2, 6.8, 8.4], [6.8, 8.4, 10.0], True),
    'cr': ('crit_rate', [2.6, 3.4, 4.2], [3.4, 4.2, 5.0], False),
    'cd': ('crit_damage', [5.2, 6.8, 8.4], [6.8, 8.4, 10.0], False),
    'add': ('additional', [2.5, 3.0, 3.5], [3.0, 3.5, 4.0], False),
    'addDemon': ('additional', [2.0, 2.5, 3.0], [2.5, 3.0, 3.5], False),
    'speed': ('speed', [3, 4, 5], [4, 5, 6], False),
    'wpSpeed': ('speed', [6, 6, 6], [6, 6, 6], False),   # 공이속 1% × 6중첩
}


def stone_bonus(inp, engraving):
    for slot in inp.get('stone') or []:
        if slot and slot.get('id') == engraving:
            level = int(round(slot.get('lv', 0)))
            if level <= 0:
                return 0.0
            return STONE_TABLE[engraving][min(max(level, 1), 4) - 1]
    return 0.0


def bracelet_totals(inp):
    totals = {'crit_rate': 0.0, 'crit_damage': 0.0, 'additional': 0.0, 'speed': 0.0, 'on_crit_lines': 0}
    bracelet = inp.get('bracelet') or {}
    column = 1 if bracelet.get('grade') == 'relic' else 2
    for slot in bracelet.get('slots') or []:
        if not slot or slot.get('id') not in BRACELET_VALUES:
            continue
        entry = BRACELET_VALUES[slot['id']]
        tier = min(max(int(round(slot.get('tier', 0))), 0), 2)
        totals[entry[0]] += entry[column][tier]
        if entry[3]:
            totals['on_crit_lines'] += 1
    return totals


def expected_crit_multiplier(rate_pct, damage_pct, on_crit):
    """치적(%)·치피(%)·치명 시 피해(배수-1)로부터 기대 배율. 100% 초과분은 다중 치명타."""
    rate = max(rate_pct, 0.0) / 100.0
    bonus = damage_pct / 100.0 - 1.0
    guaranteed = math.floor(rate)
    chance_of_one_more = rate - guaranteed
    if guaranteed == 0:
        return (1 - chance_of_one_more) * 1.0 + chance_of_one_more * (1 + bonus) * (1 + on_crit)
    low = (1 + guaranteed * bonus) * (1 + on_crit)
    high = (1 + (guaranteed + 1) * bonus) * (1 + on_crit)
    return (1 - chance_of_one_more) * low + chance_of_one_more * high


def sonic_breakthrough(attack_inc, move_inc, level):
    scale = level / 2.0
    capped = min(max(attack_inc, 0), SPEED_CAP) + min(max(move_inc, 0), SPEED_CAP)
    total = 0.10 * scale * capped
    if attack_inc > SPEED_CAP + 1e-9 and move_inc > SPEED_CAP + 1e-9:
        total += 8 * scale + 0.30 * scale * ((attack_inc - SPEED_CAP) + (move_inc - SPEED_CAP))
    return min(total, 24 * scale)


class Setup:
    """세팅 하나가 캐릭터에 주는 공통 효과."""

    def __init__(self, build, inp):
        self.inp = inp
        self.build = build
        self.engravings = set(e for e in (build.get('engr') or []) if e in STONE_TABLE)
        t1, t2, t3, t4 = build['t1'], build['t2'], build['t3'], build['t4']
        self.t2, self.t3, self.t4 = t2, t3, t4
        self.t5 = build.get('t5') or {'id': 'none', 'lv': 0}
        br = bracelet_totals(inp)
        pet = build.get('pet')
        crit_stat = inp['baseCrit'] + STAT_PER_T1_POINT * t1['crit'] + (PET_STAT if pet == 'crit' else 0)
        swift_stat = inp['baseSwift'] + STAT_PER_T1_POINT * t1['swift'] + (PET_STAT if pet == 'swift' else 0)

        # 치명타 적중률: 전부 합연산
        rate = crit_stat / CRIT_STAT_PER_PCT + inp['otherCR'] + br['crit_rate']
        rate += 10 if inp.get('syn10') else 0
        rate += 20 if inp.get('syn20') else 0
        rate += 4 * t2['keen'] + 12 * t3['allout'] + 10 * t3['strike']
        rate += 1.4 * 5 if t4['master'] else 0
        if 'adrenaline' in self.engravings:
            rate += 20
        if 'dagger' in self.engravings:
            rate += 21 + stone_bonus(inp, 'dagger')
        self.crit_rate = rate

        # 치명타 피해: 전부 합연산 (기본 200%)
        dmg = 200 + inp['otherCD'] + br['crit_damage']
        if 'blunt' in self.engravings:
            dmg += 52 + stone_bonus(inp, 'blunt')
        if 'dagger' in self.engravings:
            dmg -= 6
        self.crit_damage = dmg

        # 진화형 피해: 전부 합연산
        evo = SUPPORT_EVO + inp['karma'] * 1.0 + inp['otherEvo']
        evo += 5 * t2['forbidden'] + 5 * t2['keen'] + 10 * t2['limit'] + 5 * t2['optim']
        evo += 8 * t3['infinite'] + 2 * t3['allout'] + 12 * t3['tank'] + 8 * t3['timing']
        evo += 20 if t4['crush'] else 0
        self.evo = evo

        # 치명타 적중 시 피해: 회심 × 팔찌(같은 문구는 합산) × 기타
        on_crit = 1.0
        if t4['crit']:
            on_crit *= 1.12
        on_crit *= 1 + 0.015 * br['on_crit_lines']
        on_crit *= 1 + inp.get('otherH', 0) / 100.0
        self.on_crit = on_crit - 1

        # 공격력 %: 합연산
        attack = inp['otherAtk']
        if 'adrenaline' in self.engravings:
            attack += 6 * (0.9 + stone_bonus(inp, 'adrenaline'))
        self.attack_factor = 1 + attack / 100.0

        # 추가 피해: 합연산
        additional = inp['otherAdd'] + br['additional'] + (1.7 * 5 if t4['master'] else 0)
        self.additional_factor = 1 + additional / 100.0

        # 속도
        self.attack_speed = (swift_stat / SWIFT_PER_ATTACK_SPEED_PCT + inp['extraAS'] + SUPPORT_SPEED + br['speed']
                             + 4 * t3['tank'] - (10 if 'mass' in self.engravings else 0))
        self.move_speed = swift_stat / SWIFT_PER_MOVE_SPEED_PCT + inp['extraMS'] + SUPPORT_SPEED + br['speed']

        # 쿨타임
        self.swift_cooldown = swift_stat / SWIFT_PER_COOLDOWN_PCT / 100.0
        self.mana_cooldown = (7 * t2['endless'] + 7 * t3['infinite']) / 100.0     # 같은 묶음: 합연산
        self.training_cooldown = (4 * t2['optim'] + 5 * t3['timing']) / 100.0     # 같은 묶음: 합연산

    def engraving_factor(self, sk, success):
        inp, on = self.inp, self.engravings
        awakening = sk.get('type') == 'awakening'
        factor = 1.0
        for name, value in ALWAYS_ON_DAMAGE.items():
            if name in on:
                factor *= 1 + (value + stone_bonus(inp, name)) / 100.0
        if 'raid' in on:
            usable_move = min(max(self.move_speed, 0), SPEED_CAP)
            factor *= 1 + usable_move * (48 + stone_bonus(inp, 'raid')) / 100.0 / 100.0
        if 'blunt' in on:
            factor *= 0.9 * 1.0 + 0.1 * 0.8          # 10% 확률로 20% 감소
        if not awakening:
            if 'ambush' in on:
                factor *= 1 + (7.6 + stone_bonus(inp, 'ambush') + (15 if success and sk['dir'] == 'back' else 0)) / 100.0
            if 'duel' in on:
                factor *= 1 + (7.6 + stone_bonus(inp, 'duel') + (15 if success and sk['dir'] == 'head' else 0)) / 100.0
            if 'hit' in on and sk['dir'] == 'none':
                factor *= 1 + (17 + stone_bonus(inp, 'hit')) / 100.0
        if 'charge' in on and sk.get('charge'):
            factor *= 1 + (21 + stone_bonus(inp, 'charge')) / 100.0
        if 'rapid' in on and sk.get('hold'):
            factor *= 1 + (21 + stone_bonus(inp, 'rapid')) / 100.0
        if 'mana' in on and sk.get('mana', 0) > 0:
            factor *= 1 + (16 + stone_bonus(inp, 'mana')) / 100.0
        return factor

    def one_hit(self, sk, success):
        directional = sk['dir'] != 'none'
        rate = max(0.0, self.crit_rate + sk['cr'] + (10 if success and sk['dir'] == 'back' else 0))
        dmg = self.crit_damage + sk['cd'] + (16 * self.t3['strike'] if directional else 0)
        evo = self.evo + (5 * self.t2['forbidden'] if sk.get('mana', 0) > 0 else 0)
        node, level = self.t5.get('id'), self.t5.get('lv', 0)
        shown_rate = rate
        if node == 'thorn':
            base, conversion = (19.0, 1.4) if level == 2 else (9.5, 1.2)
            evo += base + conversion * max(0.0, rate - 80)
            rate = min(rate, 80.0)
        elif node == 'stand':
            evo += (12 + 1.5 * 6) if level == 2 else (6 + 0.75 * 6)
        elif node == 'infight':
            evo += 18 if level == 2 else 9
        elif node == 'sonic':
            evo += sonic_breakthrough(self.attack_speed, self.move_speed, level)
        elif node == 'furnace' and sk.get('mana', 0) > 0:
            per_ten = 0.5 if level == 2 else 0.25
            evo += min(24.0 if level == 2 else 12.0, sk['mana'] / 10.0 * per_ten)
        value = (self.attack_factor * self.additional_factor * (1 + evo / 100.0)
                 * expected_crit_multiplier(rate, dmg, self.on_crit) * self.engraving_factor(sk, success))
        if success:
            value *= 1.05 if sk['dir'] == 'back' else 1.20 if sk['dir'] == 'head' else 1.0
        return {'value': value, 'rate': shown_rate, 'effective': rate, 'dmg': dmg, 'evo': evo}

    def skill(self, sk):
        p = 0.0 if sk['dir'] == 'none' else min(max(sk['p'], 0), 100) / 100.0
        miss = self.one_hit(sk, False)
        hit = self.one_hit(sk, True) if p > 0 else miss
        cooldown = 1 - self.swift_cooldown
        if sk.get('mana', 0) > 0:
            cooldown *= 1 - self.mana_cooldown
        if sk.get('type') != 'awakening':
            cooldown *= 1 - self.training_cooldown
        return {
            'M': p * hit['value'] + (1 - p) * miss['value'],
            'cr': p * hit['rate'] + (1 - p) * miss['rate'],
            'cd': miss['dmg'],
            'evo': p * hit['evo'] + (1 - p) * miss['evo'],
            'hit': p * min(hit['effective'], 100) + (1 - p) * min(miss['effective'], 100),
            'multi': p * max(0, hit['effective'] - 100) + (1 - p) * max(0, miss['effective'] - 100),
            'cdf': cooldown,
        }


def dps_ratio(inp, new_rows, cur_rows):
    total, weight = 0.0, 0.0
    for sk, new, cur in zip(inp['skills'], new_rows, cur_rows):
        share = max(0.0, sk['share'])
        if share == 0:
            continue
        r = min(max(sk['r'], 0), 100) / 100.0
        cooldown_ratio = new['cdf'] / cur['cdf']
        # 한 사이클 = 쿨타임 + 대기. 대기 시간은 그대로이고 쿨타임만 cooldown_ratio배가 된다.
        old_cycle = 1.0
        new_cycle = r * cooldown_ratio + (1 - r)
        total += share * (new['M'] / cur['M']) * (old_cycle / new_cycle)
        weight += share
    return total / weight if weight else 1.0


def main():
    cases = json.load(open(sys.argv[1], encoding='utf-8'))
    out = []
    for case in cases:
        inp = case['inp']
        a, c = Setup(case['build'], inp), Setup(case['cur'], inp)
        rows = [a.skill(sk) for sk in inp['skills']]
        cur_rows = [c.skill(sk) for sk in inp['skills']]
        out.append({'rows': rows, 'ratio': dps_ratio(inp, rows, cur_rows), 'AS': a.attack_speed, 'MS': a.move_speed,
                    'H': a.on_crit, 'atk': a.attack_factor, 'add': a.additional_factor})
    json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'))


if __name__ == '__main__':
    main()

# -*- coding: utf-8 -*-
"""서브셋에 남길 문자 집합을 stdout으로 출력한다.

범위: KS X 1001 완성형 한글 2350자 + ASCII(라틴·숫자·문장부호) + 한글 자모 + 상용 기호.

왜 2350자인가 — 한글 음절은 유니코드에 11172자가 있지만 실제 한국어 표기에 쓰이는 것은
KS X 1001 완성형 2350자가 사실상 전부다. 11172자를 다 넣으면 파일이 5배 커지고, 반대로
"화면에 지금 있는 글자만" 넣으면 사용자가 입력하는 Context·컬렉션 이름에서 두부(tofu)가 난다.
2350자는 그 사이의 표준적인 타협점이다.

⚠️ 이 범위 밖 음절(예: 옛한글, 희귀 음절)은 폴백 폰트로 그려진다. 범위를 바꾸려면 이 파일만
고치고 build.sh를 다시 돌리면 된다.
"""

import sys

chars = set()

# KS X 1001 완성형 한글 2350자.
# 하드코딩한 목록을 들고 있지 않고 euc-kr 코덱에서 역산한다 — 목록을 손으로 관리하면
# 오타가 나도 아무도 모른다. 리드 0xB0~0xC8, 트레일 0xA1~0xFE가 완성형 한글 영역이다.
for lead in range(0xB0, 0xC9):
    for trail in range(0xA1, 0xFF):
        try:
            ch = bytes([lead, trail]).decode("euc_kr")
        except UnicodeDecodeError:
            continue
        if "가" <= ch <= "힣":
            chars.add(ch)

hangul_count = len(chars)
if hangul_count != 2350:
    raise SystemExit(f"완성형 한글이 2350자가 아니다: {hangul_count}자")

# 라틴 기본 + 숫자 + ASCII 문장부호 (U+0020~U+007E)
chars.update(chr(cp) for cp in range(0x20, 0x7F))

# 단독으로 쓰이는 한글 자모(예: 'ㄱ~ㅎ 순 정렬', 초성 검색 UI)
chars.update("ㄱㄲㄳㄴㄵㄶㄷㄸㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅃㅄㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")
chars.update("ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ")

# UI에서 실제로 쓰는 기호(가운뎃점·말줄임표·화살표·별표·통화기호 등)
chars.update("·–—‘’“”…※×±←↑→↓●○■□★☆✓₩©®™° ")

sys.stdout.write("".join(sorted(chars)))
print(f"[한글 {hangul_count}자 + 기타 {len(chars) - hangul_count}자 = 총 {len(chars)}자]", file=sys.stderr)

#!/usr/bin/env bash
#
# 원본 TTF → 서브셋 WOFF2 변환. 산출물은 public/fonts/*.woff2 다.
#
#   ./fonts-src/build.sh
#
# 선행 조건:
#   pip install fonttools brotli
#   (brotli 없이는 --flavor=woff2가 실패한다)
#
# 왜 원본을 그대로 서빙하지 않나 — 한글 폰트 원본은 2~5MB다. public/에 그대로 두면 Vite가
# dist로 통째로 복사해 CDN보다 느려지고, 폰트를 로컬 번들한 이유("로딩 딜레이 제거") 자체가
# 뒤집힌다. 그래서 원본은 서빙되지 않는 이 디렉터리(fonts-src/)에 보관하고, 서브셋만
# public/fonts/로 내보낸다.
#
# 근거: Jira S15P11A705-357
set -euo pipefail

cd "$(dirname "$0")/.."
SRC=fonts-src
OUT=public/fonts
CHARSET="$(mktemp)"
trap 'rm -f "$CHARSET"' EXIT

command -v pyftsubset >/dev/null || {
  echo "pyftsubset이 없다. 먼저: pip install fonttools brotli" >&2
  exit 1
}

python3 "$SRC/charset.py" > "$CHARSET"
mkdir -p "$OUT"

subset() {
  # $1 원본 파일명, $2 산출 파일명
  #
  # --name-IDs: 저작권(0)·폰트명(1,4)·버전(5)·상표(7)·제작자(8,9)·라이선스(13,14)를 남긴다.
  #   서브셋은 "수정본"이라 라이선스 고지가 결과물에도 따라가야 한다. 기본값은 대부분 버린다.
  # --layout-features: 커닝·합자만. 나머지 OpenType 기능은 이 앱에서 쓰지 않는다.
  # --no-hinting / --desubroutinize: 파일 크기를 줄인다. 웹에서는 힌팅을 거의 쓰지 않는다.
  pyftsubset "$SRC/$1" \
    --text-file="$CHARSET" \
    --output-file="$OUT/$2" \
    --flavor=woff2 \
    --layout-features='kern,liga,calt' \
    --no-hinting \
    --desubroutinize \
    --name-IDs='0,1,2,3,4,5,6,7,8,9,11,13,14' \
    --notdef-outline \
    --drop-tables+=DSIG
  printf '  %-28s %s\n' "$2" "$(du -h "$OUT/$2" | cut -f1)"
}

echo "서브셋 생성 중…"
# 380: 본문·표제 서체를 제주 3종으로 교체했다(잘난체 2·잘난고딕 제거). 역할 배정은
# tailwind.config.js의 fontFamily 주석을 보라.
#
# ⚠️ 교보 손글씨 2025는 여기 없다. 이 파이프라인 자체를 쓸 수 없는 라이선스라 반입을 보류했다 —
# 교보문고 자체 라이선스가 "수정 및 변경(디지털 포맷 변경)·개작·개명·재배포"를 금지하는데,
# 이 스크립트가 하는 일(TTF → 서브셋 WOFF2 변환)이 정확히 그 금지 대상이다. 근거와 결론은
# public/fonts/LICENSE 하단 "반입 보류" 항목에 적어 뒀다. 손글씨체는 OFL인 금은보화를 유지한다.
subset JejuGothic.ttf        jeju-gothic.woff2
subset JejuHallasan.ttf      jeju-hallasan.woff2
subset JejuMyeongjo.ttf      jeju-myeongjo.woff2
subset NanumGeumEunBoHwa.ttf nanum-geumeunbohwa.woff2

echo "완료. 합계: $(du -ch "$OUT"/*.woff2 | tail -1 | cut -f1)"

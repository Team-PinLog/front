import type { RecordMapItem } from '@/features/map/api/getRecordMapMarkers';
import { findRegionCodeForPoint, type RegionBoundary } from './regionBoundaries';

/**
 * 마커를 시·군·구로 나누고 색 농담을 정하는 계산. 근거: Jira S15P11A705-376.
 * 전부 순수 함수라 화면 없이 값으로 검증할 수 있다.
 */

export interface RegionRecordGroups {
  /** 시군구 코드 → 그 지역에 저장된 마커들. 기록이 없는 지역은 아예 키가 없다. */
  byCode: Map<string, RecordMapItem[]>;
  /** 한 지역에 몰린 최대 개수. 농담 단계를 나누는 기준이다. */
  maxCount: number;
  /**
   * 어느 지역에도 넣지 못한 기록 수. 바다 위 좌표, 북한·해외, 단순화로 잘려 나간 작은 섬 등이다.
   * 화면에는 나타나지 않으므로 이 값이 크면 데이터나 단순화 강도를 의심해야 한다 —
   * 그래서 세어서 밖으로 내보낸다(조용히 버리지 않는다).
   */
  unassignedCount: number;
}

export function groupRecordsByRegion(
  regions: readonly RegionBoundary[],
  items: readonly RecordMapItem[],
): RegionRecordGroups {
  const byCode = new Map<string, RecordMapItem[]>();
  let unassignedCount = 0;

  for (const item of items) {
    const code = findRegionCodeForPoint(regions, [item.lng, item.lat]);
    if (!code) {
      unassignedCount += 1;
      continue;
    }
    const bucket = byCode.get(code);
    if (bucket) {
      bucket.push(item);
    } else {
      byCode.set(code, [item]);
    }
  }

  let maxCount = 0;
  byCode.forEach((bucket) => {
    maxCount = Math.max(maxCount, bucket.length);
  });

  return { byCode, maxCount, unassignedCount };
}

/** 색 농담 단계 수(0 = 기록 없음). 1~4단계가 기록 있는 지역이다. */
export const REGION_SHADE_LEVELS = 4;

/**
 * 기록 수 → 농담 단계(0~4).
 *
 * 절대 개수가 아니라 **그 사용자의 최대치 대비 비율**로 나눈다. 기록이 3개인 사람과 300개인 사람이
 * 같은 그림을 보게 하려는 것이다 — 절대 기준(1~2개는 1단계, 3~5개는 2단계…)으로 두면 기록이 적은
 * 초기 사용자에게는 모든 칸이 가장 옅은 한 색으로만 보인다. 시군구 단위라 초기에는 칠해진 칸이
 * 적은 게 정상이고(티켓), 그 적은 칸들 사이의 차이라도 보이는 편이 낫다.
 */
export function getRegionShadeLevel(count: number, maxCount: number): number {
  if (count <= 0) {
    return 0;
  }
  if (maxCount <= 1) {
    return REGION_SHADE_LEVELS;
  }
  const ratio = count / maxCount;
  return Math.max(1, Math.ceil(ratio * REGION_SHADE_LEVELS));
}

/**
 * 농담 단계 → 채움 불투명도. 색 자체는 브랜드 토큰(log-mint)을 currentColor로 받아 쓰므로
 * **새 색 토큰을 만들지 않는다**(tailwind.config는 공유 파일이라 손대지 않는다는 판단).
 * 0단계(기록 없음)는 무채색 외곽선만 남기고 채우지 않는다.
 */
export function getRegionFillOpacity(level: number): number {
  const opacityByLevel = [0, 0.22, 0.42, 0.62, 0.85];
  return opacityByLevel[Math.min(Math.max(level, 0), REGION_SHADE_LEVELS)] ?? 0;
}

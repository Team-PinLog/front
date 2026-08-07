import { useState } from 'react';
import { PinPushMount } from '@/shared/ui/PinSymbols';
import { RecordPlaceMapSnapshot } from './RecordPlaceMapSnapshot';

interface RecordPolaroidStackProps {
  lat: number;
  lng: number;
  placeName: string;
  /** 4:3 장소 대표 이미지. 대부분 null이라 폴백이 기본 경로다(getRecordDetail 주석·api-contract DTO). */
  thumbnailUrl?: string | null;
}

/**
 * 사진이 없을 때(=`thumbnailUrl`이 null이거나 로드 실패) 폴라로이드 사진 칸을 채우는 그림.
 *
 * 실제 사진인 척하지 않는 게 목적이라 사진풍 기본 이미지 대신 명백한 일러스트다. 색은 노트
 * 페이지의 종이 톤(RecordNotebookPage)에 맞춘 한 벌만 쓴다 — 홈 카드(RecentRecordCard)의
 * PlacePhotoFallback은 같은 목적이지만 홈의 민트/블루 팔레트를 쓰고, 그 파일은 features/home
 * 소유라 여기서 끌어다 쓰지 않았다. 공용화한다면 shared/ui로 올리는 별도 판단이 필요하다.
 */
function PlacePhotoFallback() {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(150deg,#f6f2ec,#e9e3d9)] px-4 text-center"
      aria-hidden="true"
    >
      <svg viewBox="0 0 48 48" width="26" height="26" fill="none" stroke="#b8ae9f" strokeWidth={2}>
        <rect x="6" y="12" width="36" height="27" rx="4" />
        <circle cx="24" cy="26" r="7" />
        <path d="M18 12l3-4h6l3 4" />
      </svg>
      <span className="text-[11px] leading-relaxed text-[#a29d95]">
        아직 이 장소의 사진이 없어요
      </span>
    </div>
  );
}

/**
 * 종이를 판에 고정하는 핀. **앱의 기존 푸시핀(shared/ui/PinSymbols의 PinPushMount)을 그대로 쓴다.**
 *
 * 415 첫 판에서는 이 자리에 그라디언트로 직접 그린 초록 압정을 새로 만들었는데, 386에서 확정된
 * 푸시핀 심볼이 이미 shared/ui에 있었다(홈 '최근의 장소' 카드 RecentRecordCard, 홈 지도 포스터
 * MapPosterFrame이 쓴다). 같은 앱에서 종이를 꽂는 물건이 화면마다 다르면 안 된다.
 *
 * 색은 currentColor라 부모의 text-log-mint를 따른다 — MapPosterFrame이 지도를 꽂을 때 쓰는 것과
 * 같은 값이고, 그림자(PIN_PUSH_SHADOW)와 기울기(22deg)는 심볼이 이미 갖고 있다.
 */

/**
 * 415 최종 시안 우측 열: **압정으로 꽂힌 폴라로이드 + 압정으로 꽂힌 지도 조각**.
 *
 * 이 화면에서 과감함을 쓰는 단 한 곳이다(frontend-design — "boldness는 한 곳에"). 좌측 열
 * (글·포스트잇)은 그만큼 조용하게 둔다.
 *
 * 415 실물 피드백·최종 시안 반영:
 * - **색 필터를 걷어냈다.** 처음에는 지도에 세피아 필터 + 베이지 multiply + 안쪽 그림자를 얹어
 *   "종이에 인쇄된 지도"로 만들었는데, 지도는 정보이지 장식이 아니다 — 색을 바꾸면 실제 지도에서
 *   길·물·녹지를 가르던 색 구분이 흐려져 읽기 어려워진다. 지도는 있는 그대로 둔다.
 * - **선 테두리도 흰 매트도 없다.** "포스터처럼"이라는 지시를 매트 프레임으로 한 번 풀었지만
 *   최종 시안은 프레임이 보이지 않는다. 남는 건 종이 조각의 물성뿐이다 — 거의 각진 모서리,
 *   은은한 가장자리 그림자, 살짝 기울임, 그리고 우상단에 꽂힌 초록 압정.
 * - **압정으로 통일했다.** 지도에 쓰던 마스킹 테이프를 뺐다. 한 판 위의 두 장을 같은 방식으로
 *   꽂아 둔 쪽이 "게시판에 붙인 콜라주"로 읽히고, 테이프는 포스트잇 쪽 문법으로 남겨 두는 편이
 *   좌·우 열의 역할 구분에도 맞는다(왼쪽=붙인 종이, 오른쪽=꽂은 물건).
 * - **폴라로이드를 키우고 왼쪽으로 기울였다**(열 폭의 78%→88%, 테두리 7/24→9/30px, +3.6→-3.2deg).
 *   우측 열이 340px로 넓어진 만큼 사진이 이 열의 주인공이 되어야 한다.
 *
 * 373→415 변경: 이전에는 폴라로이드 **두 장**(지도 한 장 + 사진 한 장)이 서로 겹쳐 떠 있었다.
 * 시안은 지도를 폴라로이드에서 빼내 아래에 넓게 깔고, 폴라로이드는 사진 한 장만 남겨 지도 위에
 * 겹치게 한다 — 지도가 작은 액자에 갇혀 있을 때보다 "이 장소가 어디인지"가 읽힌다.
 *
 * 408 계약은 그대로 지킨다:
 * - 사진은 계약 비율인 **4:3**으로 자른다(비율은 테두리 없는 img 자신에게 건다 — 프레임에 걸면
 *   border-box에 테두리가 포함돼 사진이 4:3에서 어긋난다).
 * - `thumbnailUrl`이 null이거나 로드 실패면 같은 4:3 상자의 폴백으로 간다(높이가 달라지지 않는다).
 * - 받은 URL 문자열을 그대로 src에 넣는다(front#94 정정 코멘트).
 */
export function RecordPolaroidStack({
  lat,
  lng,
  placeName,
  thumbnailUrl,
}: RecordPolaroidStackProps) {
  // null뿐 아니라 로드 실패(깨진 URL)도 같은 폴백으로 보낸다(api-contract DTO — PlaceSummary).
  // boolean 대신 "실패한 URL"을 담는다 — 오버레이에서 다른 기록으로 넘어가 thumbnailUrl이 바뀌면
  // 이전 실패가 새 사진까지 막아버리기 때문이다(이 컴포넌트는 recordId로 remount되지 않는다).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoUrl = thumbnailUrl && thumbnailUrl !== failedUrl ? thumbnailUrl : null;

  return (
    // 상한을 열 폭에 맞춘다. 286px로 묶여 있던 동안 열 오른쪽이 비어 있었고, 사진을 키우라는
    // 지시(2번)가 그만큼 덜 반영됐다. 열은 맥락 콜라주에 폭을 내주며 340→300px로 줄었다.
    <div className="relative mx-auto flex w-full max-w-[296px] flex-1 flex-col">
      {/*
        지도 포스터. 폴라로이드는 absolute라 흐름에 높이를 보태지 않으므로, 이 위 여백이 곧 두 장이
        겹치는 깊이를 정한다. 19번 피드백("사진이 지도 위 절반을 덮는다")으로 50%→72%까지 내렸다 —
        폴라로이드 아래끝(≈열 폭의 74%)보다 조금 작은 값이라 이제 **모서리만** 스친다.
        88%까지 내려 봤더니 겹침이 아예 사라져 두 장이 따로 놀았다(실렌더 확인).
        지도는 열 폭의 92%에 오른쪽 정렬이다 — 왼쪽으로 기운 폴라로이드와 어긋나야 겹침이 산다.

        높이는 비율로 잡는다(5:6). 한때 flex-1로 남는 높이를 다 먹게 했더니 모달이 세로로 커지면서
        지도가 열 끝까지 늘어난 **두루마리**가 됐다 — 종이 한 조각으로 읽히지 않는다. 비율로 두면
        어떤 모달 높이에서도 같은 모양이고, 남는 높이는 페이지 여백으로 둔다.
      */}
      <div className="relative mt-[72%] aspect-[5/6] w-[92%] flex-none self-end rotate-[-1.2deg] text-log-mint">
        {/* 지도 **포스터**. 20번 지시로 재단선·캡션 판형을 걷어내고 레퍼런스대로 **사방 균일한
            흰 매트**를 두른다. 폴라로이드는 아래만 두꺼운 판형이라 두 장이 같은 형식이 아니고,
            그 차이가 "사진"과 "지도"를 가른다.

            남긴 인쇄물 문법은 하프톤 하나뿐이다 — 캡션(장소명·좌표)은 균일한 매트 안에서는 아래
            여백만 두껍게 만들어 매트를 깨므로 뺐다. 지도 색은 건드리지 않는다(3번 지시).
            21번: 그림자는 포스트잇 수준(alpha 0.10/0.14)까지 낮춘다. */}
        <div className="h-full w-full rounded-[2px] bg-white p-2.5 shadow-[0_1px_1px_rgba(60,54,48,0.10),0_3px_6px_-3px_rgba(60,54,48,0.16)]">
          <div className="relative h-full w-full overflow-hidden">
            <RecordPlaceMapSnapshot lat={lat} lng={lng} name={placeName} />
            {/* 하프톤: 3px 격자의 검정 3.5% 점. 색조를 바꾸지 않는 무채색 질감이다. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.035) 0.5px, transparent 0.5px)',
                backgroundSize: '3px 3px',
              }}
            />
          </div>
        </div>

        <PinPushMount height={30} className="right-2 top-0 -translate-y-1/2" />
      </div>

      {/* 폴라로이드: **왼쪽으로** 기운다(-3.2deg, 실물 피드백 8). 지도가 -1.2deg로 같은 쪽으로
          기울어 있어 사진까지 오른쪽으로 기울면 둘이 서로 벌어져 보였다 — 같은 방향으로 기울되
          각도를 크게 벌리면 한 손으로 붙인 두 장으로 읽힌다.
          아래 테두리를 두껍게 준 것이 폴라로이드의 "적는 칸"이다. */}
      {/* 21번: 그림자를 포스트잇과 같은 급으로 낮춘다(alpha 0.5 → 0.10/0.16). 종이 세 종류가
          모두 같은 세기로 눌려 있어야 한 판 위에 놓인 것으로 읽힌다. */}
      <div className="absolute -left-2 top-0 z-20 w-[88%] rotate-[-3.2deg] rounded-[3px] border-[9px] border-b-[30px] border-white bg-white text-log-mint shadow-[0_1px_1px_rgba(60,54,48,0.10),0_3px_6px_-3px_rgba(60,54,48,0.16)]">
        <PinPushMount height={36} className="-top-4 left-1/2 -translate-x-1/2" />
        <div className="overflow-hidden">
          {photoUrl ? (
            // 경로·확장자를 가정하지 않고 응답 문자열을 그대로 넣는다(front#94 정정 코멘트).
            <img
              src={photoUrl}
              alt={`${placeName} 사진`}
              onError={() => setFailedUrl(photoUrl)}
              className="block aspect-[4/3] w-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="aspect-[4/3] w-full">
              <PlacePhotoFallback />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

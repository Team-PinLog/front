import { useState } from 'react';
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
      <svg viewBox="0 0 48 48" width="30" height="30" fill="none" stroke="#b8ae9f" strokeWidth={2}>
        <rect x="6" y="12" width="36" height="27" rx="4" />
        <circle cx="24" cy="26" r="7" />
        <path d="M18 12l3-4h6l3 4" />
      </svg>
      <span className="text-xs leading-relaxed text-[#a29d95]">아직 이 장소의 사진이 없어요</span>
    </div>
  );
}

/**
 * 373 시안 우상단의 "폴라로이드 두 장"(지도 스냅샷 + 장소 사진). 흰 테두리 5px, 각각 1.2deg/-1.6deg
 * 회전, 서로 겹쳐 떠 있는 연출이다.
 *
 * 시안은 이 덩어리를 페이지에 absolute로 얹어 본문 위를 덮게 뒀지만(레이아웃 공간 0), 시안의
 * 페이지 폭은 1080px·비율 3/4이라 본문이 아래로 길게 흐르는 전제다. 실제 모달은 그보다 좁고
 * 세로도 뷰포트에 묶여서, 그대로 얹으면 키워드 칩과 포스트잇 위를 폴라로이드가 가린다.
 * 그래서 **폭만 오른쪽 열로 예약하고**(lg 이상) 그 안에서 시안 그대로 겹쳐 띄운다 — 회전과
 * 음수 오프셋으로 열 밖으로 삐져나오는 "떠 있는" 인상은 유지되고, 글자는 가리지 않는다.
 * lg 미만에서는 열을 만들지 않고 본문 위에 자연스럽게 쌓인다.
 *
 * 408: 사진 칸을 고정 px(228x163 = 1.40:1)에서 계약 비율인 **4:3**으로 맞추고, 스택 전체를
 * 고정 px 대신 비율·백분율로 다시 잡았다. 근거는 front#94 / api-contract DTO — PlaceSummary:
 * 썸네일은 4:3·가로 1200px 고정 제공이라 표시도 4:3으로 잘라야 한다.
 * - 스택: 폭 100%(최대 280px) + 세로 비율 280:330(= 기존 280x318을 사진 높이 증가분만큼 늘린 값).
 *   컨테이너 폭이 줄면 두 폴라로이드가 같은 비율로 함께 줄고, 시안의 겹침·삐져나옴은 유지된다.
 *   그래서 안쪽 배치도 px가 아니라 백분율로 적는다.
 * - 사진: 프레임 높이를 고정하지 않고 안쪽 img에 폭 100% + 비율 4/3 + object-fit cover를 준다.
 *   테두리 5px가 border-box에 포함돼 프레임 쪽에 비율을 걸면 사진이 4:3에서 어긋나므로,
 *   비율은 테두리가 없는 img 자신에게 건다.
 * - 폴백도 같은 4/3 상자라 사진 유무로 높이가 달라지지 않는다. 비율만으로 로딩 전 영역이
 *   확보돼 이미지가 늦게 와도 레이아웃이 밀리지 않는다.
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
    <div className="relative mx-auto aspect-[28/33] w-full max-w-[280px] flex-none lg:mx-0">
      <div className="absolute left-[-8.57%] top-0 h-[51.5%] w-[86.43%] rotate-[1.2deg] overflow-hidden rounded-[12px] border-[5px] border-white shadow-[0_8px_20px_-10px_rgba(60,54,48,0.4)]">
        <RecordPlaceMapSnapshot lat={lat} lng={lng} name={placeName} />
      </div>

      <div className="absolute left-[11.43%] top-[47%] z-[3] w-[81.43%] rotate-[-1.6deg] overflow-hidden rounded-[12px] border-[5px] border-white shadow-[0_10px_24px_-10px_rgba(60,54,48,0.45)]">
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
  );
}

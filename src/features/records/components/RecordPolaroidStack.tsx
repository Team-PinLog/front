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
 * 373 시안 우상단의 "폴라로이드 두 장"(지도 스냅샷 + 장소 사진). 흰 테두리 5px, 각각 1.2deg/-1.6deg
 * 회전, 서로 겹쳐 떠 있는 연출이다.
 *
 * 시안은 이 덩어리를 페이지에 absolute로 얹어 본문 위를 덮게 뒀지만(레이아웃 공간 0), 시안의
 * 페이지 폭은 1080px·비율 3/4이라 본문이 아래로 길게 흐르는 전제다. 실제 모달은 그보다 좁고
 * 세로도 뷰포트에 묶여서, 그대로 얹으면 키워드 칩과 포스트잇 위를 폴라로이드가 가린다.
 * 그래서 **폭만 오른쪽 열로 예약하고**(lg 이상) 그 안에서 시안 그대로 겹쳐 띄운다 — 회전과
 * 음수 오프셋으로 열 밖으로 삐져나오는 "떠 있는" 인상은 유지되고, 글자는 가리지 않는다.
 * lg 미만에서는 열을 만들지 않고 본문 위에 자연스럽게 쌓인다.
 */
export function RecordPolaroidStack({
  lat,
  lng,
  placeName,
  thumbnailUrl,
}: RecordPolaroidStackProps) {
  // null뿐 아니라 로드 실패(깨진 URL)도 같은 폴백으로 보낸다(api-contract DTO — PlaceSummary).
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(thumbnailUrl) && !photoFailed;

  return (
    <div className="relative mx-auto h-[318px] w-[280px] flex-none lg:mx-0">
      <div className="absolute -left-6 top-0 h-[170px] w-[242px] rotate-[1.2deg] overflow-hidden rounded-[12px] border-[5px] border-white shadow-[0_8px_20px_-10px_rgba(60,54,48,0.4)]">
        <RecordPlaceMapSnapshot lat={lat} lng={lng} name={placeName} />
      </div>

      <div className="absolute left-[32px] top-[155px] z-[3] h-[163px] w-[228px] rotate-[-1.6deg] overflow-hidden rounded-[12px] border-[5px] border-white shadow-[0_10px_24px_-10px_rgba(60,54,48,0.45)]">
        {showPhoto ? (
          <img
            src={thumbnailUrl ?? undefined}
            alt={`${placeName} 사진`}
            onError={() => setPhotoFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[#f2efe9] px-4 text-center text-xs leading-relaxed text-[#a29d95]">
            아직 이 장소의 사진이 없어요
          </div>
        )}
      </div>
    </div>
  );
}

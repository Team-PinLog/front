import { useState } from 'react';
import {
  BINDER_PHOTO_FRAME_CLASS,
  BINDER_TAPE_CLASS,
  binderTapeStyle,
} from './collectionBinderSkin';

interface CollectionRecordPhotoProps {
  placeName: string;
  /**
   * 4:3 장소 대표 이미지. 없으면 null이며 서버가 필드를 생략하지는 않는다(08_API_명세 11.1).
   * 당분간 대부분 null이라 **폴백이 기본 경로**다 — 이미지 연결이 아직 수동 SQL 단계다
   * (docs/api-contract.md DTO — PlaceSummary, getCollectionDetail.ts 주석).
   */
  thumbnailUrl?: string | null;
}

/**
 * S15P11A705-379 — 컬렉션 펼침 레코드 장에 붙는 장소 사진 폴라로이드.
 *
 * 378에서 "사진 테이프 부착" 범위를 확인해 보니 이 화면에는 장소 사진이 원래 없었고, 사용자가
 * B안(사진을 새로 추가)을 택해 만들어진 컴포넌트다. 틀·테이프 값은 378 스킨 모듈의 상수를 그대로
 * 재사용한다 — 목차 장 지도 액자와 같은 문법이어야 "같은 바인더에 같은 테이프로 붙였다"로 읽힌다.
 *
 * 데이터는 이미 로드된 CollectionDetail의 PlaceSummary에서 온다(추가 API 호출 없음).
 * PlaceSummary는 공개 DTO라 타인 Collection에서도 그대로 보여준다(privacy-rules.md — 가려야 하는
 * 것은 Context 원문·member.id·Keyword code이고 장소 사진은 해당되지 않는다).
 */
export function CollectionRecordPhoto({ placeName, thumbnailUrl }: CollectionRecordPhotoProps) {
  // null뿐 아니라 로드 실패(깨진 URL)도 같은 폴백으로 보낸다(api-contract DTO — PlaceSummary).
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(thumbnailUrl) && !failed;

  return (
    <div className="relative w-[230px] max-w-full flex-none rotate-[-1.4deg]">
      {/* 테이프 두 조각(왼쪽 위·오른쪽 아래 모서리). 378 지도 액자와 같은 상수를 쓴다.
          두 조각 모두 같은 각도('left')를 쓰는 건 의도다 — 마주 보는 모서리에 나란한 방향으로
          붙은 모양이 스크랩북에서 사진을 붙이는 실제 방식이고, 서로 반대로 틀면 액자처럼 보인다.
          pointer-events-none이라 아래 내용의 클릭 동작을 가리지 않는다. */}
      <span
        aria-hidden="true"
        className={`${BINDER_TAPE_CLASS} -left-4 -top-2`}
        style={binderTapeStyle('left')}
      />
      <span
        aria-hidden="true"
        className={`${BINDER_TAPE_CLASS} -bottom-2 -right-4`}
        style={binderTapeStyle('left')}
      />

      {/* 4:3 고정. 이미지가 없어도 같은 자리·같은 크기를 잡아 두므로 로딩 전후로 장이 흔들리지 않는다
          (08_API_명세 11.1이 권하는 aspect-ratio + object-fit 조합). */}
      <div
        className={`aspect-[4/3] w-full overflow-hidden rounded-[10px] bg-paper-white ${BINDER_PHOTO_FRAME_CLASS}`}
      >
        {showPhoto ? (
          <img
            src={thumbnailUrl ?? undefined}
            alt={`${placeName} 사진`}
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          // 폴백에도 폴라로이드+테이프 표현은 그대로 유지한다(379 요구). 문구는 373 노트 페이지의
          // 같은 폴백과 맞춰 화면 간 표현이 갈리지 않게 한다.
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[#f2efe9] px-3 text-center">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 fill-[#c9c2b6]">
              <path d="M4 5h3l1.5-2h7L17 5h3a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm8 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z" />
            </svg>
            <span className="text-[11px] leading-tight text-[#a29d95]">
              아직 이 장소의
              <br />
              사진이 없어요
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { PinPushMount } from '@/shared/ui/PinSymbols';

interface CollectionRecordPhotoProps {
  placeName: string;
  /**
   * 4:3 장소 대표 이미지. 없으면 null이며 서버가 필드를 생략하지는 않는다(08_API_명세 11.1).
   * 당분간 대부분 null이라 **폴백이 기본 경로**다 — 이미지 연결이 아직 수동 SQL 단계다
   * (docs/api-contract.md DTO — PlaceSummary, getCollectionDetail.ts 주석).
   */
  thumbnailUrl?: string | null;
  /** 자리·폭은 붙이는 쪽(펼침면의 좌/우 페이지)이 정한다. 기울임과 판형만 여기서 갖는다. */
  className?: string;
}

/**
 * S15P11A705-379 → 418: 컬렉션 펼침면에 **압정으로 꽂아 둔 장소 폴라로이드**.
 *
 * 379에서는 마스킹테이프 + 바인더 액자였다. 418 시안에서 이 사진은 **압정으로 꽂힌 폴라로이드**로
 * 바뀌었고, 415(Record 상세)가 이미 같은 판형을 쓰고 있어 문법을 그쪽에 맞춘다 —
 * 두 화면에서 같은 장소 사진이 다른 물건으로 보이면 한 권의 다이어리로 읽히지 않는다.
 *  - 아래 테두리만 두꺼운 흰 테두리(폴라로이드의 "적는 칸")
 *  - 우상단이 아니라 **위쪽 가운데**에 꽂힌 푸시핀(shared/ui/PinSymbols의 PinPushMount)
 *  - **그림자 없음**(415-24와 같은 규칙). 물성은 판형·기울임·압정으로만 낸다.
 *
 * 데이터는 이미 로드된 CollectionDetail의 PlaceSummary에서 온다(추가 API 호출 없음).
 * PlaceSummary는 공개 DTO라 타인 Collection에서도 그대로 보여준다(privacy-rules.md — 가려야 하는
 * 것은 Context 원문·member.id·Keyword code이고 장소 사진은 해당되지 않는다).
 */
export function CollectionRecordPhoto({
  placeName,
  thumbnailUrl,
  className = '',
}: CollectionRecordPhotoProps) {
  // null뿐 아니라 로드 실패(깨진 URL)도 같은 폴백으로 보낸다(api-contract DTO — PlaceSummary).
  // boolean 대신 "실패한 URL"을 담는다 — 장을 넘겨 thumbnailUrl이 바뀌면 이전 실패가 새 사진까지
  // 막아버리기 때문이다(이 컴포넌트는 recordId로 remount되지 않는다. RecordPolaroidStack과 동일).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoUrl = thumbnailUrl && thumbnailUrl !== failedUrl ? thumbnailUrl : null;

  return (
    <div
      className={`rotate-[-3.2deg] rounded-[3px] border-[8px] border-b-[26px] border-white bg-white text-log-mint ${className}`}
    >
      <PinPushMount height={32} className="-top-3.5 left-1/2 -translate-x-1/2" />
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
          // 폴백에도 폴라로이드+압정 표현은 그대로 유지한다(379 요구). 문구·색은 415 노트 페이지의
          // 같은 폴백과 맞춰 화면 간 표현이 갈리지 않게 한다.
          <div
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-1.5 bg-[linear-gradient(150deg,#f6f2ec,#e9e3d9)] px-3 text-center"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 48 48"
              width="22"
              height="22"
              fill="none"
              stroke="#b8ae9f"
              strokeWidth={2}
            >
              <rect x="6" y="12" width="36" height="27" rx="4" />
              <circle cx="24" cy="26" r="7" />
              <path d="M18 12l3-4h6l3 4" />
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

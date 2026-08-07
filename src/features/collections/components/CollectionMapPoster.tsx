import { BINDER_TAPE_CLASS, binderTapeStyle } from './collectionBinderSkin';
import { CollectionSpreadMap, type CollectionSpreadMapPlace } from './CollectionSpreadMap';

interface CollectionMapPosterProps {
  collectionId: number;
  places: CollectionSpreadMapPlace[];
  activeRecordId: number | null;
  isLoadingAll: boolean;
  onSelectPlace: (recordId: number) => void;
}

/**
 * 418 시안 좌측 페이지의 **테이프로 붙인 지도 포스터**.
 *
 * 415(Record 상세)가 확정한 종이 문법을 컬렉션 펼침면으로 옮긴 것이다:
 * - **사방 균일한 흰 매트** 안에 지도가 앉는다(폴라로이드는 아래만 두꺼운 판형이라 형식이 다르고,
 *   그 차이가 "사진"과 "지도"를 가른다 — RecordPolaroidStack 주석과 같은 판단).
 * - **그림자 없음**(418 코멘트 1의 2번). 종이 물성은 마스킹테이프·기울임·매트만으로 낸다.
 * - 지도 색은 건드리지 않는다. 지도는 정보이지 장식이라 세피아·베이지를 얹으면 길·물·녹지를
 *   가르던 색 구분이 흐려진다(415-3번 지시).
 *
 * 테이프는 378 바인더 스킨의 상수를 그대로 쓴다 — 앱 안에서 종이를 붙이는 테이프가 화면마다
 * 다르면 안 된다. 좌상·우상 두 조각이 서로 반대 방향으로 기울어 포스터를 위에서 눌러 붙인 모양이다.
 *
 * ⚠️ 지도는 드래그·줌이 되는 실물이라 테이프에 `pointer-events-none`이 걸려 있어야 하고
 * (BINDER_TAPE_CLASS에 포함), 포스터 자체는 페이지 넘김에서 제외한다(`data-page-turn="ignore"`는
 * 호출부가 붙인다).
 */
export function CollectionMapPoster({
  collectionId,
  places,
  activeRecordId,
  isLoadingAll,
  onSelectPlace,
}: CollectionMapPosterProps) {
  return (
    <div className="relative min-h-0 w-full flex-1 rotate-[-1.1deg]">
      <span
        aria-hidden="true"
        className={`${BINDER_TAPE_CLASS} -left-5 -top-2.5`}
        style={binderTapeStyle('left')}
      />
      <span
        aria-hidden="true"
        className={`${BINDER_TAPE_CLASS} -right-5 -top-2.5`}
        style={binderTapeStyle('right')}
      />

      {/* 흰 매트. rounded는 2px만 — 인쇄물의 거의 각진 모서리다(415 지도 포스터와 같은 값). */}
      <div className="h-full w-full rounded-[2px] bg-white p-2.5">
        <div className="relative h-full w-full overflow-hidden">
          <CollectionSpreadMap
            collectionId={collectionId}
            places={places}
            activeRecordId={activeRecordId}
            isLoadingAll={isLoadingAll}
            fitAllBounds
            onSelectPlace={onSelectPlace}
          />
          {/* 하프톤: 3px 격자의 검정 3.5% 점. 색조를 바꾸지 않는 무채색 인쇄 질감이다(415와 같은 값). */}
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
    </div>
  );
}

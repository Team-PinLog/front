import { useEffect, useState } from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AddToCollectionButton } from '@/features/collections/components/AddToCollectionButton';
import { useRecordDetailQuery } from '../hooks/useRecordDetailQuery';
import { ContextComposerSlot } from './ContextComposerSlot';
import { ContextStickyNoteCard } from './ContextStickyNoteCard';
// 378: 컬렉션 펼침 화면도 같은 손붙임 배치를 쓰게 되어 오프셋 표를 모듈로 뽑았다(문법 공유).
// 415: 이 화면만 줄 단위 혼합 콜라주라 별도 배치기(planContextNoteCollage)를 쓴다.
import { COMPOSER_SLOT_CELL_INDEX, planContextNoteCollage } from './contextNoteScatter';
import { RecordNotebookPage } from './RecordNotebookPage';
import { RecordPolaroidStack } from './RecordPolaroidStack';

interface RecordDetailViewProps {
  recordId: number;
  /** 홈 오버레이에서만 넘어온다 — 노트 페이지 우상단 ✕. 딥링크 페이지는 닫을 대상이 없어 비운다. */
  onClose?: () => void;
}

/**
 * Record 상세: place·contexts·keywords 조회 + Context 추가.
 * 근거: Jira S15P11A705-137(데이터), S15P11A705-373(노트 페이지 시안), S15P11A705-415(다이어리 시안).
 *
 * 415는 UI만 시안대로 다시 짰다 — 데이터 훅(useRecordDetailQuery)과 Context CRUD mutation,
 * contextId 교체 규칙은 그대로다.
 *
 * ## 디자인 노트(415)
 *
 * 주제: "장소의 기억을 모으는 아기자기한 다이어리". 그래서 화면은 문서가 아니라 **펼침면**이다.
 *
 * - 팔레트: 종이 흰색 + 뒤에 쌓인 크림(#faf7f6/#f2ece5), 잉크 검정(#2c2a28), 민트 그린(#4f9b78)과
 *   그 진한 짝(#3f7d5f), 키워드 칩의 연민트(#dff0e4), 포스트잇 4색(shared/ui/ContextStickyNote의
 *   탠·옐로·크림·라벤더 — 재사용), 지도의 종이 베이지(#e6d9bf).
 *   이 초록 계열은 373·366(장소 기록 팝업)이 이미 쓰던 값이라 세 화면이 한 벌로 읽힌다.
 * - 타이포 3역할: 장소명은 굵은 산세리프(잉크), 포스트잇 본문과 추가 자리 안내는 손글씨(font-hand),
 *   `created:` 같은 메타는 작은 산세리프. "누가 적었나"가 서체로 갈린다 — 인쇄된 정보(장소·주소)와
 *   손으로 적은 기억(맥락)이 같은 서체면 다이어리가 아니라 상세 페이지가 된다.
 * - 구조: 좌(글·기억) / 우(물건). 왼쪽은 장소명→주소→키워드→맥락 무리로 내려가고, 오른쪽은
 *   사진과 지도라는 "붙여 둔 물건"만 모은다. 번호 매김 같은 장치는 쓰지 않는다 — 맥락은 순서가
 *   의미를 갖는 목록이 아니라 쌓인 무리다.
 * - 과감함은 오른쪽 열 한 곳에만 쓴다(RecordPolaroidStack — 종이 톤 지도 위에 압정으로 꽂힌
 *   폴라로이드). 나머지는 조용하게 둔다.
 */
export function RecordDetailView({ recordId, onClose }: RecordDetailViewProps) {
  const detailQuery = useRecordDetailQuery(recordId);
  // 맥락 영역의 실높이(px). 이 높이 안에 스크롤 없이 담기는 밀도 단계를 배치기가 고른다(27번 제약).
  // 이 상자는 flex-1 + min-h-0이라 **내용과 무관하게** 남는 높이로 정해진다 — 그래서 관찰해도
  // 되먹임 고리가 생기지 않는다(밀도가 바뀌어도 이 높이는 그대로다).
  const [collageBox, setCollageBox] = useState<HTMLDivElement | null>(null);
  const [collageHeightPx, setCollageHeightPx] = useState<number | null>(null);

  useEffect(() => {
    if (!collageBox || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      setCollageHeightPx(entries[0]?.contentRect.height ?? collageBox.clientHeight);
    });
    observer.observe(collageBox);
    return () => observer.disconnect();
  }, [collageBox]);

  if (detailQuery.isPending) {
    return (
      <RecordNotebookPage onClose={onClose}>
        <p className="m-auto text-sm text-[#8a857e]">불러오는 중…</p>
      </RecordNotebookPage>
    );
  }

  if (detailQuery.isError) {
    // 08_API_명세 1.5: 타인 소유·존재하지 않는 Record 모두 404 RESOURCE_NOT_FOUND로 응답한다(소유 여부 은닉).
    const isNotFound = detailQuery.error.code === 'RESOURCE_NOT_FOUND';
    return (
      <RecordNotebookPage onClose={onClose}>
        <div className="m-auto">
          <ErrorState
            title={isNotFound ? '기록을 찾을 수 없어요' : '기록을 불러오지 못했어요'}
            description={
              isNotFound
                ? '삭제되었거나 접근 권한이 없는 기록이에요.'
                : '잠시 후 다시 시도해 주세요.'
            }
          />
        </div>
      </RecordNotebookPage>
    );
  }

  const record = detailQuery.data;
  // contexts !== null로 소유 여부를 구분한다(privacy-rules.md 1장). 이 화면은 GET /records/{id}(본인 전용)만 다루므로
  // 항상 배열이지만, 타인 응답과 같은 DTO(RecordDetail)를 쓰는 만큼 문서의 표준 분기 방식을 그대로 따른다.
  const isOwner = record.contexts !== null;
  const contexts = record.contexts ?? [];
  // 줄 단위 혼합 콜라주(짧은 노트는 나란히, 긴 노트는 한 줄을 통째로). 맥락이 많아지면 배치기가
  // 글자·여백·줄 간격을 단계적으로 조여 스크롤 없이 담는다.
  const collage = planContextNoteCollage(
    contexts.map((context) => context.body.length),
    collageHeightPx,
  );

  return (
    <RecordNotebookPage onClose={onClose}>
      {/* 열 간격: 한때 32→20px로 좁혔었다(펼침면이 두 장으로 갈라져 보여서). 22번 피드백으로 다시
          32px로 벌린다 — 좁힌 탓에 '컬렉션에 담기' 버튼이 폴라로이드에 거의 닿아 있었다.
          갈라져 보이던 문제는 간격이 아니라 우측 열이 짧아 아래가 비어 있던 것이 원인이었고,
          그건 지도를 아래로 내리면서(19번) 함께 해소된다. */}
      <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row lg:gap-10">
        {/* ── 좌: 글과 기억 ─────────────────────────────────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-none pr-12 lg:pr-0">
            {/* 실물 피드백: '컬렉션에 담기'를 장소명과 같은 줄 오른쪽에 둔다. 이 버튼은 "이 장소를
                어디에 둘까"이므로 장소 이름 옆이 가장 짧은 거리다. items-baseline이 아니라 items-start
                +mt로 맞춘다 — 제목은 32px, 버튼은 13px이라 베이스라인을 맞추면 버튼이 제목 아래로
                처진다. 폭이 좁아 둘이 같은 줄에 못 서면 flex-wrap이 버튼을 아랫줄로 내린다. */}
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <h1 className="min-w-0 flex-1 text-[27px] font-extrabold leading-[1.08] tracking-[-0.025em] text-[#2c2a28] sm:text-[32px]">
                {record.place.name}
              </h1>
              <div className="mt-1 flex-none">
                <AddToCollectionButton />
              </div>
            </div>

            <div className="mt-3 flex items-start gap-1.5 text-[14px] font-semibold text-[#3f7d5f]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#4f9b78"
                aria-hidden="true"
                className="mt-[1px] flex-none"
              >
                <path d="M12 2C7.9 2 4.5 5.3 4.5 9.4c0 5.4 6.7 11.9 7 12.2.3.3.7.3 1 0 .3-.3 7-6.8 7-12.2C19.5 5.3 16.1 2 12 2Zm0 10.2a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Z" />
              </svg>
              <span className="min-w-0 break-keep">{record.place.address}</span>
            </div>

            {/* keywords: []는 AI 미완료 상태의 정상 응답이다 — 오류·로딩 실패로 다루지 않는다.
                label만 표시하고 식별에 쓰지 않는다(AGENTS.md 금지 2). React key도 label이 겹칠 수
                있어 순번을 붙인다. */}
            <div className="mt-6">
              {record.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {record.keywords.map((keyword, index) => (
                    <span
                      key={`${index}-${keyword}`}
                      className="rounded-full bg-[#dff0e4] px-3.5 py-1.5 text-[13px] font-bold text-[#3f7d5f]"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : (
                // keywords: []는 "없다"가 아니라 "아직 안 붙었다"이다(AI 미완료 상태의 정상 응답).
                // 없다고 적으면 영영 없는 것처럼 읽혀 오해를 만든다.
                <p className="text-[13px] font-medium text-[#a29d95]">키워드를 정리하는 중이에요</p>
              )}
            </div>
          </div>

          {/* 소제목은 라벨이지 제목이 아니다 — 작게, 민트로, 무리 위에 표지처럼 올린다.
              26번: 섹션끼리 붙어 보이지 않게 키워드 줄과의 사이를 벌린다(mt-8 → mt-10).
              28번: 문구를 "맥락" → "기록한 맥락"으로 되돌린다(확정 스크린샷). */}
          <h2 className="mt-10 flex-none text-[13px] font-extrabold tracking-[0.14em] text-[#4f9b78]">
            기록한 맥락
          </h2>

          {isOwner && (
            /* 415 맥락 콜라주 — **2열 그리드**다(28번 확정 스크린샷).
                 · 카드는 각자의 칸에 앉고 서로 겹치지 않는다. 손붙임 느낌은 칸 안에서의 미세한
                   어긋남·기울임과 본문 길이에 따라 달라지는 폭이 낸다.
                 · '새로운 맥락 추가'는 **늘 네 번째 칸(2행 2열)**이다. 맥락이 0개든 8개든 같은
                   자리라 눈이 그 자리를 외운다. 노트는 그 칸을 비켜 나머지를 순서대로 채운다.
                 · 맥락이 많아지면 배치기가 글자·여백을 단계적으로 조여 **스크롤 없이** 담는다
                   (27번 제약). overflow-y-auto는 가장 조인 단계로도 넘칠 때만 도는 마지막
                   안전장치다 — 글자를 지우거나 가리는 대신 스크롤을 택한다.

               여백: 마스킹 테이프가 위로 12px 튀어나오므로 pt-7/px-2, 아래는 마지막 줄의 기울임까지
               담도록 pb-6을 둔다.

               z-index는 인라인으로 주지 않는다 — 래퍼의 transform이 쌓임 맥락을 만들어 포스트잇
               자신의 호버 z-index를 가둬버린다. 호버·포커스일 때만 래퍼를 z-20으로 올린다. */
            <div
              ref={setCollageBox}
              className="place-scroll -mx-2 mt-1 grid min-h-0 flex-1 grid-cols-2 content-start items-start overflow-y-auto px-2 pb-3 pt-7"
              style={{ columnGap: collage.columnGapPx, rowGap: collage.rowGapPx }}
            >
              {collage.cells.map((cell, cellIndex) => {
                if (cell.index === null) {
                  // 슬롯 칸(고정석)과 빈 칸. 빈 칸은 그리드 자리만 지킨다.
                  return cellIndex === COMPOSER_SLOT_CELL_INDEX ? (
                    <div key="composer-slot" className="min-w-0" style={cell.style}>
                      <ContextComposerSlot
                        recordId={recordId}
                        isFirst={contexts.length === 0}
                        minHeightPx={collage.slotMinHeightPx}
                      />
                    </div>
                  ) : (
                    <div key={`empty-${cellIndex}`} aria-hidden="true" style={cell.style} />
                  );
                }

                const context = contexts[cell.index];
                return (
                  <div
                    key={context.contextId}
                    className="relative min-w-0 hover:z-20 focus-within:z-20"
                    style={cell.style}
                  >
                    <ContextStickyNoteCard
                      recordId={recordId}
                      context={context}
                      ownedByMe={isOwner}
                      stackIndex={0}
                      attachment="flat"
                      metrics={collage.metrics}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 우: 붙여 둔 물건들(꽂은 사진 + 붙인 지도) ───────────────── */}
        {/* 22번: 우측 열을 제목 줄 아래에서 시작시킨다. 폴라로이드 윗변이 '컬렉션에 담기' 버튼과
            같은 높이에 있어 둘이 한 줄로 붙어 보였다.
            25·26번: 그 간격이 아직 모자랐다 — '컬렉션에 담기'와 사진이 붙어 보이지 않도록
            pt-7 → pt-14로 벌린다(사진 자신도 RecordPolaroidStack 안에서 한 번 더 내려간다). */}
        <div className="flex min-h-0 w-full flex-none flex-col lg:w-[300px] lg:pt-14">
          <RecordPolaroidStack
            lat={record.place.lat}
            lng={record.place.lng}
            placeName={record.place.name}
            thumbnailUrl={record.place.thumbnailUrl}
          />
        </div>
      </div>
    </RecordNotebookPage>
  );
}

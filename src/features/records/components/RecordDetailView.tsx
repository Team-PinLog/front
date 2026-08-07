import { useState } from 'react';
import { ErrorState } from '@/shared/ui/ErrorState';
import { AddToCollectionButton } from '@/features/collections/components/AddToCollectionButton';
import { useRecordDetailQuery } from '../hooks/useRecordDetailQuery';
import { useAddRecordContextMutation } from '../hooks/useAddRecordContextMutation';
import { ContextStickyNoteCard } from './ContextStickyNoteCard';
// 378: 컬렉션 펼침 화면도 같은 손붙임 배치를 쓰게 되어 오프셋 표를 모듈로 뽑았다(문법 공유).
import { contextNoteScatterStyle } from './contextNoteScatter';
import { RecordNotebookPage } from './RecordNotebookPage';
import { RecordPolaroidStack } from './RecordPolaroidStack';

// docs/api-contract.md Context 계약. 시안도 입력 시 500자에서 잘라낸다(maxLength로 사전 차단).
const CONTEXT_BODY_MAX_LENGTH = 500;

// 이 개수 이하면 "비어 보이는" 배치라 괘선·큰 포스트잇·다음 자리 실루엣으로 페이지를 채운다.
const SPARSE_CONTEXT_THRESHOLD = 2;

interface RecordDetailViewProps {
  recordId: number;
  /** 홈 오버레이에서만 넘어온다 — 노트 페이지 우상단 ✕. 딥링크 페이지는 닫을 대상이 없어 비운다. */
  onClose?: () => void;
}

/**
 * Record 상세: place·contexts·keywords 조회 + Context 추가.
 * 근거: Jira S15P11A705-137(데이터), S15P11A705-373(노트 페이지 시안).
 *
 * 373에서 UI만 시안(핀 상세 화면.dc.html)대로 재구성했다 — 데이터 훅(useRecordDetailQuery)과
 * Context CRUD mutation은 그대로다. 시안의 초록 계열(#4f9b78/#dcecdf/#3f7d5f/#bcd8c7)은
 * tailwind 토큰으로 올리지 않고 임의 값으로 쓴다: 브랜드 팔레트(brand-resource) 색이 아니라 이
 * 노트 시안 전용 색이고, 같은 계열 시안인 장소 기록 팝업(366, PlaceRecordSheet.tsx)이 이미 같은
 * 방식으로 #4f9b78을 쓰고 있어 두 화면이 한 벌로 읽힌다. (tailwind.config.js는 공유 파일이라
 * 토큰 추가는 조율 세션 보고 대상이기도 하다.)
 */
export function RecordDetailView({ recordId, onClose }: RecordDetailViewProps) {
  const [contextBody, setContextBody] = useState('');
  const detailQuery = useRecordDetailQuery(recordId);
  const addContextMutation = useAddRecordContextMutation(recordId);

  const handleAddContext = () => {
    const body = contextBody.trim();
    if (!body) {
      return;
    }
    addContextMutation.mutate(body, {
      onSuccess: () => setContextBody(''),
    });
  };

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
  const canSave = Boolean(contextBody.trim()) && !addContextMutation.isPending;
  const isSparse = contexts.length <= SPARSE_CONTEXT_THRESHOLD;

  return (
    <RecordNotebookPage onClose={onClose}>
      {/*
        373 피드백 2: 1440x900·1280x800에서 페이지 내부 스크롤 없이 전부 보이게 2단으로 나눈다.
        - 왼쪽: 장소명·주소·키워드·컬렉션에 담기 + "기록한 맥락" 목록(여기만, 맥락이 많을 때 스크롤)
        - 오른쪽(고정 폭): 폴라로이드 2장 + "맥락 추가" 입력·저장 버튼
        이전 1단 배치는 폴라로이드가 오른쪽 폭을 예약하면서 왼쪽 아래가 통째로 비었고, 세로로
        이어 붙인 입력·저장 버튼이 뷰포트 밖으로 밀려 잘렸다.
      */}
      <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-9">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-none pr-14 lg:pr-0">
            <h1 className="text-[30px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#2c2a28] sm:text-[36px]">
              {record.place.name}
            </h1>
            <div className="mt-3.5 flex items-start gap-2 text-[17px] font-bold text-[#4f9b78] sm:text-lg">
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className="mt-1 flex-none"
              >
                <path d="M12 2C7.9 2 4.5 5.3 4.5 9.4c0 5.4 6.7 11.9 7 12.2.3.3.7.3 1 0 .3-.3 7-6.8 7-12.2C19.5 5.3 16.1 2 12 2Zm0 10.2a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Z" />
              </svg>
              <span className="min-w-0 break-keep">{record.place.address}</span>
            </div>

            {/* keywords: []는 AI 미완료 상태의 정상 응답이다 — 오류·로딩 실패로 다루지 않는다. */}
            <div className="mt-6">
              {record.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2.5">
                  {record.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="rounded-full bg-[#dcecdf] px-[18px] py-[9px] text-[15px] font-bold text-[#3f7d5f]"
                    >
                      #{keyword}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[15px] font-medium text-[#a29d95]">이 기록엔 키워드가 없어요</p>
              )}
            </div>

            <div className="mt-5">
              <AddToCollectionButton />
            </div>
          </div>

          <h2 className="mt-7 flex-none text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
            기록한 맥락
          </h2>

          {isOwner && (
            // 시안은 포스트잇을 가로로 흘려 붙인다. 세로로 겹쳐 쌓던 기존 스택 대신 stackIndex=0으로
            // 겹침을 끄고 wrap 배치하며, shared/ui/ContextStickyNote를 attachment='flat'으로 쓴다.
            //
            // 호버 시 잘림 방지: 이 영역은 맥락이 많을 때만 스크롤되는 유일한 스크롤 박스다.
            // 마스킹 테이프가 노트 위로 12px 튀어나오고 손붙임 오프셋·회전·호버 흔들림까지 겹치므로
            // 상하좌우 여백(pt-6/px-3/pb-4)을 둔다.
            //
            // 맥락이 적을 때(isSparse)는 옅은 괘선을 깔아 빈 노트 페이지처럼 보이게 하고 포스트잇도
            // 크게 쓴다 — 373 피드백 1("1장이어도 페이지가 완성돼 보여야 한다").
            <div
              className="place-scroll -mx-3 mt-1 flex min-h-0 flex-1 flex-wrap content-start gap-x-7 overflow-y-auto px-3 pb-4 pt-6"
              style={
                isSparse
                  ? {
                      backgroundImage:
                        'repeating-linear-gradient(to bottom, transparent 0 31px, rgba(120,110,100,0.09) 31px 32px)',
                    }
                  : undefined
              }
            >
              {contexts.map((context, index) => (
                <div
                  key={context.contextId}
                  className={isSparse ? 'w-[300px] max-w-full' : 'w-[268px] max-w-full'}
                  // 균일 격자로 보이지 않게 손으로 붙인 듯한 오프셋을 준다(373 피드백 3).
                  // index 기준이라 목록 순서가 같으면 항상 같은 배치이고, 회전은 여기서 한 겹 더
                  // 얹어 ContextStickyNote의 contextId 회전과 합성된다(각도 편차가 커진다).
                  style={contextNoteScatterStyle(index)}
                >
                  <ContextStickyNoteCard
                    recordId={recordId}
                    context={context}
                    ownedByMe={isOwner}
                    stackIndex={0}
                    attachment="flat"
                  />
                </div>
              ))}

              {/* 다음 포스트잇 자리. 맥락이 0~2개일 때만 둬서 페이지가 "아직 채울 곳이 있다"로
                  읽히게 한다 — 빈 상태의 밋밋한 한 줄 안내를 대신한다.
                  font-hand는 포스트잇 전용 서체지만(tailwind.config 주석) 이 자리는 포스트잇의
                  빈 실루엣 자체라 같은 서체를 쓴다. */}
              {isSparse && (
                <div
                  className="w-[300px] max-w-full"
                  style={contextNoteScatterStyle(contexts.length)}
                >
                  <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-[#ded8cd] bg-white/45 px-6 py-8 text-center">
                    <span className="text-2xl leading-none text-[#c9c2b6]" aria-hidden="true">
                      ＋
                    </span>
                    <p className="whitespace-pre-line font-hand text-xl leading-6 text-[#a29d95]">
                      {contexts.length === 0
                        ? '이 장소의 첫 기억을\n오른쪽에 적어 붙여보세요'
                        : '이 장소의 기억이\n더 쌓이길 기다려요'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full flex-none flex-col lg:w-[280px] lg:pt-8">
          <RecordPolaroidStack
            lat={record.place.lat}
            lng={record.place.lng}
            placeName={record.place.name}
            thumbnailUrl={record.place.thumbnailUrl}
          />

          {/* 373 피드백 2: 폴라로이드와 붙어 보여서 사이를 확실히 띄우고, 옅은 구분선으로
              "사진 영역"과 "쓰는 영역"을 나눈다. */}
          {isOwner && (
            <div className="mt-8 flex-none border-t border-[#efece8] pt-5">
              <label
                htmlFor="record-context-body"
                className="text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]"
              >
                맥락 추가
              </label>
              <textarea
                id="record-context-body"
                value={contextBody}
                onChange={(event) => setContextBody(event.target.value)}
                maxLength={CONTEXT_BODY_MAX_LENGTH}
                placeholder="이 장소에서 새로 기억하고 싶은 맥락을 적어보세요"
                className="mt-3 h-[96px] w-full resize-none rounded-[14px] border-[1.5px] border-[#e5e2dd] bg-white p-3.5 text-[15px] leading-relaxed text-[#2c2a28] outline-none transition-colors placeholder:text-[#a29d95] focus:border-[#5faa84]"
              />
              <p className="mt-1 text-right text-xs text-[#a29d95]">
                {contextBody.length}/{CONTEXT_BODY_MAX_LENGTH}
              </p>

              {addContextMutation.isError && (
                <p className="mt-1 text-sm text-red-600">{addContextMutation.error.message}</p>
              )}

              <button
                type="button"
                onClick={handleAddContext}
                disabled={!canSave}
                className={`mt-3 w-full rounded-[14px] py-3.5 text-[17px] font-extrabold text-white transition-colors ${
                  canSave
                    ? 'bg-[#4f9b78] shadow-[0_8px_18px_-8px_rgba(79,155,120,0.7)]'
                    : 'bg-[#bcd8c7]'
                }`}
              >
                {addContextMutation.isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          )}
        </div>
      </div>
    </RecordNotebookPage>
  );
}

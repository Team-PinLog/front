import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { useKakaoPlaceSearch } from '@/features/places/hooks/useKakaoPlaceSearch';
import { usePlaceSuggestionMutation } from '@/features/places/hooks/usePlaceSuggestionMutation';
import type { KakaoPlace } from '@/features/places/api/searchKakaoPlaces';
import type { PlaceSuggestionCandidate } from '@/features/places/api/suggestPlacesFromImage';
import { useMyCollectionsQuery } from '@/features/collections/hooks/useMyCollectionsQuery';
import { useAddRecordsToCollectionMutation } from '@/features/collections/hooks/useAddRecordsToCollectionMutation';
import { useCreateCollectionMutation } from '@/features/collections/hooks/useCreateCollectionMutation';
import { NewCollectionModal } from '@/features/collections/components/NewCollectionModal';
import { CollectionCoverModal } from '@/features/collections/components/CollectionCoverModal';
import type { CreateCollectionResponse } from '@/features/collections/api/createCollection';
import { useCreateRecordMutation } from '../hooks/useCreateRecordMutation';
import type { CreateRecordResponse } from '../api/createRecord';
import {
  PlaceRecordResult,
  type CollectionCreationOutcome,
  type ExistingCollectionAddOutcome,
} from './PlaceRecordResult';

const CONTEXT_BODY_MAX_LENGTH = 500;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);
const ANALYSIS_STEP_LABELS = ['대화 내용 확인', '장소 후보 검색 중', '메모 작성 중'];
const ANALYSIS_STEP_DELAY_MS = 700;
const ANALYSIS_DONE_HOLD_MS = 180;
const RING_CIRCUMFERENCE = 2 * Math.PI * 60;
const RING_ARC_RATIO = 0.35;

type Stage = 'entry' | 'analysis' | 'candidates' | 'details' | 'failure';

interface PlaceRecordSheetProps {
  previewMode?: boolean;
  /**
   * Record 저장에 성공한 직후 호출된다. 컬렉션 담기 결과를 기다리지 않고 바로 알린다 — 홈은 이
   * 값으로 지도를 새 핀 위치로 옮기고, 그 이동이 컬렉션 처리에 묶일 이유가 없다.
   * 근거: Jira S15P11A705-325.
   */
  onRecordSaved?: (recordId: number) => void;
}

interface SuggestedPlaceOption {
  id: string;
  place: KakaoPlace;
  extractedName: string;
  contextSuggestion: string;
  evidence: string[];
}

interface UnresolvedCandidate {
  candidateId: string;
  extractedName: string;
  status: 'NO_RESULTS' | 'FAILED';
}

function unresolvedCandidateMessage(status: UnresolvedCandidate['status']): string {
  return status === 'NO_RESULTS'
    ? '카카오 장소 검색 결과가 없어요.'
    : '카카오 장소 검색에 실패했어요. 다른 후보를 선택하거나 직접 검색해 주세요.';
}

function searchErrorMessage(error: Error): string {
  if (error.message === 'KAKAO_REST_KEY_MISSING') {
    return '카카오 REST 키가 설정되지 않았습니다.';
  }
  return '장소 검색 중 오류가 발생했습니다.';
}

function imageErrorMessage(error: Error): string {
  return error.message || '이미지를 분석하지 못했습니다.';
}

function toSuggestedOptions(candidates: PlaceSuggestionCandidate[]): SuggestedPlaceOption[] {
  return candidates.flatMap((candidate) =>
    candidate.kakaoSearch.items.map((item, index) => ({
      id: `${candidate.candidateId}-${item.kakaoPlaceId}-${index}`,
      extractedName: candidate.extracted.placeName,
      contextSuggestion: candidate.extracted.contextSuggestion ?? '',
      evidence: candidate.extracted.evidence,
      place: {
        kakaoPlaceId: item.kakaoPlaceId,
        name: item.name,
        categoryName: item.categoryName,
        address: item.address,
        roadAddress: item.roadAddress,
        phone: item.phone,
        placeUrl: item.placeUrl,
        lat: item.lat,
        lng: item.lng,
      },
    })),
  );
}

function toUnresolvedCandidates(candidates: PlaceSuggestionCandidate[]): UnresolvedCandidate[] {
  return candidates
    .filter((candidate) => candidate.kakaoSearch.items.length === 0)
    .map((candidate) => ({
      candidateId: candidate.candidateId,
      extractedName: candidate.extracted.placeName,
      status: candidate.kakaoSearch.status === 'NO_RESULTS' ? 'NO_RESULTS' : 'FAILED',
    }));
}

function placeMeta(place: KakaoPlace): string {
  return [place.categoryName, place.roadAddress || place.address].filter(Boolean).join(' · ');
}

// 노트북 카드 전역에서 반복되는 CTA 버튼 톤. 화면별로 활성색만 다르다(입력 단계 #4f9b78 ·
// 저장 단계 #5faa84) — mockup(장소 기록 화면.dc.html 외 3종)의 원값을 그대로 옮겼다.
function ctaButtonClass(disabled: boolean, activeColor: string): string {
  return [
    'mt-auto h-[60px] flex-none rounded-[14px] text-[19px] font-extrabold tracking-[-0.01em] text-white transition-colors',
    disabled ? 'cursor-default' : 'cursor-pointer',
    disabled
      ? 'bg-[#bcd8c7] shadow-none'
      : `${activeColor} shadow-[0_8px_18px_-8px_rgba(79,155,120,0.7)]`,
  ].join(' ');
}

const previewSuggestedOptions: SuggestedPlaceOption[] = [
  {
    id: 'preview-onion-seongsu',
    extractedName: '카페 어니언 성수',
    contextSuggestion: '친구가 성수에서 같이 가보자고 추천한 베이커리 카페',
    evidence: ['성수에서 만나자는 대화', '카페 어니언이라는 장소명이 화면에 보임'],
    place: {
      kakaoPlaceId: 'preview-onion-seongsu',
      name: '카페 어니언 성수',
      categoryName: '카페',
      address: '서울 성동구 성수동2가',
      roadAddress: '서울 성동구 아차산로9길 8',
      phone: null,
      placeUrl: null,
      lat: 37.5446,
      lng: 127.0557,
    },
  },
  {
    id: 'preview-seongsu-yeonbang',
    extractedName: '성수연방',
    contextSuggestion: '주말에 둘러볼 만한 성수 복합문화공간으로 저장',
    evidence: ['성수연방 링크를 공유한 대화', '주말에 가보자는 맥락이 있음'],
    place: {
      kakaoPlaceId: 'preview-seongsu-yeonbang',
      name: '성수연방',
      categoryName: '복합문화공간',
      address: '서울 성동구 성수동2가',
      roadAddress: '서울 성동구 연무장길 47',
      phone: null,
      placeUrl: null,
      lat: 37.5434,
      lng: 127.0544,
    },
  },
];

/**
 * 다운로드 mockup 4종(장소 기록/분석/선택/저장 화면.dc.html, S15P11A705-323/366 디자인 개정)을
 * 실제 Record 저장 기능에 연결한 장소 추가 화면. 검색·업로드를 탭 전환 없이 한 화면(entry)에서
 * 같이 보여주는 구조로 바뀌었다. 최종 저장은 기존 POST /records와 컬렉션 추가 흐름을 그대로 쓴다.
 */
export function PlaceRecordSheet({ previewMode = false, onRecordSaved }: PlaceRecordSheetProps) {
  const sheet = usePlaceRecordSheet();
  const searchMutation = useKakaoPlaceSearch();
  const suggestionMutation = usePlaceSuggestionMutation();
  const createMutation = useCreateRecordMutation();
  const myCollectionsQuery = useMyCollectionsQuery(sheet.isOpen && !previewMode);
  const addToCollectionMutation = useAddRecordsToCollectionMutation();
  const createCollectionMutation = useCreateCollectionMutation();

  const [stage, setStage] = useState<Stage>('entry');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageFileError, setImageFileError] = useState('');
  const [suggestedOptions, setSuggestedOptions] = useState<SuggestedPlaceOption[]>([]);
  const [unresolvedCandidates, setUnresolvedCandidates] = useState<UnresolvedCandidate[]>([]);
  const [suggestionWarnings, setSuggestionWarnings] = useState<string[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [analysisPhase, setAnalysisPhase] = useState(0);
  const analysisTimersRef = useRef<number[]>([]);
  const [isEditingPlace, setIsEditingPlace] = useState(false);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>([]);
  const [selectedCollectionTitles, setSelectedCollectionTitles] = useState<Record<number, string>>(
    {},
  );
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [isAddingToCollections, setIsAddingToCollections] = useState(false);
  const [existingCollectionAddResults, setExistingCollectionAddResults] = useState<
    ExistingCollectionAddOutcome[] | null
  >(null);
  const [collectionCreationResults, setCollectionCreationResults] = useState<
    CollectionCreationOutcome[] | null
  >(null);
  const [previewSavedRecord, setPreviewSavedRecord] = useState<CreateRecordResponse | null>(null);
  // 327: 저장 직후 표지를 고를 새 컬렉션. 생성에 성공했을 때만 채워지고, 표지 모달을 닫으면
  // 다시 null이 되어 두 번 뜨지 않는다.
  const [coverTargetCollection, setCoverTargetCollection] = useState<{
    collectionId: number;
    title: string;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    return () => {
      clearAnalysisTimers();
    };
  }, []);

  function clearAnalysisTimers() {
    analysisTimersRef.current.forEach((id) => window.clearTimeout(id));
    analysisTimersRef.current = [];
  }

  const selectedSuggestion = useMemo(
    () => suggestedOptions.find((option) => option.id === selectedSuggestionId) ?? null,
    [selectedSuggestionId, suggestedOptions],
  );

  if (!sheet.isOpen) {
    return null;
  }

  const resetLocalState = () => {
    clearAnalysisTimers();
    searchMutation.reset();
    suggestionMutation.reset();
    createMutation.reset();
    setStage('entry');
    setAnalysisPhase(0);
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl('');
    setImageFileError('');
    setSuggestedOptions([]);
    setUnresolvedCandidates([]);
    setSuggestionWarnings([]);
    setSelectedSuggestionId(null);
    setIsEditingPlace(false);
    setSelectedCollectionIds([]);
    setSelectedCollectionTitles({});
    setIsNewCollectionModalOpen(false);
    setIsAddingToCollections(false);
    setExistingCollectionAddResults(null);
    setCollectionCreationResults(null);
    setPreviewSavedRecord(null);
    setCoverTargetCollection(null);
  };

  const handleClose = () => {
    sheet.close();
    resetLocalState();
  };

  const toggleCollection = (collectionId: number, title: string) => {
    setSelectedCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId],
    );
    setSelectedCollectionTitles((prev) => ({ ...prev, [collectionId]: title }));
  };

  const handleSearch = () => {
    const query = sheet.searchQuery.trim();
    if (!query) {
      return;
    }
    searchMutation.mutate(query);
  };

  const handleSelect = (place: KakaoPlace) => {
    sheet.selectPlace(place);
    searchMutation.reset();
    setIsEditingPlace(false);
    // 직접 검색으로 고른 장소에는 대화 근거가 없다 — 이전에 이미지 분석으로 얻은 후보가 남아
    // "대화 내용 근거" 블록에 잘못 붙지 않도록 비운다.
    setSuggestedOptions([]);
    setSelectedSuggestionId(null);
    setStage('details');
  };

  const handleImageFile = (file: File | undefined) => {
    if (!file) {
      return;
    }
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
      setImageFileError('PNG, JPG 이미지를 선택해 주세요.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageFileError('10MB 이하 이미지만 선택할 수 있습니다.');
      return;
    }
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setImageFileError('');
    setSuggestedOptions([]);
    setUnresolvedCandidates([]);
    setSuggestionWarnings([]);
    setSelectedSuggestionId(null);
    setIsEditingPlace(false);
    suggestionMutation.reset();
    sheet.selectPlace(null);
    sheet.setContextBody('');
  };

  const handleImageInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleImageFile(event.target.files?.[0]);
    event.target.value = '';
  };

  const handleDropImage = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingImage(false);
    handleImageFile(event.dataTransfer.files[0]);
  };

  const handleStartAnalysis = async () => {
    if (!imageFile) {
      return;
    }
    clearAnalysisTimers();
    setStage('analysis');
    setAnalysisPhase(0);
    setSuggestedOptions([]);
    setUnresolvedCandidates([]);
    setSuggestionWarnings([]);
    setSelectedSuggestionId(null);
    setIsEditingPlace(false);
    sheet.selectPlace(null);
    sheet.setContextBody('');
    analysisTimersRef.current = [
      window.setTimeout(() => setAnalysisPhase(1), ANALYSIS_STEP_DELAY_MS),
      window.setTimeout(() => setAnalysisPhase(2), ANALYSIS_STEP_DELAY_MS * 2),
    ];

    const finishAnalysis = (options: SuggestedPlaceOption[], unresolved: UnresolvedCandidate[]) => {
      clearAnalysisTimers();
      setAnalysisPhase(3);
      window.setTimeout(() => {
        setSuggestedOptions(options);
        setUnresolvedCandidates(unresolved);
        setSelectedSuggestionId(options[0]?.id ?? null);
        setStage('candidates');
      }, ANALYSIS_DONE_HOLD_MS);
    };

    if (previewMode) {
      window.setTimeout(() => finishAnalysis(previewSuggestedOptions, []), 350);
      return;
    }
    try {
      const data = await suggestionMutation.mutateAsync(imageFile);
      setSuggestionWarnings(data.warnings.map((warning) => warning.message));
      // candidates가 비어 있으면 이미지에서 장소 후보 자체를 추출하지 못한 것이라 분석 실패로 본다.
      // 후보는 있지만 카카오 검색이 전부 NO_RESULTS/FAILED인 경우는 아래 candidates 화면에서
      // 후보별로 안내한다(전체 실패로 뭉뚱그리지 않는다).
      if (data.candidates.length === 0) {
        clearAnalysisTimers();
        setStage('failure');
        return;
      }
      finishAnalysis(toSuggestedOptions(data.candidates), toUnresolvedCandidates(data.candidates));
    } catch {
      clearAnalysisTimers();
      setStage('failure');
    }
  };

  const handleEditPlace = () => {
    sheet.setSearchQuery(sheet.selectedPlace?.name ?? '', { keepSelectedPlace: true });
    searchMutation.reset();
    setIsEditingPlace(true);
  };

  const handleConfirmSuggestion = (option: SuggestedPlaceOption) => {
    setSelectedSuggestionId(option.id);
    sheet.selectPlace(option.place);
    sheet.setContextBody(option.contextSuggestion);
    setStage('details');
  };

  const handleRetryImage = () => {
    clearAnalysisTimers();
    suggestionMutation.reset();
    setAnalysisPhase(0);
    setSuggestionWarnings([]);
    setStage('entry');
  };

  const handleSave = async () => {
    const place = sheet.selectedPlace;
    const contextBody = sheet.contextBody.trim();
    if (!place || !contextBody) {
      return;
    }

    if (previewMode) {
      const createdAt = new Date().toISOString();
      setExistingCollectionAddResults([]);
      setCollectionCreationResults(
        sheet.stagedCollectionTitles.map((title) => ({ title, status: 'success' })),
      );
      setPreviewSavedRecord({
        result: 'RECORD_CREATED',
        recordId: 0,
        place: {
          placeId: 0,
          name: place.name,
          address: place.roadAddress || place.address,
          lat: place.lat,
          lng: place.lng,
        },
        contexts: [
          {
            contextId: 0,
            body: contextBody,
            createdAt,
          },
        ],
        keywords: [],
        createdAt,
      });
      return;
    }

    let created: CreateRecordResponse;
    try {
      created = await createMutation.mutateAsync({ place, contextBody });
    } catch {
      return;
    }

    onRecordSaved?.(created.recordId);

    const stagedTitles = sheet.stagedCollectionTitles;

    setIsAddingToCollections(true);
    const [addResults, createResults] = await Promise.all([
      Promise.allSettled(
        selectedCollectionIds.map((collectionId) =>
          addToCollectionMutation.mutateAsync({ collectionId, recordIds: [created.recordId] }),
        ),
      ),
      Promise.allSettled(
        stagedTitles.map((title) =>
          createCollectionMutation.mutateAsync({ title, recordIds: [created.recordId] }),
        ),
      ),
    ]);
    setIsAddingToCollections(false);

    setExistingCollectionAddResults(
      addResults.map((result, index) => {
        const collectionId = selectedCollectionIds[index];
        return {
          collectionId,
          title: selectedCollectionTitles[collectionId] ?? '컬렉션',
          status: result.status === 'fulfilled' ? 'success' : 'error',
        };
      }),
    );

    setCollectionCreationResults(
      createResults.map((result, index) => ({
        title: stagedTitles[index],
        status: result.status === 'fulfilled' ? 'success' : 'error',
      })),
    );

    // 327: 새로 만든 컬렉션이 있으면 저장 결과 화면 위에 표지 단계를 한 번 띄운다.
    // 생성이 실패했으면 건너뛴다 — 붙일 컬렉션이 없고, 결과 화면의 실패 안내·재시도가 그대로 남는다.
    // 이 흐름의 새 컬렉션은 1개로 제한되므로(아래 "+ 컬렉션 생성" 참고) 표지 모달도 한 번뿐이다.
    const createdCollection = createResults.find(
      (result): result is PromiseFulfilledResult<CreateCollectionResponse> =>
        result.status === 'fulfilled',
    );
    if (createdCollection) {
      setCoverTargetCollection({
        collectionId: createdCollection.value.collectionId,
        title: createdCollection.value.title,
      });
    }
  };

  const searchResults = searchMutation.data ?? [];
  const canShowSearchResults = !sheet.selectedPlace || isEditingPlace;
  const showResults = searchMutation.isSuccess && canShowSearchResults && searchResults.length > 0;
  const showEmptyResult =
    searchMutation.isSuccess && canShowSearchResults && searchResults.length === 0;
  const savedRecord =
    previewSavedRecord ??
    (createMutation.isSuccess && existingCollectionAddResults && collectionCreationResults
      ? createMutation.data
      : null);
  const isSaving = createMutation.isPending || isAddingToCollections;
  const myCollections = myCollectionsQuery.isSuccess
    ? myCollectionsQuery.data.pages.flatMap((page) => page.items)
    : [];
  const canSave = !!sheet.selectedPlace && !!sheet.contextBody.trim() && !isSaving;
  const hasStagedCollection = sheet.stagedCollectionTitles.length > 0;
  const showDetails = stage === 'details';

  // 검색 입력 UI. entry 화면과, details 화면에서 "수정"으로 들어온 편집 모드가 함께 쓴다
  // (mockup에는 편집 상태 화면이 따로 없어 entry의 검색 박스를 그대로 재사용했다).
  const searchBox = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-[#e5e2dd] bg-[#f5f5f5] px-5">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#7a6a1f"
          strokeWidth="2.2"
          className="flex-none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          id="place-search-input"
          type="text"
          value={sheet.searchQuery}
          onChange={(event) => sheet.setSearchQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSearch();
            }
          }}
          placeholder="멀티캠퍼스 역삼"
          autoComplete="off"
          className="flex-1 border-none bg-transparent py-4 font-[Pretendard] text-base text-[#3f3a2a] outline-none placeholder:text-[#b7b3ad]"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={!sheet.searchQuery.trim() || searchMutation.isPending}
          className="flex-none rounded-full px-3 py-1.5 text-sm font-bold text-[#4f9b78] disabled:opacity-40"
        >
          {searchMutation.isPending ? '검색 중' : '검색'}
        </button>
      </div>

      {showResults && (
        <div className="place-scroll grid max-h-72 gap-2.5 overflow-y-auto pr-1">
          {searchResults.map((place) => (
            <button
              key={place.kakaoPlaceId}
              type="button"
              onClick={() => handleSelect(place)}
              className="min-h-[76px] rounded-[10px] border-[1.5px] border-[#e5e2dd] bg-white px-5 py-4 text-left text-[#2c2a28] transition-colors hover:border-[#5faa84] hover:bg-[#f4faf7]"
            >
              <strong className="block text-[15px] font-extrabold">{place.name}</strong>
              <small className="mt-1.5 block text-[13px] leading-5 text-[#8a857e]">
                {placeMeta(place)}
              </small>
            </button>
          ))}
        </div>
      )}
      {showEmptyResult && <p className="text-sm text-[#8a857e]">검색 결과가 없습니다.</p>}
      {searchMutation.isError && (
        <p className="text-sm text-red-600">{searchErrorMessage(searchMutation.error)}</p>
      )}
    </div>
  );

  return (
    <>
      {/*
        백드롭은 시각 레이어 전용이다. 클릭으로 닫으면 작성 중이던 Context 본문이
        통째로 사라진다(S15P11A705-324). 닫기 진입점은 헤더 X 버튼 하나로 통일한다.
      */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2c2a28]/45 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-[720px]">
          {/* page stack behind — mockup의 "노트 뒤에 쌓인 종이" 연출 */}
          <div className="pointer-events-none absolute inset-0 translate-x-[14px] translate-y-[14px] rounded-[14px] bg-[#f6f4f1] shadow-[0_24px_48px_-20px_rgba(60,54,48,0.28)]" />
          <div className="pointer-events-none absolute inset-0 translate-x-[7px] translate-y-[7px] rounded-[14px] bg-[#fbfaf8] shadow-[0_18px_36px_-18px_rgba(60,54,48,0.22)]" />

          {/* notebook page */}
          <section
            className="relative z-10 flex h-[min(900px,calc(100dvh-64px))] flex-col rounded-[14px] bg-white px-6 pb-8 pt-9 shadow-[0_30px_60px_-24px_rgba(60,54,48,0.35)] sm:px-[52px] sm:pb-10 sm:pt-11"
            style={{
              backgroundImage: 'radial-gradient(rgba(120,110,100,0.025) 1px, transparent 1px)',
              backgroundSize: '4px 4px',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-record-title"
          >
            {savedRecord && existingCollectionAddResults && collectionCreationResults ? (
              <PlaceRecordResult
                data={savedRecord}
                existingCollectionAddResults={existingCollectionAddResults}
                collectionCreationResults={collectionCreationResults}
                onClose={handleClose}
                onCollectionCreated={setCoverTargetCollection}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="장소 기록 닫기"
                  className="absolute right-6 top-6 grid h-11 w-11 place-items-center rounded-full bg-[#efece8] text-lg text-[#6f6a63] transition-colors hover:bg-[#e2ddd6] sm:right-[26px] sm:top-[26px]"
                >
                  ✕
                </button>

                <div className="flex-none pr-14">
                  <p className="text-[13px] font-extrabold tracking-[0.14em] text-[#4f9b78]">
                    PLACE RECORD
                  </p>
                  <h2
                    id="place-record-title"
                    className="mt-2 text-[32px] font-extrabold leading-[1.05] tracking-[-0.02em] text-[#2c2a28] sm:text-[38px]"
                  >
                    장소 기록
                  </h2>
                </div>

                <div className="mt-6 flex min-h-0 flex-1 flex-col overflow-y-auto">
                  {stage === 'entry' && (
                    <div className="flex flex-1 flex-col gap-1">
                      <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                        장소 검색
                      </h3>
                      <p className="mb-4 text-[15px] font-medium text-[#8a857e]">
                        등록하려는 장소의 이름이나 주소를 적어보세요.
                      </p>

                      {searchBox}

                      <div className="my-7 flex items-center gap-4">
                        <div className="h-0 flex-1 border-t-2 border-dashed border-[#ddd7cd]" />
                        <span className="font-[Gaegu] text-xl text-[#a29d95]">OR</span>
                        <div className="h-0 flex-1 border-t-2 border-dashed border-[#ddd7cd]" />
                      </div>

                      <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                        대화 캡처 업로드
                      </h3>
                      <p className="text-[15px] font-medium text-[#8a857e]">
                        장소명이나 지역 정보가 보이는 대화 캡처 화면을 올려 주세요.
                      </p>
                      <p className="mb-4 mt-1.5 text-[13px] font-medium text-[#b0aba3]">
                        * 분석된 이미지는 저장되지 않으며, 장소 후보 확인에만 사용됩니다.
                      </p>

                      <div className="mx-auto mb-5 w-full max-w-[380px]">
                        <label
                          htmlFor="place-capture-input"
                          onDragOver={(event) => {
                            event.preventDefault();
                            setIsDraggingImage(true);
                          }}
                          onDragLeave={() => setIsDraggingImage(false)}
                          onDrop={handleDropImage}
                          className={
                            'block cursor-pointer overflow-hidden rounded-xl border-[6px] shadow-[0_8px_20px_-10px_rgba(60,54,48,0.4)] transition-colors ' +
                            (isDraggingImage ? 'border-[#e9f4ee]' : 'border-white')
                          }
                          style={{ transform: 'rotate(-0.8deg)' }}
                        >
                          <input
                            id="place-capture-input"
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={handleImageInputChange}
                            className="sr-only"
                          />
                          {imagePreviewUrl && imageFile ? (
                            <span className="grid grid-cols-[88px_1fr] items-center gap-3 bg-[#faf9f7] p-3 text-left">
                              <img
                                src={imagePreviewUrl}
                                alt="업로드한 캡처 미리보기"
                                className="h-[88px] w-[88px] rounded-lg object-cover"
                              />
                              <span>
                                <strong className="block text-sm font-extrabold text-[#2c2a28]">
                                  {imageFile.name}
                                </strong>
                                <small className="mt-1 block text-xs leading-6 text-[#8a857e]">
                                  이 이미지로 대화 속 장소와 메모를 분석합니다.
                                </small>
                              </span>
                            </span>
                          ) : (
                            <span className="grid min-h-[200px] place-items-center bg-[#faf9f7] p-6 text-center">
                              <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl border-2 border-[#4f9b78]/60 text-3xl font-bold text-[#4f9b78]">
                                +
                              </span>
                              <strong className="block text-sm font-extrabold text-[#2c2a28]">
                                이미지를 드래그하거나 클릭하여 업로드
                              </strong>
                              <small className="mt-2 block text-xs text-[#8a857e]">
                                JPG, PNG · 최대 1장(10MB 이하)
                              </small>
                            </span>
                          )}
                        </label>
                      </div>
                      {imageFileError && (
                        <p className="text-center text-sm text-red-600">{imageFileError}</p>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          void handleStartAnalysis();
                        }}
                        disabled={!imageFile || suggestionMutation.isPending}
                        className={ctaButtonClass(
                          !imageFile || suggestionMutation.isPending,
                          'bg-[#4f9b78]',
                        )}
                      >
                        이 이미지로 분석 시작
                      </button>
                    </div>
                  )}

                  {stage === 'analysis' && (
                    <div className="flex flex-1 flex-col items-center justify-center">
                      <div className="relative h-[140px] w-[140px]">
                        <svg
                          width="140"
                          height="140"
                          viewBox="0 0 140 140"
                          style={{ transform: 'rotate(-90deg)' }}
                        >
                          <circle
                            cx="70"
                            cy="70"
                            r="60"
                            fill="none"
                            stroke="#dcecdf"
                            strokeWidth="12"
                          />
                          <circle
                            cx="70"
                            cy="70"
                            r="60"
                            fill="none"
                            stroke="#5faa84"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={`${RING_CIRCUMFERENCE * RING_ARC_RATIO} ${RING_CIRCUMFERENCE}`}
                            className="origin-center animate-spin"
                            style={{ animationDuration: '1.6s' }}
                          />
                        </svg>
                      </div>
                      <h3 className="mt-6 text-[22px] font-extrabold tracking-[-0.01em] text-[#2c2a28]">
                        대화를 분석하고 있어요
                      </h3>

                      <div className="mx-auto mt-8 flex w-full max-w-[300px] flex-col gap-4">
                        {ANALYSIS_STEP_LABELS.map((label, index) => {
                          const isDone = index < analysisPhase;
                          const isActive = index === analysisPhase;
                          return (
                            <div key={label} className="flex items-center gap-3">
                              {isDone ? (
                                <span
                                  className="text-lg font-extrabold leading-none text-[#4f9b78]"
                                  aria-hidden="true"
                                >
                                  ✓
                                </span>
                              ) : (
                                <span
                                  className={
                                    'h-2.5 w-2.5 flex-none rounded-full ' +
                                    (isActive ? 'animate-pulse bg-[#2c2a28]' : 'bg-[#2c2a28]/15')
                                  }
                                  aria-hidden="true"
                                />
                              )}
                              <span
                                className={
                                  'text-[16px] font-bold ' +
                                  (isDone ? 'text-[#3f7d5f]' : 'text-[#2c2a28]')
                                }
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-auto w-full rounded-xl bg-gradient-to-br from-[#e9f4ee] to-[#dcecdf] px-6 py-5 text-center text-[15px] font-bold text-[#2c2a28]">
                        분석이 완료되면 장소 후보를 보여드릴게요.
                      </div>
                    </div>
                  )}

                  {stage === 'failure' && (
                    <div className="flex flex-1 flex-col items-center justify-center text-center">
                      <div className="mb-4 grid h-[86px] w-[86px] place-items-center rounded-3xl border border-[#2c2a28]/10 bg-white text-4xl font-bold text-[#2c2a28] shadow-[0_10px_24px_rgba(60,54,48,0.08)]">
                        !
                      </div>
                      <h3 className="text-[22px] font-extrabold tracking-[-0.01em] text-[#2c2a28]">
                        이미지를 분석하지 못했어요
                      </h3>
                      <p className="mt-2 max-w-[340px] text-[15px] leading-7 text-[#8a857e]">
                        대화 내용이 잘리거나 장소명이 충분히 보이지 않으면 분석이 어려울 수 있어요.
                      </p>
                      <div className="mt-4 w-full rounded-xl border-[1.5px] border-[#e5e2dd] bg-white p-4 text-left text-[13px] leading-6 text-[#8a857e]">
                        확인해 주세요.
                        <br />· 장소명 또는 지역 공유 영역이 화면에 포함되어 있나요?
                        <br />· 캡처가 너무 작거나 흐리지 않나요?
                        <br />· 한 장의 이미지에 대화 맥락이 함께 보이나요?
                      </div>
                      {suggestionMutation.isError && (
                        <p className="mt-3 text-sm text-red-600">
                          {imageErrorMessage(suggestionMutation.error)}
                        </p>
                      )}
                      {suggestionWarnings.length > 0 && (
                        <div className="mt-3 w-full rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-[13px] leading-6 text-amber-800">
                          {suggestionWarnings.map((message, index) => (
                            <p key={index}>{message}</p>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleRetryImage}
                        className="mt-auto h-[60px] w-full flex-none rounded-[14px] border-[1.5px] border-[#cfe6d9] bg-white text-[19px] font-extrabold text-[#2c2a28] transition-colors hover:bg-[#f4faf7]"
                      >
                        다시 시도하기
                      </button>
                    </div>
                  )}

                  {stage === 'candidates' && (
                    <div className="flex flex-1 flex-col gap-1">
                      <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                        대화에서 찾은 장소
                      </h3>
                      <p className="mb-5 text-[15px] font-medium text-[#8a857e]">
                        저장할 장소를 선택해 주세요.
                      </p>

                      {suggestionWarnings.length > 0 && (
                        <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left text-[13px] leading-6 text-amber-800">
                          {suggestionWarnings.map((message, index) => (
                            <p key={index}>{message}</p>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-col gap-2.5">
                        {suggestedOptions.map((option) => {
                          const selected = selectedSuggestionId === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => setSelectedSuggestionId(option.id)}
                              className={
                                'flex items-center gap-4 rounded-[14px] border-[1.5px] px-5 py-4 text-left transition-colors ' +
                                (selected
                                  ? 'border-[#5faa84] bg-gradient-to-br from-[#e9f4ee] to-[#dcecdf]'
                                  : 'border-[#e5e2dd] bg-white hover:border-[#cfe6d9]')
                              }
                            >
                              <span
                                className={
                                  'grid h-[26px] w-[26px] flex-none place-items-center rounded-full border-2 ' +
                                  (selected
                                    ? 'border-[#2c2a28] bg-[#2c2a28]'
                                    : 'border-[#d8d3cc] bg-white')
                                }
                                aria-hidden="true"
                              >
                                <span
                                  className={
                                    'h-[9px] w-[9px] rounded-full ' +
                                    (selected ? 'bg-white' : 'bg-transparent')
                                  }
                                />
                              </span>
                              <span className="flex min-w-0 flex-col gap-1.5">
                                <strong className="truncate text-[17px] font-extrabold text-[#2c2a28]">
                                  {option.place.name}
                                </strong>
                                <small className="text-sm font-medium text-[#8a857e]">
                                  {placeMeta(option.place) || option.extractedName}
                                </small>
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {unresolvedCandidates.length > 0 && (
                        <div className="mt-2.5 flex flex-col gap-2.5">
                          {unresolvedCandidates.map((candidate) => (
                            <div
                              key={candidate.candidateId}
                              className="rounded-[14px] border-[1.5px] border-dashed border-[#e5e2dd] bg-[#faf9f7] px-5 py-4 text-left"
                            >
                              <strong className="block text-[15px] font-extrabold text-[#2c2a28]">
                                {candidate.extractedName}
                              </strong>
                              <small className="mt-1 block text-[13px] leading-5 text-[#8a857e]">
                                {unresolvedCandidateMessage(candidate.status)}
                              </small>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex-1" />

                      <button
                        type="button"
                        onClick={() => {
                          if (selectedSuggestion) {
                            handleConfirmSuggestion(selectedSuggestion);
                          }
                        }}
                        disabled={!selectedSuggestion}
                        className={ctaButtonClass(!selectedSuggestion, 'bg-[#5faa84]')}
                      >
                        이 장소로 기록하기
                      </button>
                      <button
                        type="button"
                        onClick={() => setStage('entry')}
                        className="mt-3 h-[60px] w-full flex-none rounded-[14px] border-[1.5px] border-[#cfe6d9] bg-white text-[17px] font-extrabold text-[#2c2a28] transition-colors hover:bg-[#f4faf7]"
                      >
                        찾는 장소가 없나요? 직접 검색하기
                      </button>
                    </div>
                  )}

                  {showDetails && (
                    <div className="place-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pb-1 pr-1">
                      {isEditingPlace ? (
                        <>
                          <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                            장소 검색
                          </h3>
                          <p className="mb-4 text-[15px] font-medium text-[#8a857e]">
                            새로 검색해서 장소를 바꿀 수 있어요.
                          </p>
                          {searchBox}
                        </>
                      ) : (
                        sheet.selectedPlace && (
                          <>
                            <h3 className="mb-3 text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                              선택한 장소
                            </h3>
                            <div className="relative rounded-[14px] border-[1.5px] border-[#e5e2dd] px-5 py-4">
                              <button
                                type="button"
                                onClick={handleEditPlace}
                                className="absolute right-5 top-4 text-sm font-extrabold text-[#4f9b78]"
                              >
                                수정
                              </button>
                              <div className="pr-12 text-[17px] font-extrabold text-[#2c2a28]">
                                {sheet.selectedPlace.name}
                              </div>
                              <div className="mt-1.5 text-sm font-medium text-[#8a857e]">
                                {placeMeta(sheet.selectedPlace)}
                              </div>
                            </div>
                          </>
                        )
                      )}

                      <h3 className="mb-3 mt-6 text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                        기록할 내용
                      </h3>
                      <div className="relative rounded-[14px] border-[1.5px] border-[#e5e2dd]">
                        <textarea
                          id="place-context-body"
                          value={sheet.contextBody}
                          onChange={(event) => sheet.setContextBody(event.target.value)}
                          maxLength={CONTEXT_BODY_MAX_LENGTH}
                          placeholder="이 장소에서 기억하고 싶은 내용을 적어보세요"
                          className="min-h-[98px] w-full resize-none rounded-[14px] border-none bg-transparent p-5 pb-8 text-base leading-6 text-[#2c2a28] outline-none placeholder:text-[#b7b3ad]"
                        />
                        <span className="absolute bottom-3.5 right-5 text-sm font-bold text-[#a8a39b]">
                          {sheet.contextBody.length}/{CONTEXT_BODY_MAX_LENGTH}
                        </span>
                      </div>

                      {selectedSuggestion && (
                        <>
                          <h3 className="mb-3 mt-6 text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                            대화 내용 근거
                          </h3>
                          <div className="rounded-[14px] border-[1.5px] border-[#e5e2dd] bg-[#faf9f7] px-5 py-4">
                            <p className="text-[15px] leading-7 text-[#5c574f]">
                              {selectedSuggestion.evidence.length > 0
                                ? selectedSuggestion.evidence.join(' … ')
                                : '대화 근거가 없습니다.'}
                            </p>
                          </div>
                        </>
                      )}

                      <div className="mt-6 flex items-center justify-between gap-2">
                        <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#4f9b78]">
                          추가할 컬렉션 · 선택 사항
                        </h3>
                        {/* 327: 이 흐름의 새 컬렉션은 1개까지다. 여러 개를 허용하면 저장 완료 후
                            표지 모달이 연달아 떠 저장의 완결감을 끊는다. 기존 컬렉션 다중 선택은
                            그대로다(그쪽은 표지를 고를 일이 없다). */}
                        <button
                          type="button"
                          onClick={() => setIsNewCollectionModalOpen(true)}
                          disabled={hasStagedCollection}
                          className="flex-none whitespace-nowrap rounded-full bg-[#e9f4ee] px-4 py-2.5 text-[13px] font-extrabold text-[#3f7d5f] disabled:opacity-40"
                        >
                          + 컬렉션 생성
                        </button>
                      </div>

                      {hasStagedCollection && (
                        <p className="mt-2 text-sm text-[#8a857e]">
                          여기서는 새 컬렉션을 하나만 만들 수 있어요. 더 필요하면 저장 후 나의
                          책장에서 만들어 주세요.
                        </p>
                      )}

                      {sheet.stagedCollectionTitles.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {sheet.stagedCollectionTitles.map((title, index) => (
                            <span
                              key={`${title}-${index}`}
                              className="flex items-center gap-1.5 rounded-full border-[1.5px] border-dashed border-[#5faa84] px-3.5 py-2 text-sm font-bold text-[#3f7d5f]"
                            >
                              {title}
                              <button
                                type="button"
                                onClick={() => sheet.unstageCollectionTitle(index)}
                                aria-label={`${title} 컬렉션 생성 취소`}
                                className="text-[#3f7d5f]/70 hover:text-[#3f7d5f]"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      )}

                      {previewMode && (
                        <p className="mt-3 text-sm text-[#8a857e]">
                          미리보기에서는 컬렉션 목록 API를 호출하지 않아요.
                        </p>
                      )}
                      {!previewMode && myCollectionsQuery.isPending && (
                        <p className="mt-3 text-sm text-[#8a857e]">컬렉션을 불러오는 중...</p>
                      )}
                      {!previewMode && myCollectionsQuery.isError && (
                        <p className="mt-3 text-sm text-red-600">컬렉션을 불러오지 못했어요.</p>
                      )}
                      {!previewMode &&
                        myCollectionsQuery.isSuccess &&
                        myCollections.length === 0 && (
                          <p className="mt-3 text-sm text-[#8a857e]">아직 만든 컬렉션이 없어요.</p>
                        )}
                      {myCollections.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {myCollections.map((collection) => {
                            const isSelected = selectedCollectionIds.includes(
                              collection.collectionId,
                            );
                            return (
                              <button
                                key={collection.collectionId}
                                type="button"
                                onClick={() =>
                                  toggleCollection(collection.collectionId, collection.title)
                                }
                                aria-pressed={isSelected}
                                className={
                                  'rounded-full border-[1.5px] px-4 py-2.5 text-sm font-bold transition-colors ' +
                                  (isSelected
                                    ? 'border-[#5faa84] bg-[#e9f4ee] text-[#3f7d5f]'
                                    : 'border-[#e5e2dd] bg-white text-[#2c2a28]')
                                }
                              >
                                {collection.title}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {createMutation.isError && (
                        <p className="mt-3 text-sm text-red-600">{createMutation.error.message}</p>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          void handleSave();
                        }}
                        disabled={!canSave}
                        className={ctaButtonClass(!canSave, 'bg-[#5faa84]')}
                      >
                        {isSaving ? '저장 중...' : '저장'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      <NewCollectionModal
        isOpen={isNewCollectionModalOpen}
        mode="fromNewRecord"
        onClose={() => setIsNewCollectionModalOpen(false)}
        onTitleStaged={(title) => sheet.stageCollectionTitle(title)}
      />

      {/* 327: 저장 결과 화면 **위에** 겹쳐 띄운다. 저장은 이미 끝났고(뒤에 결과가 보인다) 표지는
          그 다음 일이라, 결과보다 먼저 띄우면 저장이 아직 안 끝난 것처럼 보인다. 닫으면 결과
          화면이 그대로 남아 사용자가 "확인"으로 마무리한다. */}
      {coverTargetCollection && (
        <CollectionCoverModal
          collection={coverTargetCollection}
          onClose={() => setCoverTargetCollection(null)}
        />
      )}
    </>
  );
}

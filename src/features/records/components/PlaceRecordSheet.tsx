import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type MouseEvent,
} from 'react';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { useKakaoPlaceSearch } from '@/features/places/hooks/useKakaoPlaceSearch';
import { usePlaceSuggestionMutation } from '@/features/places/hooks/usePlaceSuggestionMutation';
import type { KakaoPlace } from '@/features/places/api/searchKakaoPlaces';
import type { PlaceSuggestionCandidate } from '@/features/places/api/suggestPlacesFromImage';
import { useMyCollectionsQuery } from '@/features/collections/hooks/useMyCollectionsQuery';
import { useAddRecordsToCollectionMutation } from '@/features/collections/hooks/useAddRecordsToCollectionMutation';
import { useCreateCollectionMutation } from '@/features/collections/hooks/useCreateCollectionMutation';
import { NewCollectionModal } from '@/features/collections/components/NewCollectionModal';
import { useCreateRecordMutation } from '../hooks/useCreateRecordMutation';
import type { CreateRecordResponse } from '../api/createRecord';
import {
  PlaceRecordResult,
  type CollectionCreationOutcome,
  type ExistingCollectionAddOutcome,
} from './PlaceRecordResult';

const CONTEXT_BODY_MAX_LENGTH = 500;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg']);
const ANALYSIS_STEP_LABELS = ['대화 내용 확인', '장소 후보 검색 중', '메모 작성 중'];
const ANALYSIS_STEP_DELAY_MS = 700;
const ANALYSIS_DONE_HOLD_MS = 180;

type ActiveTab = 'manual' | 'image';
type ImageStage = 'upload' | 'analysis' | 'candidates' | 'details' | 'failure';

interface PlaceRecordSheetProps {
  previewMode?: boolean;
}

interface SuggestedPlaceOption {
  id: string;
  place: KakaoPlace;
  extractedName: string;
  contextSuggestion: string;
  evidence: string[];
}

function stopClick(event: MouseEvent) {
  event.stopPropagation();
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

function placeMeta(place: KakaoPlace): string {
  return [place.categoryName, place.roadAddress || place.address].filter(Boolean).join(' · ');
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
 * mockup/place-record-popup.html의 단계형 팝업 흐름을 실제 Record 저장 기능에 연결한 장소 추가 화면.
 * 최종 저장은 기존 POST /records와 컬렉션 추가 흐름을 그대로 사용한다.
 */
export function PlaceRecordSheet({ previewMode = false }: PlaceRecordSheetProps) {
  const sheet = usePlaceRecordSheet();
  const searchMutation = useKakaoPlaceSearch();
  const suggestionMutation = usePlaceSuggestionMutation();
  const createMutation = useCreateRecordMutation();
  const myCollectionsQuery = useMyCollectionsQuery(sheet.isOpen && !previewMode);
  const addToCollectionMutation = useAddRecordsToCollectionMutation();
  const createCollectionMutation = useCreateCollectionMutation();

  const [activeTab, setActiveTab] = useState<ActiveTab>('image');
  const [imageStage, setImageStage] = useState<ImageStage>('upload');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageFileError, setImageFileError] = useState('');
  const [suggestedOptions, setSuggestedOptions] = useState<SuggestedPlaceOption[]>([]);
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
    setActiveTab('image');
    setImageStage('upload');
    setAnalysisPhase(0);
    setImageFile(null);
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl('');
    setImageFileError('');
    setSuggestedOptions([]);
    setSelectedSuggestionId(null);
    setIsEditingPlace(false);
    setSelectedCollectionIds([]);
    setSelectedCollectionTitles({});
    setIsNewCollectionModalOpen(false);
    setIsAddingToCollections(false);
    setExistingCollectionAddResults(null);
    setCollectionCreationResults(null);
    setPreviewSavedRecord(null);
  };

  const handleClose = () => {
    sheet.close();
    resetLocalState();
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    searchMutation.reset();
    setImageFileError('');
    setIsEditingPlace(false);
    if (tab === 'manual') {
      setImageStage('upload');
    }
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
      setImageFileError('5MB 이하 이미지만 선택할 수 있습니다.');
      return;
    }
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    setImageFileError('');
    setSuggestedOptions([]);
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
    setImageStage('analysis');
    setAnalysisPhase(0);
    setSuggestedOptions([]);
    setSelectedSuggestionId(null);
    setIsEditingPlace(false);
    sheet.selectPlace(null);
    sheet.setContextBody('');
    analysisTimersRef.current = [
      window.setTimeout(() => setAnalysisPhase(1), ANALYSIS_STEP_DELAY_MS),
      window.setTimeout(() => setAnalysisPhase(2), ANALYSIS_STEP_DELAY_MS * 2),
    ];

    const finishAnalysis = (options: SuggestedPlaceOption[]) => {
      clearAnalysisTimers();
      setAnalysisPhase(3);
      window.setTimeout(() => {
        setSuggestedOptions(options);
        setSelectedSuggestionId(options[0].id);
        setImageStage('candidates');
      }, ANALYSIS_DONE_HOLD_MS);
    };

    if (previewMode) {
      window.setTimeout(() => finishAnalysis(previewSuggestedOptions), 350);
      return;
    }
    try {
      const data = await suggestionMutation.mutateAsync(imageFile);
      const options = toSuggestedOptions(data.candidates);
      if (options.length === 0) {
        clearAnalysisTimers();
        setImageStage('failure');
        return;
      }
      finishAnalysis(options);
    } catch {
      clearAnalysisTimers();
      setImageStage('failure');
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
    setImageStage('details');
  };

  const handleRetryImage = () => {
    clearAnalysisTimers();
    suggestionMutation.reset();
    setAnalysisPhase(0);
    setImageStage('upload');
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
  const manualDetailsReady = activeTab === 'manual' && !!sheet.selectedPlace;
  const showDetails = activeTab === 'image' ? imageStage === 'details' : manualDetailsReady;

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-pin-navy/40 p-4 backdrop-blur-sm"
        onClick={handleClose}
        role="presentation"
      >
        <section
          className="flex h-[min(560px,calc(100dvh-32px))] w-[min(500px,calc(100vw-32px))] flex-col overflow-hidden rounded-[18px] border border-line-card bg-paper-white bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_51px,rgba(109,102,99,0.08)_52px)] shadow-[0_-18px_55px_rgba(4,33,66,0.30)]"
          onClick={stopClick}
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
            />
          ) : (
            <>
              <header className="flex items-center justify-between gap-4 border-b border-line-subtle bg-paper-white/95 px-5 py-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.12em] text-log-mint">
                    PLACE RECORD
                  </p>
                  <h2 id="place-record-title" className="mt-1 text-[21px] font-bold text-pin-navy">
                    장소 기록
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="장소 기록 닫기"
                  className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-pin-navy/10 text-lg text-pin-navy hover:bg-pin-navy/15"
                >
                  x
                </button>
              </header>

              <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
                <div
                  className="grid grid-cols-2 rounded-[11px] bg-pin-navy/[0.06] p-[3px]"
                  role="tablist"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'manual'}
                    onClick={() => handleTabChange('manual')}
                    className={
                      activeTab === 'manual'
                        ? 'h-11 rounded-[9px] bg-log-mint text-sm font-bold text-pin-navy'
                        : 'h-11 rounded-[9px] text-sm font-medium text-pin-navy/60 hover:text-pin-navy'
                    }
                  >
                    직접 검색
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'image'}
                    onClick={() => handleTabChange('image')}
                    className={
                      activeTab === 'image'
                        ? 'h-11 rounded-[9px] bg-log-mint text-sm font-bold text-pin-navy'
                        : 'h-11 rounded-[9px] text-sm font-medium text-pin-navy/60 hover:text-pin-navy'
                    }
                  >
                    이미지로 기록
                  </button>
                </div>

                {activeTab === 'image' && imageStage === 'upload' && (
                  <section className="flex min-h-0 flex-1 flex-col gap-3">
                    <div>
                      <h3 className="mt-1 text-[15px] font-bold text-pin-navy">대화 캡처 업로드</h3>
                      <p className="mt-1 text-[13px] leading-7 text-ink-gray">
                        장소명이나 지역 정보가 보이는 대화 캡처 화면을 올려 주세요.
                      </p>
                    </div>

                    <label
                      htmlFor="place-capture-input"
                      onDragOver={(event) => {
                        event.preventDefault();
                        setIsDraggingImage(true);
                      }}
                      onDragLeave={() => setIsDraggingImage(false)}
                      onDrop={handleDropImage}
                      className={
                        isDraggingImage
                          ? 'grid min-h-[172px] cursor-pointer place-items-center rounded-[10px] border border-dashed border-log-mint bg-white/90 p-5 text-center'
                          : 'grid min-h-[172px] cursor-pointer place-items-center rounded-[10px] border border-dashed border-pin-navy/20 bg-white/70 p-5 text-center hover:border-log-mint hover:bg-white/90'
                      }
                    >
                      <input
                        id="place-capture-input"
                        type="file"
                        accept="image/png,image/jpeg"
                        onChange={handleImageInputChange}
                        className="sr-only"
                      />
                      {imagePreviewUrl && imageFile ? (
                        <span className="grid w-full grid-cols-[96px_1fr] items-center gap-3 text-left">
                          <img
                            src={imagePreviewUrl}
                            alt="업로드한 캡처 미리보기"
                            className="h-24 w-24 rounded-[10px] object-cover shadow-[0_8px_18px_rgba(4,33,66,0.12)]"
                          />
                          <span>
                            <strong className="block text-[13px] font-extrabold text-pin-navy">
                              {imageFile.name}
                            </strong>
                            <small className="mt-1 block text-xs leading-6 text-ink-gray">
                              이 이미지로 대화 속 장소와 메모를 분석합니다.
                            </small>
                          </span>
                        </span>
                      ) : (
                        <span>
                          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[14px] border-2 border-log-mint/60 text-3xl font-bold text-log-mint">
                            +
                          </span>
                          <strong className="block text-[13px] font-extrabold text-pin-navy">
                            이미지 파일을 드래그하거나 클릭하여 업로드
                          </strong>
                          <small className="mt-2 block text-xs text-ink-gray">
                            JPG, PNG · 최대 1장(5MB 이하)
                          </small>
                        </span>
                      )}
                    </label>

                    <p className="rounded-[10px] bg-log-mint/[0.07] px-3 py-2 text-xs leading-6 text-ink-gray">
                      분석된 이미지는 저장되지 않으며, 장소 후보 확인에만 사용됩니다.
                    </p>
                    {imageFileError && <p className="text-xs text-red-600">{imageFileError}</p>}

                    <button
                      type="button"
                      onClick={() => {
                        void handleStartAnalysis();
                      }}
                      disabled={!imageFile || suggestionMutation.isPending}
                      className="mt-auto h-[52px] flex-none rounded-[10px] bg-log-mint text-[15px] font-bold text-pin-navy disabled:opacity-40"
                    >
                      분석 시작
                    </button>
                  </section>
                )}

                {activeTab === 'image' && imageStage === 'analysis' && (
                  <section className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-2 grid h-[116px] w-[116px] animate-spin place-items-center rounded-full border-[7px] border-log-mint/30 border-t-log-mint" />
                    <p className="mt-2 text-[17px] font-extrabold text-pin-navy">
                      대화를 분석하고 있어요
                    </p>
                    <div className="mt-5 grid gap-2 text-left text-[13px] font-bold text-pin-navy">
                      {ANALYSIS_STEP_LABELS.map((label, index) => {
                        const isDone = index < analysisPhase;
                        const isActive = index === analysisPhase;
                        return (
                          <span key={label} className="flex items-center gap-2.5">
                            {isDone ? (
                              <span
                                className="w-[9px] flex-none text-xs font-extrabold leading-none text-log-mint"
                                aria-hidden="true"
                              >
                                ✓
                              </span>
                            ) : (
                              <span
                                className={
                                  isActive
                                    ? 'h-[9px] w-[9px] flex-none animate-pulse rounded-full border-2 border-pin-navy bg-pin-navy'
                                    : 'h-[9px] w-[9px] flex-none rounded-full border-2 border-pin-navy/20'
                                }
                                aria-hidden="true"
                              />
                            )}
                            {label}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-auto w-full rounded-[10px] bg-log-mint/[0.07] px-3 py-2 text-xs leading-6 text-ink-gray">
                      분석이 완료되면 장소 후보를 보여드릴게요.
                    </p>
                  </section>
                )}

                {activeTab === 'image' && imageStage === 'failure' && (
                  <section className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="mb-3 grid h-[86px] w-[86px] place-items-center rounded-3xl border border-pin-navy/10 bg-white/80 text-4xl font-bold text-pin-navy shadow-[0_10px_24px_rgba(4,33,66,0.08)]">
                      !
                    </div>
                    <p className="text-[17px] font-extrabold text-pin-navy">
                      이미지를 분석하지 못했어요
                    </p>
                    <p className="mt-2 max-w-[340px] text-[13px] leading-7 text-ink-gray">
                      대화 내용이 잘리거나 장소명이 충분히 보이지 않으면 분석이 어려울 수 있어요.
                    </p>
                    <div className="mt-4 w-full rounded-[10px] border border-pin-navy/10 bg-white/80 p-3 text-left text-xs leading-6 text-ink-gray">
                      확인해 주세요.
                      <br />· 장소명 또는 지역 공유 영역이 화면에 포함되어 있나요?
                      <br />· 캡처가 너무 작거나 흐리지 않나요?
                      <br />· 한 장의 이미지에 대화 맥락이 함께 보이나요?
                    </div>
                    {suggestionMutation.isError && (
                      <p className="mt-3 text-xs text-red-600">
                        {imageErrorMessage(suggestionMutation.error)}
                      </p>
                    )}
                    <div className="mt-auto grid w-full grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleRetryImage}
                        className="h-[52px] rounded-[10px] border border-pin-navy/15 bg-white text-sm font-bold text-pin-navy"
                      >
                        다시 업로드
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTabChange('manual')}
                        className="h-[52px] rounded-[10px] bg-log-mint text-sm font-bold text-pin-navy"
                      >
                        직접 검색
                      </button>
                    </div>
                  </section>
                )}

                {activeTab === 'image' && imageStage === 'candidates' && (
                  <section className="flex min-h-0 flex-1 flex-col gap-3">
                    <div>
                      <h3 className="mt-1 text-[15px] font-bold text-pin-navy">
                        대화에서 찾은 장소
                      </h3>
                      <p className="mt-1 text-[13px] leading-7 text-ink-gray">
                        저장할 장소를 선택해 주세요.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      {suggestedOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          aria-pressed={selectedSuggestionId === option.id}
                          onClick={() => setSelectedSuggestionId(option.id)}
                          className={
                            selectedSuggestionId === option.id
                              ? 'grid min-h-[72px] grid-cols-[24px_1fr] items-center gap-3 rounded-[10px] border border-log-mint bg-log-mint/15 px-3 py-3 text-left text-pin-navy'
                              : 'grid min-h-[72px] grid-cols-[24px_1fr] items-center gap-3 rounded-[10px] border border-pin-navy/15 bg-white px-3 py-3 text-left text-pin-navy hover:border-log-mint'
                          }
                        >
                          <span
                            className={
                              selectedSuggestionId === option.id
                                ? 'h-5 w-5 rounded-full border-[6px] border-pin-navy bg-white'
                                : 'h-5 w-5 rounded-full border-2 border-pin-navy/20 bg-white'
                            }
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <strong className="block truncate text-[13px] font-extrabold">
                              {option.place.name}
                            </strong>
                            <small className="mt-1 block text-[11px] leading-5 text-ink-gray">
                              {placeMeta(option.place) || option.extractedName}
                            </small>
                          </span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedSuggestion) {
                          handleConfirmSuggestion(selectedSuggestion);
                        }
                      }}
                      disabled={!selectedSuggestion}
                      className="mt-auto h-[52px] rounded-[10px] bg-log-mint text-[15px] font-bold text-pin-navy disabled:opacity-40"
                    >
                      이 장소로 기록하기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('manual')}
                      className="h-[52px] rounded-[10px] border border-pin-navy/15 bg-white text-sm font-bold text-pin-navy hover:border-log-mint"
                    >
                      찾는 장소가 없나요? 직접 검색하기
                    </button>
                  </section>
                )}

                {(activeTab === 'manual' || isEditingPlace) && (
                  <section className="flex flex-col gap-3">
                    <label
                      htmlFor="place-search-input"
                      className="text-[11px] font-bold tracking-[0.12em] text-log-mint"
                    >
                      장소 검색
                    </label>
                    <div className="grid grid-cols-[1fr_78px] gap-2">
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
                        placeholder="장소명 또는 지역을 입력하세요"
                        autoComplete="off"
                        className="h-[46px] rounded-[10px] border border-pin-navy/15 bg-white/95 px-3 text-sm font-semibold text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
                      />
                      <button
                        type="button"
                        onClick={handleSearch}
                        disabled={!sheet.searchQuery.trim() || searchMutation.isPending}
                        className="h-[46px] rounded-[10px] bg-pin-navy text-sm font-bold text-white disabled:opacity-40"
                      >
                        {searchMutation.isPending ? '검색 중' : '검색'}
                      </button>
                    </div>

                    {showResults && (
                      <div className="grid max-h-48 gap-2 overflow-y-auto">
                        {searchResults.map((place) => (
                          <button
                            key={place.kakaoPlaceId}
                            type="button"
                            onClick={() => handleSelect(place)}
                            className="min-h-[54px] rounded-[10px] border border-pin-navy/15 bg-white px-3 py-2 text-left text-pin-navy hover:border-log-mint hover:bg-log-mint/[0.06]"
                          >
                            <strong className="block text-[13px] font-extrabold">
                              {place.name}
                            </strong>
                            <small className="mt-1 block text-[11px] leading-5 text-ink-gray">
                              {placeMeta(place)}
                            </small>
                          </button>
                        ))}
                      </div>
                    )}
                    {showEmptyResult && (
                      <p className="text-xs text-ink-gray">검색 결과가 없습니다.</p>
                    )}
                    {searchMutation.isError && (
                      <p className="text-xs text-red-600">
                        {searchErrorMessage(searchMutation.error)}
                      </p>
                    )}
                  </section>
                )}

                {showDetails && (
                  <section className="flex min-h-0 flex-1 flex-col gap-3">
                    {sheet.selectedPlace && (
                      <div>
                        <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-log-mint">
                          선택한 장소
                        </div>
                        <div className="flex min-h-[58px] items-center justify-between gap-3 rounded-[10px] border border-pin-navy/10 bg-white/90 px-3 py-3 text-left text-pin-navy shadow-[0_4px_12px_rgba(4,33,66,0.04)]">
                          <span className="min-w-0">
                            <strong className="block truncate text-[13px] font-extrabold">
                              {sheet.selectedPlace.name}
                            </strong>
                            <small className="mt-1 block text-[11px] leading-5 text-ink-gray">
                              {placeMeta(sheet.selectedPlace)}
                            </small>
                          </span>
                          <button
                            type="button"
                            onClick={handleEditPlace}
                            className="flex-none text-xs font-bold text-log-mint"
                          >
                            수정
                          </button>
                        </div>
                      </div>
                    )}

                    <label
                      htmlFor="place-context-body"
                      className="text-[11px] font-bold tracking-[0.12em] text-log-mint"
                    >
                      기록할 내용
                    </label>
                    <div className="relative">
                      <textarea
                        id="place-context-body"
                        value={sheet.contextBody}
                        onChange={(event) => sheet.setContextBody(event.target.value)}
                        maxLength={CONTEXT_BODY_MAX_LENGTH}
                        placeholder="이 장소에서 기억하고 싶은 맥락을 적어보세요"
                        className="min-h-[126px] w-full resize-none rounded-[10px] border border-pin-navy/15 bg-white/95 p-3 pb-7 text-sm font-medium leading-7 text-pin-navy outline-none placeholder:text-ink-gray-light focus:border-log-mint focus:ring-2 focus:ring-log-mint/20"
                      />
                      <span className="absolute bottom-2 right-3 text-[11px] font-bold text-ink-gray">
                        {sheet.contextBody.length}/{CONTEXT_BODY_MAX_LENGTH}
                      </span>
                    </div>

                    {activeTab === 'image' && selectedSuggestion && (
                      <div>
                        <div className="mb-2 text-[11px] font-bold tracking-[0.12em] text-log-mint">
                          대화 내용 근거
                        </div>
                        <div className="rounded-[10px] border border-pin-navy/10 bg-white/75 p-3 text-xs leading-6 text-ink-gray">
                          {selectedSuggestion.evidence.length > 0
                            ? selectedSuggestion.evidence.join('\n')
                            : '대화 근거가 없습니다.'}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold tracking-[0.12em] text-log-mint">
                        추가할 컬렉션 · 선택 사항
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsNewCollectionModalOpen(true)}
                        className="rounded-full bg-log-mint/15 px-3 py-1.5 text-[11px] font-bold text-pin-navy"
                      >
                        + 컬렉션 생성
                      </button>
                    </div>

                    {sheet.stagedCollectionTitles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {sheet.stagedCollectionTitles.map((title, index) => (
                          <span
                            key={`${title}-${index}`}
                            className="flex items-center gap-1.5 rounded-full border border-dashed border-log-mint px-3 py-1.5 text-xs font-bold text-log-mint"
                          >
                            {title}
                            <button
                              type="button"
                              onClick={() => sheet.unstageCollectionTitle(index)}
                              aria-label={`${title} 컬렉션 생성 취소`}
                              className="text-log-mint/70 hover:text-log-mint"
                            >
                              x
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {previewMode && (
                      <p className="text-xs text-ink-gray">
                        미리보기에서는 컬렉션 목록 API를 호출하지 않아요.
                      </p>
                    )}
                    {!previewMode && myCollectionsQuery.isPending && (
                      <p className="text-xs text-ink-gray">컬렉션을 불러오는 중...</p>
                    )}
                    {!previewMode && myCollectionsQuery.isError && (
                      <p className="text-xs text-red-600">컬렉션을 불러오지 못했어요.</p>
                    )}
                    {!previewMode && myCollectionsQuery.isSuccess && myCollections.length === 0 && (
                      <p className="text-xs text-ink-gray">아직 만든 컬렉션이 없어요.</p>
                    )}
                    {myCollections.length > 0 && (
                      <div className="flex flex-wrap gap-2">
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
                                isSelected
                                  ? 'rounded-full border border-log-mint bg-log-mint/10 px-3 py-1.5 text-xs font-bold text-log-mint'
                                  : 'rounded-full border border-pin-navy/15 bg-white px-3 py-1.5 text-xs font-bold text-pin-navy'
                              }
                            >
                              {collection.title}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {createMutation.isError && (
                      <p className="text-xs text-red-600">{createMutation.error.message}</p>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        void handleSave();
                      }}
                      disabled={!canSave}
                      className="mt-auto h-[52px] flex-none rounded-[10px] bg-log-mint text-[15px] font-bold text-pin-navy disabled:opacity-40"
                    >
                      {isSaving ? '저장 중...' : '저장'}
                    </button>
                  </section>
                )}
              </main>
            </>
          )}
        </section>
      </div>

      <NewCollectionModal
        isOpen={isNewCollectionModalOpen}
        mode="fromNewRecord"
        onClose={() => setIsNewCollectionModalOpen(false)}
        onTitleStaged={(title) => sheet.stageCollectionTitle(title)}
      />
    </>
  );
}

import { useEffect, useState } from 'react';
import { PlaceRecordSheetProvider } from '@/contexts/PlaceRecordSheetProvider';
import { usePlaceRecordSheet } from '@/contexts/usePlaceRecordSheet';
import { PlaceRecordSheet } from '@/features/records/components/PlaceRecordSheet';

function PlaceRecordPreviewContent() {
  const sheet = usePlaceRecordSheet();
  const [previewMode, setPreviewMode] = useState(true);
  const [sessionStatus, setSessionStatus] = useState('테스트 세션이 아직 없습니다.');
  const [isIssuingSession, setIsIssuingSession] = useState(false);

  useEffect(() => {
    sheet.open();
  }, [sheet]);

  const openPreview = () => {
    setPreviewMode(true);
    sheet.open();
  };

  const openRealApiMode = () => {
    setPreviewMode(false);
    sheet.open();
  };

  const issueDevSession = async () => {
    setIsIssuingSession(true);
    setSessionStatus('테스트 세션 발급 중...');
    try {
      const response = await fetch('/api/core/v1/dev/auth/login', {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const body = (await response.json()) as { data?: { memberId?: number }; memberId?: number };
      const memberId = body.data?.memberId ?? body.memberId;
      setSessionStatus(
        memberId ? `테스트 세션 발급 완료 (member #${memberId})` : '테스트 세션 발급 완료',
      );
      setPreviewMode(false);
      sheet.open();
    } catch (error) {
      setSessionStatus(
        error instanceof Error
          ? `테스트 세션 발급 실패: ${error.message}`
          : '테스트 세션 발급 실패',
      );
    } finally {
      setIsIssuingSession(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper-white p-6">
      <div className="max-w-md text-center">
        <p className="text-[11px] font-bold tracking-[0.12em] text-log-mint">DEV PREVIEW</p>
        <h1 className="mt-2 text-2xl font-bold text-pin-navy">장소 추가 팝업 미리보기</h1>
        <p className="mt-3 text-sm leading-7 text-ink-gray">
          UI만 볼 때는 미리보기 데이터를 쓰고, 이미지 분석 API까지 확인할 때는 테스트 세션을 발급한
          뒤 실제 API 모드로 열어 주세요.
        </p>
        <p className="mt-3 text-xs font-semibold text-ink-gray">{sessionStatus}</p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={issueDevSession}
            disabled={isIssuingSession}
            className="h-11 rounded-[10px] bg-pin-navy px-5 text-sm font-bold text-paper-white disabled:opacity-50"
          >
            {isIssuingSession ? '발급 중...' : '테스트 세션 발급'}
          </button>
          <button
            type="button"
            onClick={openRealApiMode}
            className="h-11 rounded-[10px] bg-log-mint px-5 text-sm font-bold text-pin-navy"
          >
            실제 API 모드
          </button>
          <button
            type="button"
            onClick={openPreview}
            className="h-11 rounded-[10px] border border-line-card bg-white px-5 text-sm font-bold text-pin-navy"
          >
            UI 미리보기
          </button>
        </div>
      </div>

      <PlaceRecordSheet previewMode={previewMode} />
    </main>
  );
}

export function PlaceRecordPreviewPage() {
  return (
    <PlaceRecordSheetProvider>
      <PlaceRecordPreviewContent />
    </PlaceRecordSheetProvider>
  );
}

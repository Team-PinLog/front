import { Link } from '@tanstack/react-router';
import { ErrorState } from '@/shared/ui/ErrorState';
import { useWithdrawConfirm } from '@/contexts/useWithdrawConfirm';
import { useLogoutMutation } from '@/features/auth/hooks/useLogoutMutation';
import { useMeSummaryQuery } from '@/features/me/hooks/useMeSummaryQuery';

// 08_API_명세 3.5의 provider는 KAKAO/GOOGLE/NAVER 중 하나다. 알 수 없는 값은 원본 그대로 보여준다
// (서버가 값을 늘려도 화면이 깨지지 않게).
// 372: 한글 표기('카카오'·'구글'·'네이버')에서 각 사의 공식 영문 표기로 바꿨다.
const PROVIDER_LABELS: Record<string, string> = {
  KAKAO: 'Kakao',
  GOOGLE: 'Google',
  NAVER: 'Naver',
};

/**
 * AppLayout 설정 패널 내용. 목업 app-topnav의 설정 슬라이드 패널을 참고한다.
 * 근거: Jira S15P11A705-162, docs/reference/08_API_명세.md 3.4/3.5.
 */
export function SettingsPanel() {
  const meSummaryQuery = useMeSummaryQuery();
  const logoutMutation = useLogoutMutation();
  const withdrawConfirm = useWithdrawConfirm();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (meSummaryQuery.isPending) {
    return <p className="text-sm text-ink-gray">불러오는 중…</p>;
  }

  if (meSummaryQuery.isError) {
    return (
      <ErrorState title="계정 정보를 불러오지 못했어요" description="잠시 후 다시 시도해 주세요." />
    );
  }

  const { provider, email, recordCount, collectionCount, followerCount } = meSummaryQuery.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col overflow-hidden rounded-xl border border-pin-navy/10 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-pin-navy/[0.08] px-4 py-3.5">
          <span className="text-xs text-ink-gray">로그인 수단</span>
          <span className="text-sm font-semibold text-pin-navy">
            {PROVIDER_LABELS[provider] ?? provider}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <span className="text-xs text-ink-gray">이메일</span>
          <span className="text-sm font-semibold text-pin-navy">{email}</span>
        </div>
      </div>

      <div className="flex gap-2.5">
        <div className="flex-1 rounded-xl border border-pin-navy/10 bg-white p-3.5 text-center">
          <p className="text-lg font-bold text-pin-navy">{recordCount}</p>
          <p className="mt-0.5 text-[11px] text-ink-gray">저장한 장소</p>
        </div>
        <div className="flex-1 rounded-xl border border-pin-navy/10 bg-white p-3.5 text-center">
          <p className="text-lg font-bold text-pin-navy">{collectionCount}</p>
          <p className="mt-0.5 text-[11px] text-ink-gray">컬렉션</p>
        </div>
        <div className="flex-1 rounded-xl border border-pin-navy/10 bg-white p-3.5 text-center">
          <p className="text-lg font-bold text-pin-navy">{followerCount}</p>
          <p className="mt-0.5 text-[11px] text-ink-gray">팔로워</p>
        </div>
      </div>

      {/* S15P11A705-424: "나의 활동 기록"(/me/activity) 진입점을 책장 지면(LibrarySpreadPanels의
          .pe-headrule)에서 여기로 옮겼다 — 책장 콘텐츠가 아니라 계정 메뉴에 속하는 항목이라는
          판단이다. 아래 로그아웃 버튼과 같은 행 스타일(테두리·rounded-xl·px-3 py-3)을 그대로
          재사용해 새로 그리지 않았고, 이 항목만 이동을 뜻하므로 색을 text-pin-navy로 구분한다.
          원래 노출 조건(기록 0건이면 숨김, docs 이슈 #55)도 그대로 옮긴다 — 이 패널이 이미
          recordCount를 들고 있어 조건을 다시 계산할 필요가 없다. */}
      {recordCount > 0 && (
        <Link
          to="/me/activity"
          className="rounded-xl border border-pin-navy/[0.18] px-3 py-3 text-sm font-semibold text-pin-navy"
        >
          나의 활동 기록
        </Link>
      )}

      <button
        type="button"
        onClick={handleLogout}
        disabled={logoutMutation.isPending}
        className="rounded-xl border border-pin-navy/[0.18] px-3 py-3 text-sm font-semibold text-ink-gray disabled:opacity-40"
      >
        {logoutMutation.isPending ? '로그아웃 중…' : '로그아웃'}
      </button>

      <button
        type="button"
        onClick={withdrawConfirm.open}
        className="self-start text-xs font-semibold text-ink-gray-light underline underline-offset-4"
      >
        탈퇴하기
      </button>
    </div>
  );
}

/**
 * 포스트잇 공통 장식 — 위 가장자리에 걸친 마스킹 테이프와 오른쪽 아래 접힌 모서리.
 *
 * 조형과 값은 paperAperture.css의 `.pl-note-tape` / `.pl-note-dogear`가 갖는다. 이 파일은
 * "메모지에는 이 두 조각이 붙는다"는 사실만 한 곳에 둔다 — 411에서 종이 메모지가 홈·탐색·
 * 책장 세 화면에 서면서, 같은 두 줄이 세 파일에 복제될 참이었다.
 *
 * 전부 aria-hidden이다. 읽어 줄 내용이 없는 순수 장식이고, 메모지의 뜻은 그 안의 글이 말한다.
 */
export function PaperNoteParts() {
  return (
    <>
      <span className="pl-note-tape" aria-hidden="true" />
      <span className="pl-note-dogear" aria-hidden="true" />
    </>
  );
}

interface PaperNoteTallyProps {
  /** 왼쪽에 적히는 이름. */
  label: string;
  /** 점선 리더 오른쪽 끝에 적히는 값. 없을 때의 문구까지 호출부가 정한다. */
  value: string;
}

/**
 * 메모지 안의 한 줄 — 이름 · 점선 리더 · 값.
 *
 * 조판은 홈 메모지의 목록 줄(.pl-note-row / .pl-note-dots / .pl-note-no)에서 그대로 가져왔다.
 * 그쪽은 누르면 기록이 열리는 **버튼**이고 이쪽은 읽기만 하는 줄이라, 같은 클래스를 쓰지 않고
 * 점선과 숫자 조판만 공유한다 — 눌러도 아무 일이 없는 것을 버튼처럼 그리면 거짓말이 된다.
 */
export function PaperNoteTally({ label, value }: PaperNoteTallyProps) {
  return (
    <p className="pe-note-tally">
      <span>{label}</span>
      <span className="pl-note-dots" aria-hidden="true" />
      <span className="pl-note-no">{value}</span>
    </p>
  );
}

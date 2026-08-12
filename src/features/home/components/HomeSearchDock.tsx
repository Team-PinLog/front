import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { preload } from 'react-dom';
import { SEARCH_PLACEHOLDERS } from '../lib/paperAperture';

const CONTEXT_FONT_URL = '/fonts/nanum-geumeunbohwa.woff2';

/**
 * 검색창 포커스는 Context 결과를 곧 볼 가능성이 높다는 사용자 의도다. 첫 화면에서는 469KB를
 * 받지 않고, 입력을 시작할 때 검색 API와 경쟁하지 않도록 낮은 우선순위로 준비한다.
 * 같은 href의 실제 @font-face 요청은 브라우저 캐시를 재사용한다.
 */
function preloadContextFont() {
  preload(CONTEXT_FONT_URL, {
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous',
    fetchPriority: 'low',
  });
}

interface HomeSearchDockProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (query: string) => void;
  isPending: boolean;
  /** 창이 열린 뒤 검색바 아래에 뜨는 안내. 없으면 자리도 차지하지 않는다. */
  status?: string | null;
}

export interface HomeSearchDockHandle {
  focus: () => void;
}

/** 순환 타이핑 속도(ms). 시안 값 그대로 — 치는 속도는 빠르고 지우는 속도는 더 빠르다. */
const TYPE_MS = 78;
const ERASE_MS = 34;
const HOLD_MS = 1500;
const NEXT_MS = 260;

/**
 * 검색 도크. 창 한가운데 있다가 열리면 위로 올라간다(위치·이동은 paperAperture.css).
 *
 * placeholder를 input 속성이 아니라 별도 레이어(.pl-ghost)로 그린다 — 순환 타이핑에
 * 깜빡이는 캐럿을 붙여야 하는데 ::placeholder에는 자식을 넣을 수 없다. 대신 실제
 * placeholder 속성은 투명 처리하고, 스크린리더용 라벨은 <label class="sr">가 맡는다.
 *
 * 근거: 디자인 시안 home-paper-aperture.html.
 */
export const HomeSearchDock = forwardRef<HomeSearchDockHandle, HomeSearchDockProps>(
  function HomeSearchDock({ query, onQueryChange, onSubmit, isPending, status }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const ghost = useCyclingPlaceholder(query.length === 0);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
      }),
      [],
    );

    const handleSubmit = (event: FormEvent) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) {
        return;
      }
      onSubmit(trimmed);
    };

    return (
      <div className="pl-dock">
        <form className="pl-field" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="home-search">
            저장한 장소 검색
          </label>
          <input
            ref={inputRef}
            id="home-search"
            type="text"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onFocus={preloadContextFont}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {/* 사용자가 한 글자라도 치면 사라진다. aria-hidden이라 스크린리더는 라벨만 읽는다. */}
          {ghost !== null && (
            <span className="pl-ghost" aria-hidden="true">
              {ghost}
              <i />
            </span>
          )}
          <button type="submit" disabled={!query.trim() || isPending}>
            {isPending ? '찾는 중' : '찾기'}
          </button>
        </form>

        <p className="pl-status" aria-live="polite">
          {status ?? ''}
        </p>
      </div>
    );
  },
);

/**
 * idle일 때만 도는 순환 placeholder. 사람이 한 글자라도 치면 그 프레임에 멈추고,
 * 다 지우면 다시 돈다. prefers-reduced-motion이면 첫 문장을 고정해 보여준다.
 *
 * 반환값이 null이면 아예 그리지 않는다(입력 중).
 */
function useCyclingPlaceholder(active: boolean): string | null {
  const [text, setText] = useState('');
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    if (reduceRef.current) {
      setText(SEARCH_PLACEHOLDERS[0]);
      return;
    }

    let phraseIndex = 0;
    let cursor = 0;
    let erasing = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = SEARCH_PLACEHOLDERS[phraseIndex];
      cursor += erasing ? -1 : 1;
      setText(phrase.slice(0, cursor));

      let delay = erasing ? ERASE_MS : TYPE_MS;
      if (!erasing && cursor === phrase.length) {
        erasing = true;
        delay = HOLD_MS;
      } else if (erasing && cursor === 0) {
        erasing = false;
        phraseIndex = (phraseIndex + 1) % SEARCH_PLACEHOLDERS.length;
        delay = NEXT_MS;
      }
      timer = setTimeout(tick, delay);
    };

    tick();
    return () => clearTimeout(timer);
  }, [active]);

  return active ? text : null;
}

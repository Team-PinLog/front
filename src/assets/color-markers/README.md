# Book Spine Marker SVG Set

20 book-spine map markers, one solid color each. Every SVG is 64 x 76 px with a transparent background.

원래는 물방울 핀이었다. S15P11A705에서 책등 모양으로 바꿨다 — 지도에 찍히는 핀 하나가
책장(`shared/ui/Shelf.tsx` `ShelfBookSpine`)에 꽂힌 책 한 권과 같은 물건으로 읽히게 하려는 것이다.
좌측 세로 하이라이트와 위·아래 괘선은 그 컴포넌트의 `before`/`after` 장식을 그대로 옮겼고,
오른쪽 크림색 면(`#FBF6EF`)은 책배(페이지 단면)다.

**바꿀 때 반드시 지킬 것** — 아래가 어긋나면 마커가 실제 좌표에서 어긋나게 찍힌다.

- `viewBox`는 `0 0 64 76`, 파일 크기는 64 x 76.
- **핀 끝점은 `y = 68.32`.** `shared/lib/getRecordMarkerAsset.ts`의 `RECORD_MARKER_TIP_Y_RATIO`가
  이 값을 그대로 쓰고, `RecordMapView`·`CollectionSpreadMap`이 CustomOverlay `yAnchor`로 넘긴다.
- `filter id="shadow"`를 유지한다. 20개가 같은 id를 쓰지만 전부 `<img src>`로 불러 각각 독립
  문서로 렌더되므로 충돌하지 않는다(인라인 `<svg>`로 바꾸면 id가 충돌해 그림자가 하나로 합쳐진다).
- 색은 아래 표가 기준이다. `getRecordMarkerAsset.ts`의 `MARKER_COLORS`가 같은 순서로 이 값을
  들고 있으므로 **함께 고친다** — 범례 색 견본이 그 배열에서 나온다.

1.  `marker-01-navy.svg` - #083A67
2.  `marker-02-coral.svg` - #F05A3D
3.  `marker-03-violet.svg` - #7257B5
4.  `marker-04-denim.svg` - #2E5D8C
5.  `marker-05-deep-teal.svg` - #1B4C6B
6.  `marker-06-mint.svg` - #2CB8A6
7.  `marker-07-brown.svg` - #A0784A
8.  `marker-08-rose.svg` - #D64F78
9.  `marker-09-gold.svg` - #E2A01F
10. `marker-10-plum.svg` - #6A3F77
11. `marker-11-blue.svg` - #356D9B
12. `marker-12-pink.svg` - #E05286
13. `marker-13-orange.svg` - #E47C2B
14. `marker-14-green.svg` - #498A69
15. `marker-15-cyan.svg` - #279FC4
16. `marker-16-amber.svg` - #E8A51E
17. `marker-17-purple.svg` - #8756A6
18. `marker-18-teal.svg` - #237E88
19. `marker-19-red.svg` - #D84852
20. `marker-20-slate.svg` - #3D6280

# Contributing to micro-charts

> **Performance First** - uPlot 철학 기반 개발 규칙

## 핵심 개발 원칙 (필수 준수)

이 프로젝트는 **성능이 최우선**입니다. 모든 코드 변경은 아래 7가지 규칙을 반드시 준수해야 합니다.

---

### 규칙 1: 번들 크기 최소화

**불필요한 코드 제거**

```typescript
// ❌ BAD: 사용하지 않는 import
import { helper1, helper2, helper3 } from './utils';
const result = helper1();

// ✅ GOOD: 필요한 것만 import
import { helper1 } from './utils';
const result = helper1();
```

```typescript
// ❌ BAD: 불필요한 추상화
class AbstractChartFactory {
  abstract createChart(): Chart;
}

// ✅ GOOD: 직접적인 구현
function createChart(type: string): Chart { ... }
```

**체크리스트:**
- [ ] Tree-shaking이 가능한 구조인가?
- [ ] 사용하지 않는 export가 있는가?
- [ ] 인라인 가능한 작은 함수가 있는가?
- [ ] 타입만 필요한 곳에서 `import type`을 사용했는가?

---

### 규칙 2: 메모리 누수 방지

**이벤트 리스너, 애니메이션 정리**

```typescript
// ❌ BAD: 정리 없는 이벤트 리스너
constructor() {
  window.addEventListener('resize', this.onResize);
}

// ✅ GOOD: destroy에서 정리
private boundOnResize = this.onResize.bind(this);

constructor() {
  window.addEventListener('resize', this.boundOnResize);
}

destroy(): void {
  window.removeEventListener('resize', this.boundOnResize);
}
```

```typescript
// ❌ BAD: 애니메이션 미정리
setData(value: number): void {
  this.animationId = animate(...);  // 이전 애니메이션 미취소
}

// ✅ GOOD: 이전 애니메이션 취소
setData(value: number): void {
  this.animationController?.cancel();  // 이전 애니메이션 취소
  this.animationController = animate(...);
}
```

**체크리스트:**
- [ ] 모든 addEventListener에 대응하는 removeEventListener가 있는가?
- [ ] 애니메이션은 새 애니메이션 시작 전 취소되는가?
- [ ] destroy() 메서드에서 모든 리소스가 정리되는가?
- [ ] setInterval/setTimeout에 대응하는 clear가 있는가?

---

### 규칙 3: 하드웨어 자원 최소화

**불필요한 DOM 조작 제거**

```typescript
// ❌ BAD: 매 프레임 DOM 조작
render(value: number): void {
  this.canvas.setAttribute('aria-valuenow', String(value));  // 매번 DOM 조작
}

// ✅ GOOD: 필요할 때만 DOM 조작
setData(value: number): void {
  // DOM 조작은 데이터 변경 시 한번만
  if (this.options.accessibility) {
    this.canvas.setAttribute('aria-valuenow', String(value));
  }
  this.render(value);
}
```

**체크리스트:**
- [ ] render() 내에서 DOM 조작이 없는가?
- [ ] DOM 조작이 필요한 경우 배치 처리되는가?

---

### 규칙 4: 속도 최적화 - 계산값 캐싱

**렌더링 효율성**

```typescript
// ❌ BAD: 불필요한 계산 반복
render(): void {
  const cx = this.size / 2;        // 매번 계산
  const cy = this.size / 2;        // 중복 계산
  const radius = this.size / 2 - 10;  // size 불변인데 매번 계산
}

// ✅ GOOD: 계산값 캐싱
private _cx: number = 0;
private _cy: number = 0;
private _radius: number = 0;

private updateGeometry(): void {  // size 변경 시에만 호출
  this._cx = this.options.size / 2;
  this._cy = this._cx;
  this._radius = this._cx - 10;
}

render(): void {
  // 캐시된 값 사용
  ctx.arc(this._cx, this._cy, this._radius, ...);
}
```

```typescript
// ❌ BAD: 래퍼 함수를 통한 간접 호출
this.renderer.setFillStyle(color);
this.renderer.beginPath();
this.renderer.arc(...);

// ✅ GOOD: 핫 패스에서 직접 접근
const ctx = this.renderer.ctx;
ctx.fillStyle = color;
ctx.beginPath();
ctx.arc(...);
```

**체크리스트:**
- [ ] 렌더 루프에서 불변값 계산이 캐시되어 있는가?
- [ ] 핫 패스(렌더 루프)에서 불필요한 함수 호출이 없는가?
- [ ] `const ctx = this.renderer.ctx`로 참조를 캐시하는가?

---

### 규칙 5: 객체 풀링 (uPlot 기법) ⭐

**상수 객체 재사용으로 GC 압력 제거**

```typescript
// ❌ BAD: 매번 새 빈 객체/배열 생성
function getDefaults() {
  return {};  // 호출마다 새 객체
}

function getEmptyList() {
  return [];  // 호출마다 새 배열
}

// ✅ GOOD: 모듈 레벨 상수 풀링
const EMPTY_OBJ = Object.freeze({});
const EMPTY_ARR = Object.freeze([]);
const NULL_TUPLE: [null, null] = [null, null];

function getDefaults() {
  return EMPTY_OBJ;  // 동일 참조 반환
}
```

```typescript
// ❌ BAD: 렌더 루프에서 임시 객체 생성
render(): void {
  const point = { x: cx, y: cy };  // 매 프레임 힙 할당
  const bounds = { min: 0, max: 100 };
}

// ✅ GOOD: 재사용 가능한 객체 풀
private readonly _point = { x: 0, y: 0 };
private readonly _bounds = { min: 0, max: 0 };

render(): void {
  this._point.x = cx;
  this._point.y = cy;
  // 새 할당 없음, GC 트리거 없음
}
```

**상수 풀 정의 위치:** `src/core/constants.ts`

```typescript
// src/core/constants.ts
export const EMPTY_OBJ = Object.freeze({});
export const EMPTY_ARR: readonly never[] = Object.freeze([]);
export const NULL_NULL: [null, null] = [null, null];
```

**체크리스트:**
- [ ] 빈 객체 `{}` 대신 `EMPTY_OBJ` 사용하는가?
- [ ] 빈 배열 `[]` 대신 `EMPTY_ARR` 사용하는가?
- [ ] 렌더 루프 내 임시 객체는 멤버 변수로 풀링되어 있는가?
- [ ] `Object.freeze()`로 실수로 수정되는 것을 방지했는가?

---

### 규칙 6: Canvas 스타일 캐싱 (uPlot 기법) ⭐

**ctx 상태 변경 최소화**

```typescript
// ❌ BAD: 매번 스타일 설정 (불필요한 브라우저 내부 처리)
render(): void {
  ctx.fillStyle = '#ff0000';  // 이미 같은 값이어도 설정
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = '#ff0000';  // 중복 설정
  ctx.fillRect(100, 0, 100, 100);
}

// ✅ GOOD: 현재 상태 추적, 변경 시에만 설정
private _ctxFill: string | null = null;
private _ctxStroke: string | null = null;
private _ctxLineWidth: number = 0;

private setFill(fill: string): void {
  if (fill !== this._ctxFill) {
    this.ctx.fillStyle = this._ctxFill = fill;
  }
}

private setStroke(stroke: string): void {
  if (stroke !== this._ctxStroke) {
    this.ctx.strokeStyle = this._ctxStroke = stroke;
  }
}

private setLineWidth(width: number): void {
  if (width !== this._ctxLineWidth) {
    this.ctx.lineWidth = this._ctxLineWidth = width;
  }
}

render(): void {
  this.setFill('#ff0000');     // 첫 호출: 설정
  ctx.fillRect(0, 0, 100, 100);
  this.setFill('#ff0000');     // 두번째 호출: 스킵 (동일값)
  ctx.fillRect(100, 0, 100, 100);
}
```

**초기화 시점:** resize() 또는 clear()에서 캐시 리셋

```typescript
clear(): void {
  this.ctx.clearRect(0, 0, this._width, this._height);
  // 스타일 캐시 리셋 (브라우저가 리셋할 수 있으므로)
  this._ctxFill = null;
  this._ctxStroke = null;
  this._ctxLineWidth = 0;
}
```

**체크리스트:**
- [ ] fillStyle 설정 전 현재 값과 비교하는가?
- [ ] strokeStyle 설정 전 현재 값과 비교하는가?
- [ ] lineWidth 설정 전 현재 값과 비교하는가?
- [ ] clear()/resize() 후 캐시가 리셋되는가?

---

### 규칙 7: 배치 렌더링 (uPlot 기법) ⭐

**queueMicrotask로 다중 업데이트 병합**

```typescript
// ❌ BAD: 즉시 렌더링 (연속 호출 시 낭비)
setData(value: number): void {
  this.value = value;
  this.render();  // 즉시 렌더
}

// 사용 예: 3번 연속 호출 = 3번 렌더링
chart.setData(10);
chart.setData(20);
chart.setData(30);  // 3번 모두 렌더링됨 (낭비)

// ✅ GOOD: 배치 렌더링 (같은 틱에서 1번만 렌더)
private _pending = false;

private scheduleRender(): void {
  if (!this._pending) {
    this._pending = true;
    queueMicrotask(() => {
      this._pending = false;
      this.render();
    });
  }
}

setData(value: number): void {
  this.value = value;
  this.scheduleRender();  // 예약만
}

// 사용 예: 3번 연속 호출 = 1번 렌더링
chart.setData(10);
chart.setData(20);
chart.setData(30);  // 마지막 값으로 1번만 렌더링됨
```

**애니메이션과의 조합:**

```typescript
setData(value: number): void {
  this.animationController?.cancel();

  if (this.options.animate) {
    // 애니메이션: RAF가 렌더 타이밍 관리
    this.animationController = animate(...);
  } else {
    // 즉시 적용: 배치 렌더링
    this.value = value;
    this.scheduleRender();
  }
}
```

**체크리스트:**
- [ ] 동기적 다중 업데이트가 병합되는가?
- [ ] `queueMicrotask` 또는 `requestAnimationFrame`을 사용하는가?
- [ ] 애니메이션 중에는 배치 로직이 비활성화되는가?

---

## 코드 리뷰 템플릿

PR 제출 시 아래 항목을 확인해주세요:

```markdown
### Performance Checklist

**기본 규칙:**
- [ ] 번들 크기: 불필요한 코드 없음
- [ ] 메모리: 모든 리스너/애니메이션 정리됨
- [ ] DOM: render() 내 DOM 조작 없음
- [ ] 속도: 캐시 가능한 값 캐시됨

**uPlot 고급 규칙:**
- [ ] 객체 풀링: EMPTY_OBJ/EMPTY_ARR 사용
- [ ] 스타일 캐싱: ctx 상태 변경 전 비교
- [ ] 배치 렌더링: 다중 업데이트 병합

### Bundle Impact

- Before: XX KB
- After: XX KB
- Delta: ±XX KB
```

---

## 성능 측정

```bash
# 번들 크기 확인
npm run build
ls -la dist/

# 성능 프로파일링 (브라우저)
# 1. Chrome DevTools > Performance 탭
# 2. 60fps에서 CPU 사용률 확인
# 3. Memory 탭에서 GC 빈도 확인
```

---

## 금지 사항

1. **렌더 루프에서 객체/배열 생성 금지**
2. **불필요한 추상화 레이어 금지**
3. **외부 런타임 의존성 추가 금지**
4. **성능 측정 없이 "최적화" 금지**
5. **ctx 스타일 무조건 설정 금지** (비교 후 설정)
6. **동기 다중 렌더링 금지** (배치 처리)

---

## 참고 자료

- [uPlot GitHub](https://github.com/leeoniya/uPlot) - 본 프로젝트의 철학적 기반
- [변수명 및 내부 컨벤션](./docs/dev.md) - 약식 변수명 가이드

---

_"Premature optimization is the root of all evil" - 하지만 우리 프로젝트에서 성능은 기능입니다._

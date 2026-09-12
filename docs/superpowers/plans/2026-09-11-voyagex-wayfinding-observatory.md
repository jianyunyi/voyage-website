# VoyageX Wayfinding Observatory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn VoyageX route planning into an immersive, accessible Wayfinding Observatory experience with pre-rendered Remotion scenery and consistent action-specific loading feedback across the app.

**Architecture:** Keep the AMap instance and all route calculation as the source of truth. Add small pure modules for scene selection and action loading semantics, then consume them from shared React components. Remotion produces quiet MP4/WebM ambient scenes at build time; the app renders those assets behind normal semantic UI, using static posters whenever motion is reduced or a video cannot play.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion, Lucide React, AMap JS API, Remotion CLI, Node `node:test` executed by `tsx`.

---

## File Structure

- Create: `src/lib/experience/actionState.ts` — pure action-to-icon and accessible-label state resolver.
- Create: `src/lib/experience/actionState.test.ts` — Node tests for loading-state resolution.
- Create: `src/lib/experience/sceneCatalog.ts` — pure route-to-scene configuration and reduced-motion fallback metadata.
- Create: `src/lib/experience/sceneCatalog.test.ts` — Node tests for page scene selection and asset fallback.
- Create: `src/components/ActionButton.tsx` — dimension-stable button with action-specific animated loading icon.
- Create: `src/components/ImmersiveBackdrop.tsx` — semantic, non-interactive ambient video/poster layer.
- Create: `src/remotion/index.ts`, `src/remotion/Root.tsx`, `src/remotion/RouteTerrain.tsx`, `remotion.config.ts` — Remotion entry, composition, and render configuration.
- Create: `public/motion/route-terrain-poster.png`, `public/motion/route-terrain.mp4`, `public/motion/home-current.mp4`, `public/motion/guides-contours.mp4`, `public/motion/compare-contours.mp4`, `public/motion/profile-archive.mp4` — generated, versioned visual assets with poster fallback for the planner.
- Modify: `package.json` — add test and motion render scripts; add Remotion dependencies.
- Modify: `tsconfig.json` — restrict the Vite application's type-checking scope to its own source tree.
- Modify: `.env.example` — define public AMap client key variable without a real credential.
- Modify: `src/pages/MapPlanner.tsx` — replace side-panel layout with the Wayfinding Observatory layout while retaining AMap route behavior.
- Modify: `src/components/Layout.tsx`, `src/pages/Home.tsx`, `src/pages/Guides.tsx`, `src/pages/Food.tsx`, `src/pages/Compare.tsx`, `src/pages/Profile.tsx`, `src/pages/Auth.tsx`, `src/components/SubmissionModal.tsx` — use the shared ambient scene and/or action button where the page performs an async action.
- Modify: `src/index.css` — define named VoyageX color tokens, responsive terrain surfaces, focus states, and reduced-motion styles.

### Task 1: Establish the Test and Render Commands

**Files:**
- Modify: `package.json`
- Modify: `tsconfig.json`
- Test: `src/lib/idempotentFetch.test.ts`

- [ ] **Step 1: Add the test command before new UI tests exist**

```json
{
  "scripts": {
    "test": "tsx --test src/**/*.test.ts",
    "render:motion": "remotion render src/remotion/index.ts RouteTerrain public/motion/route-terrain.mp4 --codec=h264 --frames=0-299"
  }
}
```

- [ ] **Step 2: Verify the existing idempotency test executes through the new command**

Run: `npm test -- src/lib/idempotentFetch.test.ts`

Expected: Both concurrent-request tests pass and report `# pass 2`.

- [ ] **Step 3: Add the rendering dependencies**

Run: `npm install remotion @remotion/cli -D @types/react @types/react-dom`

Expected: `package.json` and the lockfile contain compatible Remotion packages and React type declarations; no existing dependency is removed.

- [ ] **Step 4: Restrict root type checking to the Vite application**

```json
{
  "include": ["src", "vite.config.ts"],
  "exclude": ["frontend", "backend", "node_modules", "dist"]
}
```

This leaves `frontend/` responsible for its own `frontend/tsconfig.json` and dependencies; the root Vite check must not traverse that separate Next application.

- [ ] **Step 5: Verify type checking remains green**

Run: `npm run lint`

Expected: Exit code `0`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "chore: add motion render and test commands"
```

### Task 2: Create Testable Action Loading Semantics

**Files:**
- Create: `src/lib/experience/actionState.ts`
- Create: `src/lib/experience/actionState.test.ts`
- Create: `src/components/ActionButton.tsx`

- [ ] **Step 1: Write the failing resolver tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getActionState } from './actionState';

test('route planning progresses from pin to route while pending', () => {
  assert.deepEqual(getActionState('plan-route', true), {
    label: '正在规划路线',
    icon: 'route',
    liveMessage: '正在规划路线，请稍候',
  });
});

test('publishing preserves its command label when idle', () => {
  assert.deepEqual(getActionState('publish-guide', false), {
    label: '发布攻略',
    icon: 'file-up',
    liveMessage: '',
  });
});
```

- [ ] **Step 2: Verify the tests fail because the module is absent**

Run: `npm test -- src/lib/experience/actionState.test.ts`

Expected: FAIL with `Cannot find module './actionState'`.

- [ ] **Step 3: Implement the minimal resolver**

```ts
export type ActionName = 'plan-route' | 'publish-guide' | 'submit-review' | 'search-price' | 'upload-avatar' | 'sign-in';

export interface ActionState {
  label: string;
  icon: 'route' | 'file-up' | 'shield-check' | 'search' | 'upload' | 'log-in';
  liveMessage: string;
}

const actions: Record<ActionName, { idle: ActionState; pending: ActionState }> = {
  'plan-route': {
    idle: { label: '规划路线', icon: 'route', liveMessage: '' },
    pending: { label: '正在规划路线', icon: 'route', liveMessage: '正在规划路线，请稍候' },
  },
  'publish-guide': {
    idle: { label: '发布攻略', icon: 'file-up', liveMessage: '' },
    pending: { label: '正在提交审核', icon: 'shield-check', liveMessage: '攻略正在提交审核' },
  },
  'submit-review': {
    idle: { label: '提交审核决定', icon: 'shield-check', liveMessage: '' },
    pending: { label: '正在保存审核决定', icon: 'shield-check', liveMessage: '审核决定正在保存' },
  },
  'search-price': {
    idle: { label: '搜索', icon: 'search', liveMessage: '' },
    pending: { label: '正在比价', icon: 'search', liveMessage: '正在查询价格' },
  },
  'upload-avatar': {
    idle: { label: '上传头像', icon: 'upload', liveMessage: '' },
    pending: { label: '正在上传头像', icon: 'upload', liveMessage: '头像正在上传' },
  },
  'sign-in': {
    idle: { label: '登录', icon: 'log-in', liveMessage: '' },
    pending: { label: '正在验证', icon: 'log-in', liveMessage: '正在验证登录信息' },
  },
};

export function getActionState(action: ActionName, pending: boolean): ActionState {
  return actions[action][pending ? 'pending' : 'idle'];
}
```

- [ ] **Step 4: Implement the stable button component**

```tsx
export function ActionButton({ action, pending, children, ...props }: ActionButtonProps) {
  const state = getActionState(action, pending);
  const Icon = iconByName[state.icon];
  return (
    <button {...props} disabled={pending || props.disabled} aria-busy={pending} className={cn('voyage-action-button', props.className)}>
      <Icon aria-hidden="true" className={cn('size-4', pending && 'voyage-action-button__icon--pending')} />
      <span>{children ?? state.label}</span>
      <span className="sr-only" aria-live="polite">{state.liveMessage}</span>
    </button>
  );
}
```

- [ ] **Step 5: Verify the resolver tests pass and type checking succeeds**

Run: `npm test -- src/lib/experience/actionState.test.ts && npm run lint`

Expected: The two action-state tests pass and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/experience/actionState.ts src/lib/experience/actionState.test.ts src/components/ActionButton.tsx
git commit -m "feat: add semantic action loading button"
```

### Task 3: Define Scene Metadata and Render the Route Terrain

**Files:**
- Create: `src/lib/experience/sceneCatalog.ts`
- Create: `src/lib/experience/sceneCatalog.test.ts`
- Create: `src/remotion/index.ts`
- Create: `src/remotion/Root.tsx`
- Create: `src/remotion/RouteTerrain.tsx`
- Create: `remotion.config.ts`
- Create: `public/motion/route-terrain-poster.png`
- Create: `public/motion/route-terrain.mp4`

- [ ] **Step 1: Write the failing scene-selection tests**

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { getSceneForPath } from './sceneCatalog';

test('planner selects the route terrain scene and poster fallback', () => {
  assert.deepEqual(getSceneForPath('/planner'), {
    videoSrc: '/motion/route-terrain.mp4',
    posterSrc: '/motion/route-terrain-poster.png',
    tone: 'planner',
  });
});

test('an unknown path uses the quiet home current instead of no backdrop', () => {
  assert.equal(getSceneForPath('/unknown').tone, 'home');
});
```

- [ ] **Step 2: Verify the tests fail because the catalog is absent**

Run: `npm test -- src/lib/experience/sceneCatalog.test.ts`

Expected: FAIL with `Cannot find module './sceneCatalog'`.

- [ ] **Step 3: Implement the scene catalog**

```ts
export type SceneTone = 'home' | 'guides' | 'planner' | 'compare' | 'profile';

export interface SceneDefinition {
  videoSrc: string;
  posterSrc: string;
  tone: SceneTone;
}

const scenes: Record<SceneTone, SceneDefinition> = {
  home: { videoSrc: '/motion/home-current.mp4', posterSrc: '/motion/route-terrain-poster.png', tone: 'home' },
  guides: { videoSrc: '/motion/guides-contours.mp4', posterSrc: '/motion/route-terrain-poster.png', tone: 'guides' },
  planner: { videoSrc: '/motion/route-terrain.mp4', posterSrc: '/motion/route-terrain-poster.png', tone: 'planner' },
  compare: { videoSrc: '/motion/compare-contours.mp4', posterSrc: '/motion/route-terrain-poster.png', tone: 'compare' },
  profile: { videoSrc: '/motion/profile-archive.mp4', posterSrc: '/motion/route-terrain-poster.png', tone: 'profile' },
};

export function getSceneForPath(pathname: string): SceneDefinition {
  if (pathname.startsWith('/planner')) return scenes.planner;
  if (pathname.startsWith('/guides') || pathname.startsWith('/food')) return scenes.guides;
  if (pathname.startsWith('/compare') || pathname.startsWith('/hotel')) return scenes.compare;
  if (pathname.startsWith('/profile') || pathname.startsWith('/auth')) return scenes.profile;
  return scenes.home;
}
```

- [ ] **Step 4: Implement a single Remotion composition with real route coordinates**

```tsx
export const RouteTerrain = () => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 150, 299], [0, 1, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ backgroundColor: '#12372a' }}>
      <svg viewBox="0 0 1920 1080" aria-hidden="true">
        <path d="M-80 850 C 420 490 770 860 1240 410 S 1800 360 2040 100" fill="none" stroke="#c9f06b" strokeWidth="12" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
      </svg>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Register and render the composition**

```tsx
registerRoot(RemotionRoot);

export const RemotionRoot = () => (
  <Composition id="RouteTerrain" component={RouteTerrain} durationInFrames={300} fps={30} width={1920} height={1080} />
);
```

Run: `npm run render:motion`

Expected: `public/motion/route-terrain.mp4` exists and has a 10-second, 1920x1080 video stream.

- [ ] **Step 6: Capture a matching static planner poster**

Run: `npx remotion still src/remotion/index.ts RouteTerrain public/motion/route-terrain-poster.png --frame=180`

Expected: The poster shows the visible route and remains legible without animation.

- [ ] **Step 7: Verify the scene catalog tests pass**

Run: `npm test -- src/lib/experience/sceneCatalog.test.ts && npm run lint`

Expected: The route and fallback assertions pass; TypeScript is green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/experience/sceneCatalog.ts src/lib/experience/sceneCatalog.test.ts src/remotion remotion.config.ts public/motion/route-terrain-poster.png public/motion/route-terrain.mp4
git commit -m "feat: add route terrain motion composition"
```

### Task 4: Add the Accessible Ambient Backdrop and Global Motion Tokens

**Files:**
- Create: `src/components/ImmersiveBackdrop.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write the component contract as a pure SSR test**

```ts
test('planner backdrop contains the static poster and does not expose decorative media to assistive technology', () => {
  const markup = renderToStaticMarkup(<ImmersiveBackdrop pathname="/planner" />);
  assert.match(markup, /route-terrain-poster\.png/);
  assert.match(markup, /aria-hidden="true"/);
});
```

- [ ] **Step 2: Verify the test fails because `ImmersiveBackdrop` does not exist**

Run: `npm test -- src/components/ImmersiveBackdrop.test.tsx`

Expected: FAIL with `Cannot find module './ImmersiveBackdrop'`.

- [ ] **Step 3: Implement the backdrop with an immediate poster fallback**

```tsx
export function ImmersiveBackdrop({ pathname }: { pathname: string }) {
  const scene = getSceneForPath(pathname);
  return (
    <div aria-hidden="true" className={`voyage-backdrop voyage-backdrop--${scene.tone}`}>
      <img src={scene.posterSrc} alt="" className="voyage-backdrop__poster" />
      <video className="voyage-backdrop__video" muted loop playsInline autoPlay preload="metadata" poster={scene.posterSrc}>
        <source src={scene.videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}
```

- [ ] **Step 4: Add reduced-motion and focus-safe CSS**

```css
.voyage-backdrop { inset: 0; overflow: hidden; pointer-events: none; position: absolute; z-index: 0; }
.voyage-backdrop__poster, .voyage-backdrop__video { block-size: 100%; inline-size: 100%; object-fit: cover; }
.voyage-backdrop__video { opacity: .72; }
.voyage-action-button { align-items: center; display: inline-flex; gap: .5rem; justify-content: center; min-block-size: 2.75rem; }
.voyage-action-button__icon--pending { animation: voyage-route-progress 900ms ease-in-out infinite alternate; }
@media (prefers-reduced-motion: reduce) { .voyage-backdrop__video { display: none; } .voyage-action-button__icon--pending { animation: none; } }
@keyframes voyage-route-progress { to { transform: translateX(.18rem) rotate(8deg); } }
```

- [ ] **Step 5: Verify the SSR test and type check pass**

Run: `npm test -- src/components/ImmersiveBackdrop.test.tsx && npm run lint`

Expected: The backdrop markup test passes and TypeScript reports no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ImmersiveBackdrop.tsx src/components/ImmersiveBackdrop.test.tsx src/index.css
git commit -m "feat: add accessible immersive backdrop"
```

### Task 5: Rebuild the Planner as the Wayfinding Observatory

**Files:**
- Modify: `src/pages/MapPlanner.tsx`
- Modify: `.env.example`
- Modify: `src/index.css`

- [ ] **Step 1: Write a failing planner view-model test for the disabled route action**

```ts
test('route action remains disabled when origin and destination are identical', () => {
  assert.equal(canPlanRoute({ origin: 'c1', destination: 'c1', mapReady: true }), false);
});

test('route action becomes available once two different cities and the map are ready', () => {
  assert.equal(canPlanRoute({ origin: 'c1', destination: 'c4', mapReady: true }), true);
});
```

- [ ] **Step 2: Verify the test fails because the planner helper is absent**

Run: `npm test -- src/pages/mapPlannerState.test.ts`

Expected: FAIL with `Cannot find module './mapPlannerState'`.

- [ ] **Step 3: Extract and implement the minimal planner helper**

```ts
export function canPlanRoute({ origin, destination, mapReady }: { origin: string; destination: string; mapReady: boolean }) {
  return Boolean(mapReady && origin && destination && origin !== destination);
}
```

- [ ] **Step 4: Move the client map key to the Vite environment**

```env
VITE_AMAP_KEY=replace-with-amap-browser-key
VITE_AMAP_SECURITY_JS_CODE=replace-with-amap-security-code
```

Replace the two hard-coded values in `AMapLoader.load()` and `window._AMapSecurityConfig` with `import.meta.env.VITE_AMAP_KEY` and `import.meta.env.VITE_AMAP_SECURITY_JS_CODE`. When either value is absent, show an in-context map-unavailable message and keep the route form disabled.

- [ ] **Step 5: Replace the old left-side card column with the observatory structure**

```tsx
<main className="voyage-observatory">
  <ImmersiveBackdrop pathname="/planner" />
  <div ref={mapRef} className="voyage-observatory__map" />
  <section className="voyage-observatory__heading" aria-labelledby="planner-title">
    <p>路线观察台</p>
    <h1 id="planner-title">从出发地，看见抵达的路径。</h1>
  </section>
  <form className="voyage-observatory__rail" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
    <label><span>出发地</span><select value={origin} onChange={(event) => updateSelection(event.target.value)}>{availableCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
    <label><span>目的地</span><select value={destination} onChange={(event) => updateSelection(event.target.value)}>{availableCities.map((city) => <option key={city.id} value={city.id} disabled={city.id === origin}>{city.name}</option>)}</select></label>
    <ActionButton action="plan-route" pending={isPlanning} type="submit" disabled={!canPlanRoute({ origin, destination, mapReady: Boolean(AMapObj) })} />
  </form>
  {showRoutes && <aside aria-label="路线方案" className="voyage-observatory__results">{routes.map((route) => <button key={route.id} type="button" className="voyage-observatory__option"><span>{route.type}</span><strong>{route.duration}</strong><span>{route.price}</span>{route.distance && <span>{route.distance}</span>}</button>)}</aside>}
</main>
```

- [ ] **Step 6: Make AMap lifecycle safe for the new layout**

Store the created map in the effect-local variable and destroy that same variable in cleanup. Do not use the stale `mapInstance` captured by the current empty-dependency effect.

```ts
let map: AMap.Map | null = null;
// assign map after AMapLoader.load resolves
return () => map?.destroy();
```

- [ ] **Step 7: Verify behavior, build, and browser route state**

Run: `npm test -- src/pages/mapPlannerState.test.ts && npm run lint && npm run build`

Expected: Planner helper tests pass, type checking passes, and Vite creates `dist`.

Manual check: With valid AMap variables, choose Beijing and Chengdu, submit once, and confirm a driving route is drawn and the selected result exposes time, distance, and tolls. With variables absent, confirm the explanatory unavailable state appears without a console error.

- [ ] **Step 8: Commit**

```bash
git add src/pages/MapPlanner.tsx src/pages/mapPlannerState.ts src/pages/mapPlannerState.test.ts src/index.css .env.example
git commit -m "feat: redesign planner as route observatory"
```

### Task 6: Apply Shared Action Feedback and Scene Transitions to Existing Flows

**Files:**
- Modify: `src/components/Layout.tsx`
- Modify: `src/pages/Home.tsx`
- Modify: `src/pages/Guides.tsx`
- Modify: `src/pages/Food.tsx`
- Modify: `src/pages/Compare.tsx`
- Modify: `src/pages/Profile.tsx`
- Modify: `src/pages/Auth.tsx`
- Modify: `src/components/SubmissionModal.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Write a failing layout test for route-aware scene rendering**

```ts
test('layout renders the comparison scene for the active route', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={['/compare']}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="compare" element={<p>Compare content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
  assert.match(markup, /compare-contours\.mp4/);
});
```

- [ ] **Step 2: Verify the layout test fails before scene rendering is added**

Run: `npm test -- src/components/Layout.test.tsx`

Expected: FAIL because `Layout` does not yet render `ImmersiveBackdrop`.

- [ ] **Step 3: Render one backdrop from the shared layout and crossfade it by pathname**

```tsx
const location = useLocation();
<AnimatePresence mode="wait">
  <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.36 }}>
    <ImmersiveBackdrop pathname={location.pathname} />
  </motion.div>
</AnimatePresence>
```

Keep the backdrop inside a positioned page shell and below navigation, page content, modals, map controls, and form controls.

- [ ] **Step 4: Replace local loading icons only at asynchronous action boundaries**

Use `ActionButton` for: Compare search, Auth submit, Profile avatar upload, guide submission, food submission, and the administrator review decision. Keep ordinary navigation, filtering, tabs, close controls, and favorite toggles as lightweight standard buttons.

```tsx
<ActionButton action="search-price" pending={isLoading} type="submit" className="w-full lg:w-auto" />
<ActionButton action="sign-in" pending={loading} type="submit" />
<ActionButton action="upload-avatar" pending={avatarUploading} type="button" onClick={() => fileInputRef.current?.click()} />
```

- [ ] **Step 5: Preserve concurrent request behavior**

Leave `idempotentJson()` as the request boundary for guide, food, profile, and submission calls. Page-level pending state belongs to its initiating action only; do not add a global pending lock or a layout-wide loading overlay.

- [ ] **Step 6: Render the additional ambient assets**

Register `HomeCurrent`, `GuidesContours`, `CompareContours`, and `ProfileArchive` in `src/remotion/Root.tsx`. Each composition reuses `RouteTerrain` with a `tone` prop: `home` uses a broad geographic current, `guides` uses slow reading contours, `compare` uses sparse price contours, and `profile` uses a quiet personal route archive. Render each H.264 MP4 under `public/motion/`; no composition uses circles, bokeh, or gradients.

Run: `npx remotion render src/remotion/index.ts HomeCurrent public/motion/home-current.mp4 --codec=h264`

Expected: Each named scene appears in `public/motion/` and can play independently.

- [ ] **Step 7: Verify non-planner routing and whole-project build**

Run: `npm test -- src/components/Layout.test.tsx && npm test && npm run lint && npm run build`

Expected: All Node tests pass, TypeScript reports no errors, and the production build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/Layout.tsx src/pages/Home.tsx src/pages/Guides.tsx src/pages/Food.tsx src/pages/Compare.tsx src/pages/Profile.tsx src/pages/Auth.tsx src/components/SubmissionModal.tsx src/remotion public/motion src/index.css
git commit -m "feat: unify immersive scenes and action feedback"
```

### Task 7: Verify the Product Surface at Desktop and Mobile

**Files:**
- Create: `.impeccable/review/desktop.png`
- Create: `.impeccable/review/mobile.png`

- [ ] **Step 1: Start the application with the API server available**

Run: `npm run dev:all`

Expected: Vite serves the app on port `3000` and Express serves API requests on port `3001`.

- [ ] **Step 2: Capture desktop and mobile planner states**

Capture `/planner` at `1440x1000` and `390x844`, after loading is settled and once with reduced motion enabled. Save the captures to `.impeccable/review/desktop.png` and `.impeccable/review/mobile.png`.

Expected: The route terrain is visible on desktop, the planning rail remains legible, mobile controls are not obscured by terrain labels, and reduced-motion uses the static poster.

- [ ] **Step 3: Perform one batched visual defect pass**

Check in a single pass: focus visibility, text contrast, no clipped route controls, no overlap between map controls and the planning rail, no auto-playing motion required for comprehension, and no changing button dimensions while pending.

- [ ] **Step 4: Run the Impeccable mechanical detector once**

Run: `node C:\Users\asus\.codex\skills\impeccable\scripts\detect.mjs --json src/components/ActionButton.tsx src/components/ImmersiveBackdrop.tsx src/pages/MapPlanner.tsx src/index.css`

Expected: Record every reported issue. Fix mechanical issues in one batch before the final capture; do not run the detector again.

- [ ] **Step 5: Run final checks**

Run: `npm test && npm run lint && npm run build`

Expected: All commands exit with code `0`.

- [ ] **Step 6: Commit the verified visual implementation**

```bash
git add .impeccable/review src/components src/lib/experience src/pages/MapPlanner.tsx src/remotion public/motion src/index.css package.json package-lock.json .env.example remotion.config.ts
git commit -m "feat: ship voyagex wayfinding observatory"
```

## Coverage Review

- Wayfinding Observatory first viewport and spatial route decision: Tasks 3 and 5.
- Remotion pre-rendered visual layer with static and reduced-motion fallbacks: Tasks 3 and 4.
- Module-aware fluid transitions without decorative orbs or gradients: Task 6.
- Dynamic, action-specific loading icons with stable layout and live status: Task 2 and Task 6.
- AMap behavior, API-key hygiene, errors, and lifecycle cleanup: Task 5.
- Existing request idempotency and concurrent page requests: Task 1 and Task 6.
- Desktop/mobile, accessibility, build, and mechanical UI verification: Task 7.

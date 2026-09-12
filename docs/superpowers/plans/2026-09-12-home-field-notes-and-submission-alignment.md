# Home Field Notes And Submission Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the homepage a build-time Remotion Field Notes film with a reduced-motion fallback, and align the contribution controls and content rails on guide and food pages.

**Architecture:** A HomeFieldNotes Remotion composition generates a decorative MP4 and poster from deterministic scene primitives. The homepage retains semantic HTML controls and uses the generated media only as a backdrop. CSS defines one shared contribution rail for the two existing pages so their action controls stay aligned with the search rails and content grids at desktop and mobile widths.

**Tech Stack:** React 19, TypeScript, Vite, Remotion, Framer Motion, Tailwind CSS, Node test runner.

---

## File Map

- Create: src/remotion/HomeFieldNotes.tsx - 12-second decorative scene.
- Modify: src/remotion/Root.tsx - composition registration.
- Modify: src/lib/experience/sceneCatalog.ts and src/lib/experience/sceneCatalog.test.ts - home media contract.
- Modify: src/pages/Home.tsx - field-notes media layer with semantic foreground controls.
- Create: src/pages/homeFieldNotes.test.tsx - media fallback regression test.
- Create: src/components/ContributionRailIntro.tsx and src/components/ContributionRailIntro.test.tsx - shared semantic layout contract.
- Modify: src/pages/Guides.tsx, src/pages/Food.tsx, and src/index.css - shared alignment rail.
- Modify: package.json - Remotion render command and Node-test file list.
- Create: public/motion/home-field-notes.mp4 and public/motion/home-field-notes-poster.png - generated assets.

### Task 1: Lock The Homepage Media Contract

**Files:**
- Modify: src/lib/experience/sceneCatalog.ts
- Modify: src/lib/experience/sceneCatalog.test.ts

- [ ] **Step 1: Write the failing asset-mapping test**

~~~ts
test('home uses the field-notes video and dedicated poster fallback', () => {
  assert.deepEqual(getSceneForPath('/'), {
    videoSrc: '/motion/home-field-notes.mp4',
    posterSrc: '/motion/home-field-notes-poster.png',
    tone: 'home',
  });
});
~~~

- [ ] **Step 2: Verify the test fails for the old home-current asset**

Run: npx tsx --test src/lib/experience/sceneCatalog.test.ts

Expected: the new home assertion reports home-current.mp4 instead of home-field-notes.mp4.

- [ ] **Step 3: Replace only the home scene asset entry**

~~~ts
home: {
  videoSrc: '/motion/home-field-notes.mp4',
  posterSrc: '/motion/home-field-notes-poster.png',
  tone: 'home',
},
~~~

Leave every other tone unchanged.

- [ ] **Step 4: Verify the scene catalog test passes**

Run: npx tsx --test src/lib/experience/sceneCatalog.test.ts

Expected: all scene-catalog tests pass.

- [ ] **Step 5: Commit the media contract**

~~~bash
git add src/lib/experience/sceneCatalog.ts src/lib/experience/sceneCatalog.test.ts
git commit -m "test: define home field-notes media contract"
~~~

### Task 2: Build And Register The Remotion Scene

**Files:**
- Create: src/remotion/HomeFieldNotes.tsx
- Create: src/remotion/homeFieldNotes.test.ts
- Modify: src/remotion/Root.tsx
- Modify: package.json

- [ ] **Step 1: Write the failing timeline test**

~~~ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { HOME_FIELD_NOTES_DURATION, HOME_FIELD_NOTES_FPS } from './HomeFieldNotes';

test('field notes uses a twelve-second 30fps timeline', () => {
  assert.equal(HOME_FIELD_NOTES_FPS, 30);
  assert.equal(HOME_FIELD_NOTES_DURATION, 360);
});
~~~

- [ ] **Step 2: Verify it fails because the scene module does not exist**

Run: npx tsx --test src/remotion/homeFieldNotes.test.ts

Expected: module-resolution failure for ./HomeFieldNotes.

- [ ] **Step 3: Implement the deterministic three-phase scene**

~~~tsx
export const HOME_FIELD_NOTES_FPS = 30;
export const HOME_FIELD_NOTES_DURATION = 360;

export function HomeFieldNotes() {
  const frame = useCurrentFrame();
  const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const mastheadOpacity = interpolate(frame, [0, 24, 88, 112], [0, 1, 1, 0], clamp);
  const editorialProgress = interpolate(frame, [90, 239], [0, 1], clamp);
  const routeCueOpacity = interpolate(frame, [240, 276, 344, 359], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ background: '#264d4a' }}>
    <div style={{ opacity: mastheadOpacity }}>FIELD NOTES / 35.7° N</div>
    <div style={{ transform: `scale(${0.96 + editorialProgress * 0.04})` }}>VOYAGEX</div>
    <div style={{ opacity: routeCueOpacity }}>PLAN THE NEXT LEG</div>
  </AbsoluteFill>;
}
~~~

Use AbsoluteFill, interpolate, and useCurrentFrame. Use no randomness, browser APIs, or network requests. Register id HomeFieldNotes with fps 30, durationInFrames 360, width 1920, and height 1080. Add the package script:

~~~json
"render:home-field-notes": "remotion render src/remotion/index.ts HomeFieldNotes public/motion/home-field-notes.mp4 --codec=h264 --frames=0-359"
~~~

- [ ] **Step 4: Verify the timeline test passes**

Run: npx tsx --test src/remotion/homeFieldNotes.test.ts

Expected: one passing test with a 360-frame, 30fps timeline.

- [ ] **Step 5: Render and inspect the scene**

~~~bash
npm run render:home-field-notes
npx remotion still src/remotion/index.ts HomeFieldNotes public/motion/home-field-notes-poster.png --frame=150
~~~

Expected: an MP4 and poster exist under public/motion; the poster leaves sufficient quiet space for semantic hero text.

- [ ] **Step 6: Commit the composition and generated assets**

~~~bash
git add src/remotion/HomeFieldNotes.tsx src/remotion/Root.tsx src/remotion/homeFieldNotes.test.ts package.json public/motion/home-field-notes.mp4 public/motion/home-field-notes-poster.png
git commit -m "feat: add remotion field-notes hero film"
~~~

### Task 3: Replace The Homepage Image Layer Without Replacing Controls

**Files:**
- Modify: src/pages/Home.tsx
- Create: src/pages/homeFieldNotes.test.tsx

- [ ] **Step 1: Write the failing server-rendered media test**

~~~tsx
test('homepage field-notes media has a poster and metadata preload', () => {
  const markup = renderToStaticMarkup(createElement(HomeHeroMedia, { scene: getSceneForPath('/') }));
  assert.match(markup, /home-field-notes\.mp4/);
  assert.match(markup, /home-field-notes-poster\.png/);
  assert.match(markup, /preload="metadata"/);
});
~~~

- [ ] **Step 2: Verify it fails because HomeHeroMedia is absent**

Run: npx tsx --test src/pages/homeFieldNotes.test.tsx

Expected: export error for HomeHeroMedia.

- [ ] **Step 3: Implement the decorative media layer**

~~~tsx
export function HomeHeroMedia({ scene }: { scene: SceneDefinition }) {
  return (
    <div aria-hidden="true" className="home-field-notes-media">
      <img src={scene.posterSrc} alt="" className="home-field-notes-media__poster" />
      <video className="home-field-notes-media__video" muted loop playsInline autoPlay preload="metadata" poster={scene.posterSrc}>
        <source src={scene.videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}
~~~

Replace the current full-bleed carousel image with HomeHeroMedia using getSceneForPath('/'). Keep destination state, labels, interval, routes, arrow buttons, and indicators. Add stable aria-label values to the arrow and indicator controls.

- [ ] **Step 4: Verify the focused test passes**

Run: npx tsx --test src/pages/homeFieldNotes.test.tsx

Expected: the test finds the MP4, poster, and preload attributes.

- [ ] **Step 5: Commit the homepage integration**

~~~bash
git add src/pages/Home.tsx src/pages/homeFieldNotes.test.tsx
git commit -m "feat: use field-notes media on homepage"
~~~

### Task 4: Apply The Shared Contribution Rail

**Files:**
- Create: src/components/ContributionRailIntro.tsx
- Create: src/components/ContributionRailIntro.test.tsx
- Modify: src/pages/Guides.tsx
- Modify: src/pages/Food.tsx
- Modify: src/index.css

- [ ] **Step 1: Write the failing shared-layout test**

~~~tsx
import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContributionRailIntro } from './ContributionRailIntro';

test('contribution intro anchors title, action, and search content to one rail', () => {
  const markup = renderToStaticMarkup(createElement(ContributionRailIntro, {
    title: '精选旅行攻略',
    description: '真实行程',
    action: createElement('button', null, '发布攻略'),
    children: createElement('div', null, '搜索'),
  }));
  assert.match(markup, /voyage-contribution-rail/);
  assert.match(markup, /voyage-contribution-rail__action/);
  assert.match(markup, /精选旅行攻略/);
});
~~~

- [ ] **Step 2: Verify it fails because the layout component does not exist**

Run: npx tsx --test src/components/ContributionRailIntro.test.tsx

Expected: module-resolution failure for ./ContributionRailIntro.

- [ ] **Step 3: Implement the shared semantic layout component and apply it**

~~~tsx
export function ContributionRailIntro({ title, description, action, children }: ContributionRailIntroProps) {
  return (
    <div className="voyage-contribution-rail max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="voyage-contribution-rail__heading flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div><h1>{title}</h1><p>{description}</p></div>
        <div className="voyage-contribution-rail__action">{action}</div>
      </div>
      <div className="voyage-contribution-rail__search">{children}</div>
    </div>
  );
}
~~~

Use this component in Guides and Food with their existing titles, descriptions, action buttons, and search/filter rails. Add CSS that sets max-inline-size to 80rem, centers it, uses equal inline padding, applies justify-content: space-between at min-width 701px, and applies inline-size: 100% to the action at max-width 700px. In the existing reduced-motion query, hide `.home-field-notes-media__video` while retaining the poster. Do not change handlers, modal props, labels, filtering, or result-card markup.

~~~css
.voyage-contribution-rail { max-inline-size: 80rem; margin-inline: auto; }
@media (min-width: 701px) { .voyage-contribution-rail__heading { justify-content: space-between; } }
@media (max-width: 700px) { .voyage-contribution-rail__action > * { inline-size: 100%; } }
@media (prefers-reduced-motion: reduce) { .home-field-notes-media__video { display: none; } }
~~~

- [ ] **Step 4: Verify the layout test passes**

Run: npx tsx --test src/components/ContributionRailIntro.test.tsx

Expected: one passing test.

- [ ] **Step 5: Commit the alignment change**

~~~bash
git add src/components/ContributionRailIntro.tsx src/components/ContributionRailIntro.test.tsx src/pages/Guides.tsx src/pages/Food.tsx src/index.css
git commit -m "style: align guide and food contribution rails"
~~~

### Task 5: Complete Regression And Visual Verification

**Files:**
- Modify only files whose defects were introduced by Tasks 1-4.

- [ ] **Step 1: Run automated verification**

~~~bash
npm test
npm run lint
npm run build
~~~

Expected: tests pass, TypeScript reports no errors, and Vite produces dist.

Before running `npm test`, extend `test:node` in `package.json` to include `src/remotion/*.test.ts`, `src/pages/homeFieldNotes.test.tsx`, and `src/components/ContributionRailIntro.test.tsx` so the new regression tests are part of the normal suite.

- [ ] **Step 2: Run the Remotion render verification**

~~~bash
npm run render:home-field-notes
npx remotion still src/remotion/index.ts HomeFieldNotes public/motion/home-field-notes-poster.png --frame=150
~~~

Expected: the final MP4 and poster are nonblank and frame the text-safe area correctly.

- [ ] **Step 3: Capture desktop and mobile evidence**

Run: npm run dev -- --port 3000

Capture /, /guides, and /food at 1440px and 390px widths. Confirm the video/poster fallback behavior, aligned title/action/search/result edges, no clipped controls, and no overlapping text.

- [ ] **Step 4: Run the design detector once**

~~~bash
node C:\Users\asus\.codex\skills\impeccable\scripts\detect.mjs --json src/pages/Home.tsx src/pages/Guides.tsx src/pages/Food.tsx src/index.css
~~~

Expected: no new high-severity design findings. Correct only issues caused by Tasks 1-4, then repeat the full automated verification once.

- [ ] **Step 5: Report the final evidence**

Report the media paths, test/build results, detector output, and desktop/mobile visual evidence. If verification exposes a defect, return to the task that owns the affected file, add a failing regression test there, create that task's exact commit, and then repeat this task.

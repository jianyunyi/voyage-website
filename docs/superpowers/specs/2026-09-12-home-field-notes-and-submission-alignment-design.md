# Home Field Notes And Submission Alignment Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage's image-carousel hero with an editorial Remotion field-notes film and give the guide and food contribution surfaces one shared, responsive alignment rail.

**Architecture:** A dedicated Remotion composition renders one looped, decorative homepage film and its poster. The React homepage owns all interactive text, destination changes, links, and reduced-motion behavior above that media. Guide and food intros keep their existing submission logic but receive a common layout contract so their heading, call-to-action, search rail, and result grid share identical outer edges.

**Tech Stack:** React 19, TypeScript, Vite, Remotion, Framer Motion, Tailwind CSS, Lucide.

---

## Scope

- Replace only the visual role of the existing `/` hero. Published guide and food recommendation loading, links, carousel controls, and preference ordering remain intact.
- Add a 12-second `HomeFieldNotes` Remotion composition that communicates a destination through a location label, coordinates, an editorial frame, and a planning cue.
- Render the composition to an MP4 and a static poster in `public/motion/`; page interaction never depends on video frames.
- Align the `Guides` and `Food` title blocks, contribution buttons, search controls, and result content to the same `max-w-7xl` rail.
- Keep existing approval-gated submission behavior and ActionButton loading feedback unchanged.

## Homepage Experience

### Field Notes Film

The background film is an ambient destination log rather than a UI carousel. It has three phases:

1. Frames 0-89: a field-note masthead introduces the current destination and coordinate reference.
2. Frames 90-239: a photographic editorial window, travel marks, and measured motion establish a sense of place.
3. Frames 240-359: a quiet route cue closes the loop and makes the visible route-planning action feel consequential.

The film runs muted, loops, and has no interactive controls. The foreground remains semantic HTML: destination name, description, previous/next destination controls, indicators, and links to `/planner` and `/guides`.

### Accessibility And Performance

- `prefers-reduced-motion` uses the matching poster rather than autoplay video.
- The video is `muted`, `playsInline`, `loop`, `preload="metadata"`, and has a poster fallback.
- Hero controls retain descriptive labels and remain usable without video.
- The film is decorative (`aria-hidden`) and never conveys a required state or destination detail.
- Video rendering is a build-time asset step; the browser does not execute Remotion.

## Contribution-Surface Alignment

Both pages use the same content rail at every breakpoint.

| Viewport | Heading and action | Search and filters | Result content |
| --- | --- | --- | --- |
| `md` and wider | Title group begins at the left rail; contribution button is anchored to the right rail. | Uses the same full left/right edges below the heading. | Starts and ends on those edges. |
| Below `md` | Button flows under the title group and fills the available rail width. | Stacks below the button without an inset edge. | Uses the same page gutter. |

The guide action remains `发布攻略`; the food action remains `推荐美食`. Their modal triggers, loading states, success feedback, and moderation API calls are not changed.

## Components And Files

- Create `src/remotion/HomeFieldNotes.tsx`: deterministic, 1920x1080 Remotion scene with a `destination` prop and the three phases above.
- Modify `src/remotion/Root.tsx`: register `HomeFieldNotes` with a 12-second, 30fps composition.
- Modify `src/lib/experience/sceneCatalog.ts`: associate `/` with the new poster/video asset while retaining existing page tones.
- Modify `src/pages/Home.tsx`: use the field-notes video/poster as the decorative hero background; preserve current content and controls.
- Modify `src/pages/Guides.tsx` and `src/pages/Food.tsx`: apply the shared intro/rail classes without altering data fetching or submit handlers.
- Modify `src/index.css`: define the shared rail, desktop right-edge action anchor, and mobile full-width action behavior.
- Add `public/motion/home-field-notes.mp4` and `public/motion/home-field-notes.jpg`: generated build artifacts.

## Data Flow

1. `Home` selects a destination from the current carousel state.
2. The visible destination label and the decorative media share that state through a stable asset mapping.
3. User actions navigate with normal React Router links; media never triggers navigation.
4. `Guides` and `Food` retain their own local modal state and data services. Shared CSS changes only geometry.

## Failure Handling

- When video cannot play or cannot be loaded, the poster remains visible and all hero controls work.
- When guide or food APIs return no data, existing empty/loading/error states remain unchanged.
- A submission still appears only after the existing review process; alignment changes do not bypass moderation or change permissions.

## Verification

- Unit-test the new scene catalog asset mapping and reduced-motion poster selection.
- Add focused render tests for the homepage hero's accessible controls and contribution buttons.
- Run `npm test`, `npm run lint`, and `npm run build`.
- Render `HomeFieldNotes` once through Remotion and inspect its generated poster/video framing.
- Capture desktop and mobile screenshots of `/`, `/guides`, and `/food`; verify that both edges of each title, action, search rail, and result grid line up without clipping or overlap.
- Run the Impeccable detector on changed UI files after the final screenshot pass.

## Out Of Scope

- New destination data sources, changed recommendation algorithms, or a new `/explore` route.
- Redesigning guide/food card content, submission forms, or moderation logic.
- Cloudflare deployment, Worker endpoint, or Go backend changes.

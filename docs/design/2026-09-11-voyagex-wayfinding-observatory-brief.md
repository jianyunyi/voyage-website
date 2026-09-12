# VoyageX Wayfinding Observatory Design Brief

## Job and Audience

- **Mode:** Experience, with an Operate-grade route-planning core.
- **Audience:** A traveler who has chosen a possible destination and needs to turn curiosity into a route they can trust, often while comparing a few travel modes and stops.
- **Primary outcome:** Within the first screen, the user understands the proposed journey, can set origin, destination, dates, and mode, and can compare the consequence of each route without losing their sense of place.

## Selected Direction

- **Direction:** Wayfinding Observatory, selected by the user from the Impeccable concept board.
- **Thesis:** The route occupies the first viewport. Control, time, cost, and transport choices are anchored to the route rather than competing with it in a dashboard grid.
- **Focal moment:** A responsive topographic travel field. A route grows between confirmed waypoints; the active leg brightens and nearby alternatives recede. The motion makes planning feel spatial, while labels preserve the exact task information.
- **Visual language:** Deep forest and pale mineral terrain, lime route traces, and amber only for a current choice or an attention-worthy event. Fine contour lines, ground-shadowed terrain, and calibrated map labels create depth without decorative blobs, bokeh, or generic gradients.

## Layout and Interaction

- **First viewport:** A compact navigation edge, full-bleed route terrain, and a low, persistent planning rail. The rail has origin, destination, date, route type, and one primary plan action. It remains a regular semantic form and does not depend on the background animation.
- **Route results:** After planning, the terrain becomes the shared context; a single route detail panel enters from the edge. It compares travel modes with duration, price, transfer count, and a plain-language tradeoff. Selecting an option changes both the map trace and its data summary.
- **Journey legs:** Multi-stop trips use a numbered, keyboard-accessible route ledger tied to visible waypoint markers. Dragging or editing a leg always updates text labels, total distance, time, and budget.
- **Mobile:** The terrain stays at the top with an accessible static poster fallback. Controls become a vertical bottom sheet; results open as a full-height, dismissible panel rather than overlaying unreadable map labels.

## Motion and Rendering

- **Remotion role:** Pre-render short, muted loop assets for route terrain and module transitions. They run as an ambient visual layer behind application UI, not as the source of route state or interaction.
- **Planner scene:** A slow topographic surface shift and route pulse only after user intent. Route results animate in one coordinated sequence; no repeating attention animations on data cards.
- **Module transitions:** Home uses a broad geographic current, Guides uses a slow contour-reading field, Planner uses the topographic route field, Compare uses restrained price contours, and Profile settles into a quiet personal route archive. The transition crossfades through shared terrain and linework rather than colored orbs or abrupt palette swaps.
- **Button loading:** Replace generic static pending states with an action-specific, animated Lucide icon treatment. For example, plan routes progresses from `MapPin` to `Route`; publish progresses from `FileUp` to `ShieldCheck`; submit review progresses from `Send` to `Clock3`. Buttons retain their dimensions, label, disabled semantics, and an accessible `aria-live` status.
- **Performance and inclusion:** Respect `prefers-reduced-motion` with an immediate static poster and no automatic route pulse. Pause off-screen video, serve WebM with a lightweight poster fallback, and ensure all route, review, error, and loading states have text and non-color signals.

## Scope and Boundaries

- **Initial implementation surface:** `src/pages/MapPlanner.tsx`, then shared layout, action buttons, and motion primitives used by Home, Guides, Compare, Profile, Auth, and SubmissionModal.
- **Preserve:** Existing route-planning behavior, public browsing, protected profile access, UGC review status, current backend contracts, and user-provided content.
- **Do not do:** Replace authoritative map data with video, hide essential controls in cinematic sequences, introduce decorative floating cards, use gradient or bokeh backgrounds, or make a visual treatment the only way to understand a status.
- **Open implementation decision:** Use Remotion's render pipeline for pre-rendered assets first. Add `@remotion/player` only when the route timeline needs deliberate user-controlled playback beyond ordinary map interaction.

## States and Ranges

- **Planning:** initial, geocoding, route calculation, successful alternatives, partial alternatives, unavailable travel mode, map API failure, and empty multi-stop route.
- **UGC:** draft, pending review, approved, rejected with reason, and safe-to-display public content.
- **Loading:** request deduplication keeps a single in-flight action visually owned by its initiating control; concurrent page data requests continue independently and show local skeleton or status states.
- **Content:** one to several route legs; a small set of route alternatives; long place names, differing currencies, and narrow mobile screens must not change control dimensions or obscure totals.

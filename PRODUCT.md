# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Planning domestic short or long trips, usually moving from inspiration to a feasible itinerary.
- Registered contributors who submit travel guides and need to understand their review status in a personal workspace.
- Administrators who review potentially public user-generated travel content.

## Product Purpose

VoyageX brings destination discovery, travel guides, local food, route planning, price comparison, and personal travel content into one web experience. Its primary success is helping a traveler turn a place they want to visit into a confident, workable route decision.

## Positioning

VoyageX connects editorial discovery to actionable route planning in the same product. Published community guides are moderated before public display, while contributors retain a clear view of their submissions and review outcomes.

## Operating Context

- Public visitors explore destinations, guides, food, routes, hotels, and price comparisons before login.
- The route planner supports mapping and travel-mode decisions across multiple destinations.
- Logged-in users manage preferences, favorites, avatar, and their submitted guides.
- User-generated content moves through a pending, approved, or rejected review flow before becoming public.

## Capabilities and Constraints

- React 19, TypeScript, Vite, React Router, Tailwind CSS, Framer Motion, Lucide, AMap, and a Go/Gin/Gorm backend are present in the project.
- The product must keep public UGC hidden until review approval, expose review status to the contributor, and preserve rejected records with a reason.
- Login verification, content moderation, upload validation, storage isolation, and request idempotency are established product security requirements.
- The visual refresh prioritizes the travel-planning and route-decision journey; the desired product character is immersive travel exploration.
- Remotion is an intended visual-rendering tool for selected explanatory, spatial, or ambient scenes; normal user controls remain accessible, responsive UI.

## Brand Commitments

- Product name: VoyageX.
- The product should feel like an immersive travel exploration experience, while route and cost decisions remain intelligible and trustworthy.

## Evidence on Hand

- Current pages and flows are implemented in `src/pages` and routed from `src/App.tsx`.
- Existing documentation is in `README.md`.
- There are no confirmed brand assets, customer testimonials, proprietary photography, or externally validated performance claims available for new designs.

## Product Principles

- Lead with a sense of place, then make the next planning action obvious.
- Turn complex multi-stop travel choices into legible route and tradeoff decisions.
- Let public content earn visibility through moderation without obscuring creator feedback.
- Preserve a fast, accessible core interaction beneath visual atmosphere.

## Accessibility & Inclusion

- Motion must respect reduced-motion preferences and never be the sole carrier of navigation, state, or status.
- Route, price, review, and loading states require text and non-color indicators.
- Public exploration and core planning actions should remain usable on mobile web.

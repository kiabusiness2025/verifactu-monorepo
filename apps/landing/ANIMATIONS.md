Animation Specification — Landing & Hero (Isaak)
Date: 2025-12-23

Principles
- Subtle: motion supports comprehension, never steals focus.
- Slow: default durations feel calm (400–1200 ms), no rush.
- Professional: restrained easing; clean micro-interactions.
- Reassuring: communicates confidence, not hype.
- Avoid: bounces, elastic/overshoot, aggressive scales, flashy consumer-app effects.
- Inspiration: Stripe, Linear, Vercel, Notion.

Motion Vocabulary (global guidance)
- Properties: animate only transform (translateY) and opacity to stay GPU-friendly.
- Durations: entrance 400–600 ms; item micro-animations 180–240 ms; hover 160–220 ms; counters 800–1200 ms.
- Stagger: 80–120 ms between related elements in the hero.
- Cadence: mockup rotation every 4–6 s.
- Easing: soft ease-out (e.g., cubic-bezier(0.2, 0.8, 0.2, 1)). No overshoot.
- Accessibility: honor prefers-reduced-motion (reduce motion to none or near-zero).

Hero — Entrance
- Objective: convey that everything calmly falls into place.
- Elements (order): headline → subheadline → CTAs → Isaak panel.
- Animation: fade + translateY (8–12 px) to 0.
- Durations: each 400–600 ms; stagger 80–120 ms.
- Ease: soft ease-out.
- Trigger: on initial load, once per page visit.

Hero — Isaak Messages (mockup activity)
- Visibility: show 2–3 messages at any time.
- Cycle: every 4–6 s introduce one new message, retire the oldest.
- Enter: icon fades/slides in first (180–220 ms), text follows after ~100 ms (fade + very light slide).
- Exit: oldest message fades out and collapses with minimal height change (no jump).
- Distraction control: no large movement; keep slide under 4–8 px.
- Usability: pause rotation on hover (desktop) to let users read.

Hero — Message States
- States: validated (✔️), attention (⚠️), insight (📊/📈).
- Animation: icon appears first; text after ~100 ms.
- Tone: color accents are subtle; no flashing or pulsing.

Hover (desktop only)
- CTA: very light shadow change and tiny elevation feeling (translateY 2–4 px). No scale-ups.
- Cards: minimal elevation (2–4 px translateY) + soft shadow increase.
- Duration: 160–220 ms; ease-out.
- Scope: apply under (hover:hover) media query only.

Dashboard Preview (on landing)
- Counters (ventas/gastos/beneficio): count-up animates once on first viewport entry.
- Duration: 800–1200 ms with soft ease; no bounce.
- Stability: numbers should not jitter; redraw efficiently.

Performance & Accessibility
- Use transform + opacity; avoid animating layout-affecting properties (top/left/width/height).
- Prefer will-change for animated elements to hint GPU compositing.
- Respect prefers-reduced-motion: disable rotations and count-ups; show content statically.
- ARIA: treat Isaak panel as a non-live region (no announcements loop). Make icons decorative where appropriate.
- Interactions: pause rotations when focused/hovered; maintain keyboard navigation.

Implementation Notes (mapping)
- Entrance: add a visibility class when the hero enters (e.g., via IntersectionObserver) and transition hero children with stagger.
- Mockup rotation: keep state-driven list; animate add/remove with class-based transitions rather than heavy JS timelines.
- Hover: scope transitions under (hover:hover) to avoid mobile jitter.
- Counters: one-shot on intersection; clamp frame updates; no infinite loops.
- Variables: define motion tokens (durations/easings) to ensure consistency.

Suggested Tokens (for CSS)
- --motion-ease-soft: cubic-bezier(0.2, 0.8, 0.2, 1)
- --motion-duration-entrance: 500ms
- --motion-duration-item: 200ms
- --motion-duration-hover: 180ms
- --motion-duration-counter: 1000ms
- --motion-stagger: 100ms

Quality Bar
- Feeling: “Software serio, pero vivo.” Calm, purposeful, understandable.
- Validate: desktop + mobile check, prefers-reduced-motion, DevTools performance overview.

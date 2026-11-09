# Changelog

All notable changes to the Aurelia Dining template. Version numbers follow [Semantic Versioning](https://semver.org).

## [1.0.0] — 2026-11-09

First complete release.

### Added
- **Pages:** Home, About, Signature Dishes, Menu, Chef, Gallery, Reservations, Contact. Each has a unique title, description, social tags and a breadcrumb.
- **Single content source:** `assets/js/content.js` drives navigation, text, dishes, menu, gallery, testimonials, hours, contact details, page metadata and structured data. It supports brand tokens (`{name}`, `{fullName}`, …).
- **`tools/prerender.mjs`:** an optional, dependency-free Node script that bakes `content.js` into the static HTML for social previews, search engines and visitors without JavaScript. `--check` mode verifies the HTML is in sync.
- **Menu:** category filters (toggle buttons, announced to screen readers), deep links such as `menu.html#desserts`, a dietary key, the tasting menu and an allergy note.
- **Gallery:** a responsive photo grid with an accessible `<dialog>` lightbox. It supports keyboard, buttons and swipe, and returns focus to the thumbnail.
- **Reservation inquiry form:**
  - Accessible validation: an error summary and inline errors; closed days, same-day, booking window and party-size rules.
  - Honest states: unconfigured, sending, server error, and sent ("not a confirmation").
  - An https-only endpoint, and a spam-trap field.
- **Contact page:** address with a directions link, phone, email, opening hours, getting here, and a map card with no third-party embed.
- **Shared sections:** experience cards, values/principles, signature dish cards with hover effects, sample testimonials with a visible label and disclaimer, a reservation call-to-action band, and a full footer.
- **schema.org Restaurant data** (Home and Contact), built only from configured values. Canonical and `og:url` are added once `site.url` is set.
- **Documentation:** README, CUSTOMIZATION, DEPLOYMENT, BROWSER-SUPPORT, CREDITS, LICENSE (draft) and the architecture notes.
- **Test suites** (source only): static checks and headless-browser behaviour tests.

### Changed
- **Header:** fixed at the top of every page and always visible while scrolling. It is transparent over the hero and becomes a solid, blurred bar once you scroll.
- **Navigation:** points to real pages, marks the current page with `aria-current="page"`, and adds a mobile-only "Home" link.
- **Wheel:**
  - Plate `sizes` now follow the real stage width, including gutters and the desktop grid.
  - Image candidates extended to 640w for high-density screens.
  - Container-query units go through a `--cq` variable, with a fallback for browsers without `cqi`.
- **Buttons** may wrap at very large text sizes. Long emails, addresses and words wrap rather than overflow.

### Fixed
- **Wheel, multi-pointer drags:** a second finger or pointer during a drag could leave `is-dragging` and the autoplay hold stuck. Now only one pointer is tracked, with cleanup on `pointerup`, `pointercancel`, the stage's own `lostpointercapture` and window blur.
- **Wheel, focused panels:** autoplay could rotate away, and make inert, a dish panel that had keyboard focus. Focus inside a panel or on a control now stops autoplay, and the autoplay timer refuses to rotate away from a focused panel. Pressing Play still restarts it.
- **Wheel, visibility threshold:** autoplay now enforces the 35% visibility threshold with `intersectionRatio`, instead of relying on `isIntersecting`.
- **Prices:** an invalid `priceDecimals` (for example `-1`) threw a `RangeError` and broke the wheel. Invalid decimals, currency and locale settings now fall back safely and print a console warning.
- **Reservations page:** the no-JavaScript fallback message no longer appears beside a working form (a CSS cascade bug).
- **Wheel fallback:** the "browse the full menu" link pointed at a removed `#menu` section; it now links to `menu.html`.
- **Large text:** the header brand no longer pushes the menu button off-screen.

### Preserved from earlier work
- Header brand and Reserve links close the mobile overlay; closing unlocks scrolling and removes background inertness.
- Wheel controls come before the panels in DOM order. The active panel is focusable and inactive panels are inert.
- Fallbacks for wheel and navigation failures; reduced-motion handling of the menu wipe and logo rotation.
- The autoplay progress ring runs on the Web Animations API, with no forced layout.

# Aurelia Dining — Architecture & Design (Phase 1)

A premium restaurant website template by **TokaMD**. Built with plain HTML5, CSS3 and vanilla JavaScript. No build step and no framework.

This document is the blueprint the later phases build on. It records the decisions, the reasons for them, and the rules that keep the template consistent and easy to customise.

---

## 1. Goals and constraints

| Goal | What it means in practice |
| --- | --- |
| Luxury editorial look | Charcoal backgrounds, cream type, muted gold accents, generous whitespace, a serif display face, slow and precise motion. |
| Signature feature | A rotating food wheel with 5–7 dishes that works with a mouse, touch and the keyboard, and with reduced motion. |
| Commercial quality | All editable content in one place, design tokens as CSS variables, semantic HTML, accessible JavaScript, licensed assets, small payloads, works from 320px wide. |
| Zero tooling | Opens straight from disk (`file://`) and deploys to any static host. No bundler, no npm install. |
| Honest forms | The reservation form never pretends to succeed. Without a configured endpoint it says so and offers phone or email instead (Phase 3/4). |

**Supported browsers:** current evergreen browsers (Chrome, Edge, Firefox, Safari, iOS Safari and Android Chrome, roughly the last two years). Required features: CSS custom properties, `clamp()`, `aspect-ratio`, container query units (`cqi`), `inert`, `IntersectionObserver`, Pointer Events. Older browsers still get readable content: the layout holds up and only the motion is lost.

---

## 2. Visual direction

### 2.1 Palette (tokens in `assets/css/tokens.css`)

| Token | Hex | Role |
| --- | --- | --- |
| `--c-charcoal-950` | `#0d0c0b` | Deepest surface: mobile menu, footer, text on gold |
| `--c-charcoal-900` | `#141312` | Page background |
| `--c-charcoal-850` | `#191817` | Alternate section background |
| `--c-charcoal-800` | `#201e1c` | Cards and raised surfaces |
| `--c-charcoal-700` / `600` | `#2a2725` / `#393532` | Plate placeholders, borders |
| `--c-cream-100` | `#f2ebdd` | Body and heading text |
| `--c-cream-400` | `#b7ac98` | Secondary text |
| `--c-cream-500` | `#918876` | Tertiary text and metadata |
| `--c-gold-400` | `#c9a66b` | Accent: eyebrows, prices, active states |
| `--c-gold-300` | `#e0c590` | Hover accent, focus ring |

Components never use the raw palette tokens. They use the **semantic** tokens (`--color-bg`, `--color-text`, `--color-accent`, …), so rebranding means editing a single block.

**Measured WCAG contrast:**

| Foreground → background | `#141312` (bg) | `#201e1c` (surface) |
| --- | --- | --- |
| Cream text `#f2ebdd` | 15.6 : 1 | 14.0 : 1 |
| Muted `#b7ac98` | 8.3 : 1 | 7.4 : 1 |
| Subtle `#918876` | 5.3 : 1 | 4.7 : 1 |
| Gold `#c9a66b` | 8.1 : 1 | 7.2 : 1 |
| Charcoal on gold button | 8.5 : 1 | — |

Every pair passes WCAG 2.2 AA for normal text.

### 2.2 Typography

- **Display:** Cormorant Garamond (400/500/600, plus italics), used for headings, dish names and prices. Italic gold `<em>` is the editorial accent.
- **Body/UI:** Manrope (400/500/600), used for paragraphs, navigation, buttons and labels. Labels are uppercase with wide tracking (0.16–0.28em).
- Both fonts use the SIL Open Font License and load from Google Fonts with `display=swap`. Self-hosting them is documented as an option for GDPR-sensitive deployments.
- The type scale is fluid: `--fs-xs` to `--fs-display`, built with `clamp()` so it scales smoothly between 320px and 1440px with no breakpoint jumps.

### 2.3 Space, layout and breakpoints

- The container is `min(100% − 2 × gutter, 76rem)`. The gutter is `clamp(1rem, …, 2.5rem)`, which is **exactly 16px at 320px**.
- Vertical rhythm: `--section-pad` grows fluidly from about 72px to 144px.
- Breakpoints are mobile-first and set in `em`, so they respect the user's font size:

| Name | Width | Used for |
| --- | --- | --- |
| base | 0 (320px target) | Single column. The wheel sits above the dish details. |
| `30em` | 480px | Reserve button appears in the header |
| `40em` | 640px | Larger wheel, two-column hero meta |
| `48em` | 768px | Hero parallax, scroll cue |
| `60em` | 960px | Wheel goes two-column (details left, wheel right) |
| `64em` | 1024px | Desktop navigation replaces the hamburger |

### 2.4 Motion principles

1. **Slow in, soft out.** The main curve is `--ease-out: cubic-bezier(.22, 1, .36, 1)`. Rotations use `--ease-wheel: cubic-bezier(.65, .05, .25, 1)`.
2. **Motion shows hierarchy.** Headline lines rise in sequence, then supporting text fades in. Nothing moves without a reason.
3. **Transform and opacity only** on anything that animates often, so animation stays on the compositor.
4. **Reduced motion is honoured everywhere.** Under `prefers-reduced-motion: reduce`:
   - Movement distances go to zero and rotations snap.
   - Parallax, the Ken Burns zoom and the logo hover rotation are off.
   - The mobile menu fades in place of its clip-path wipe, and the header shows and hides without sliding.
   - Autoplay does not start on its own.

   Short opacity fades stay, because they don't trigger vestibular problems.
5. **Failsafes.** Content hidden for an entrance animation becomes visible even if JavaScript fails. See §5.4.

---

## 3. File structure

```
TokaMD_Restaurant_Website/
├── index.html                  Semantic page shell and fallback content
├── assets/
│   ├── css/
│   │   ├── tokens.css          Design tokens: palette, type, space, motion
│   │   ├── base.css            Reset, typography, layout primitives, buttons, reveal utilities
│   │   ├── nav.css             Header, desktop navigation, mobile menu
│   │   ├── hero.css            Hero section
│   │   ├── wheel.css           Signature dish wheel
│   │   └── sections.css        Remaining sections and footer (Phase 3)
│   ├── js/
│   │   ├── content.js          ★ All editable content: the only file most buyers touch
│   │   ├── core/
│   │   │   ├── utils.js        DOM helpers, escaping, price formatting, image URLs
│   │   │   ├── bind.js         Writes content.js values into the page
│   │   │   └── reveal.js       Scroll-reveal observer
│   │   ├── components/
│   │   │   ├── nav.js          Header state, mobile menu, scrollspy
│   │   │   ├── hero.js         Headline lines, parallax
│   │   │   └── wheel.js        Signature dish wheel
│   │   └── main.js             Boot order and error isolation
│   └── img/
│       └── favicon.svg
└── docs/
    └── ARCHITECTURE.md         This file
```

Phase 6 adds `README.md`, `CUSTOMIZATION.md`, `LICENSE.txt`, deployment notes and asset credits.

### Why there are no ES modules

`<script type="module">` is blocked by CORS when a page is opened from `file://`. Many template buyers double-click `index.html` first, so a blank page would look like a broken product. Instead, every script is a small IIFE (an immediately invoked function) loaded with `defer`. Each one registers itself on a single global namespace, `window.Aurelia`. `defer` keeps the load order fixed and never blocks rendering.

---

## 4. Content model (`assets/js/content.js`)

`window.AURELIA_CONTENT` is the single source of truth for everything a restaurant would change: brand, contact details, hours, navigation, hero copy, dishes, menu, chef, gallery, testimonials, the reservation endpoint and the footer.

```js
window.AURELIA_CONTENT = {
  settings: { locale, currency, priceDecimals },
  brand:    { name, descriptor, tagline, established },
  contact:  { phone, phoneHref, email, address: { line1, line2 }, mapUrl },
  hours:    { summary, … },
  nav:      [{ label, href }],
  navCta:   { label, href },
  hero:     { eyebrow, titleLines: [], lead, primaryCta, secondaryCta, meta: [{ label, value }] },
  wheel:    { eyebrow, title, intro, autoplay, interval,
              dishes: [{ id, name, description, price, tags: [], pairing, image: { src, alt } }] },
  // Phase 3: about, signatures, menu, chef, experience, gallery, testimonials, reservation, footer
};
```

**Binding rules**

| Attribute in HTML | Effect |
| --- | --- |
| `data-bind="path.to.value"` | Sets `textContent` (always escaped). |
| `data-bind-html="path"` | Escaped text, then `*word*` becomes `<em>word</em>`. This is the only markup allowed. |
| `data-bind-href="path"` | Sets `href`. `javascript:` URLs are refused. |
| `data-render="nav"` | The container is filled from a collection. |

**Static fallback.** `index.html` ships with the same default text, so the page is still complete if JavaScript is off or `content.js` fails. Search engines see real content either way. The docs tell buyers to edit `content.js`, because it overrides the HTML defaults.

**Prices** are numbers formatted with `Intl.NumberFormat` using `settings.locale` and `settings.currency`. Strings such as `"Market price"` pass through unchanged.

**Images** are `{ src, alt, srcset? }`. For `images.unsplash.com` URLs, `srcset` is generated automatically (`w`, `h`, `fit=crop`, `auto=format`). Local images take an explicit `srcset` or a single `src`.

The **hero image** is the one exception: it is written directly in `index.html`. It is the Largest Contentful Paint element, so the browser has to find it while parsing the HTML, not after a script runs.

---

## 5. JavaScript architecture

### 5.1 Boot sequence (`main.js`)

```
<head> inline script: html.no-js → html.js and arm a 3s failsafe for .is-ready
defer:  content.js → utils.js → bind.js → reveal.js → nav.js → hero.js → wheel.js → main.js
main:   bind → hero → nav → wheel → reveal   (each one wrapped in try/catch)
        then (fonts ready OR 700ms) → requestAnimationFrame → html.is-ready (starts entrance animations)
```

Each component runs in isolation. If one throws, the error is logged and the rest of the site keeps working.

### 5.2 Conventions

- JavaScript selects elements only through `data-*` hooks (`data-wheel`, `data-nav-toggle`, …). Classes are for styling and states (`is-active`, `is-open`, `is-ready`). Restyling never breaks behaviour.
- All user-visible strings come from `content.js` or the HTML. JavaScript builds markup with escaped interpolation (`utils.escapeHtml`).
- Event listeners are passive where possible. Scroll work is batched with `requestAnimationFrame`.

### 5.3 Accessibility strategy

- Landmarks: skip link → `header` → `nav` (labelled) → `main` → `footer`. One `h1`, with headings in order.
- Visible `:focus-visible` ring (2px gold-300 with an offset) on every interactive element.
- Touch targets are at least 44 × 44px for primary controls (WCAG 2.5.5 AAA) and never below 24px (2.5.8 AA).
- **Mobile menu:** a disclosure button with `aria-expanded` and `aria-controls`. While the menu is open, `main` and `footer` are made `inert`, Tab is trapped as a fallback, Escape closes the menu and focus returns to the toggle, and page scrolling is locked.
- **Wheel:** see §6.4.
- Text-in-image is never used. Decorative images have `alt=""`.

### 5.4 Failsafes for hidden content

| Hidden state | Only applies when | Failsafe |
| --- | --- | --- |
| Hero headline lines below their mask | `.js:not(.is-ready)` | The inline head script adds `.is-ready` after 3 seconds no matter what |
| `[data-reveal]` elements | `.has-reveal`, a class added by `reveal.js` itself | If `reveal.js` never runs, nothing is hidden |
| Wheel UI (stage and controls) | Shown only once `wheel.js` adds `.dish-wheel.is-ready` after a successful start | No JS, a missing or broken `content.js`, or a `wheel.js` that fails all lead to the same result: once the page is `.is-ready`, the wheel UI is removed and a plain message with a menu link is shown in its place. You never see an empty stage or dead buttons. |
| Mobile hamburger | Shown only once `nav.js` adds `html.has-nav` | If `nav.js` fails, the toggle is hidden and the link list is shown inline instead (the same layout as no-JS) |

These states were tested in headless Chrome against broken copies of the project: `content.js` removed, `content.js` with a syntax error, `wheel.js` missing, and `nav.js` missing.

---

## 6. Signature dish wheel specification

### 6.1 Layout

| Viewport | Arrangement | Focal point (active plate) |
| --- | --- | --- |
| < 960px | Header → wheel → dish details → controls (stacked) | **Bottom (90°)**, right next to the details below it |
| ≥ 960px | Header, details and controls on the left; wheel on the right | **Left (180°)**, facing the details |

The focal angle is a CSS custom property (`--focal`) that changes in a media query. JavaScript never hard-codes a breakpoint. It reads `--focal` only to work out which drag direction maps to rotation.

### 6.2 Geometry

The stage is a size container (`container-type: inline-size`), so every measurement scales with it, from 288px up to 608px:

```
--n          number of dishes (set by JS)
--step       360deg / n
--plate      plate-ratio × 100cqi    (ratio 0.24 for 7 dishes, larger for fewer dishes)
--radius     50cqi − 0.62 × plate     (an enlarged active plate still fits inside the stage)
--rot        turn × step              (cumulative, never wrapped: always takes the shortest path)

track  transform: rotate(focal + rot)
item i transform: rotate(−i·step) translateX(radius) rotate(−(−i·step + focal + rot))
```

The last `rotate()` cancels out the track's rotation, so every photograph stays upright while the wheel turns. The track and the items transition with the **same duration and easing**. Because both interpolate in step, the counter-rotation holds exactly at every frame, without needing `@property`.

Dishes are laid out counter-clockwise. "Next" turns the wheel clockwise, so at the bottom focal point the next dish comes in from the right. That matches a left swipe and the → arrow key.

### 6.3 Inputs

| Input | Behaviour |
| --- | --- |
| Previous / Next buttons | Rotate one step. Wraps around and always takes the shorter direction. |
| Number tabs (01–07) | Jump straight to a dish along the shortest arc |
| Click a plate | Jump to that dish (pointer shortcut; keyboard users have the tabs) |
| Drag / swipe | The wheel follows the pointer live, then snaps to the nearest dish. A small flick still advances one dish. `touch-action: pan-y` keeps vertical page scrolling. |
| Keyboard (on the tabs) | ←/→ move and select with wrap-around; Home/End jump to the first and last dish |
| Autoplay | Optional (`wheel.autoplay`, `wheel.interval` ≥ 3.5s). A progress ring shows on the play/pause button. |

### 6.4 Accessibility (WAI-ARIA *tabbed carousel* pattern)

- The container is `role="group"` with `aria-roledescription="carousel"` and an `aria-label`.
- Tab order: **play/pause (first, as the pattern requires) → previous → next → tab list → active panel**. In the DOM the controls come before the panels. `grid-template-areas` keeps the panel visually above the controls.
- The tabs use `role="tablist"`/`tab` with a roving `tabindex` and `aria-selected`. Each tab controls its own `role="tabpanel"`. Panels contain no focusable content, so each one has `tabindex="0"`, as the APG tabs pattern recommends. Inactive panels are made `inert` immediately, so an outgoing panel that is still fading out can't receive focus or be read aloud.
- The plates are decorative and visual only (`aria-hidden`). All their information is in the panels.
- A polite live region announces "*Dish name, price. Dish 3 of 7.*" after button, swipe and plate actions. It stays silent during autoplay, so screen readers aren't interrupted.
- Autoplay **stops for good** when keyboard focus enters the carousel or when the user operates any control, and it restarts only when the user presses play. It **pauses temporarily** while the mouse hovers over the wheel, while the tab is hidden, and while the wheel is less than 35% visible.
- **Reduced motion:** autoplay does not start by itself, rotation snaps instantly, and panel text fades without moving.

### 6.5 Panel stacking

All dish panels share one grid cell. The inactive ones are `visibility: hidden`, which removes them from the accessibility tree and from focus but keeps them in the layout. The container is always as tall as the longest description, so **controls never jump** when the dish changes. This needs no measuring in JavaScript.

---

## 7. Performance budget

| Metric | Target |
| --- | --- |
| HTML + CSS + JS (uncompressed, own code) | < 120 KB |
| JavaScript executed at load | < 40 KB, no dependencies |
| LCP (hero image, 4G) | < 2.5 s: `fetchpriority="high"`, responsive `srcset`, preconnect to the image CDN |
| CLS | < 0.05: every image has `width`/`height` or `aspect-ratio`, and fonts use `swap` with metric-similar fallbacks |
| Below-the-fold images | `loading="lazy"`, `decoding="async"`, served at the right size via `srcset` |

---

## 8. Assets and licensing

| Asset | Source | Licence | Notes |
| --- | --- | --- | --- |
| Food and interior photography | Unsplash (`images.unsplash.com`, hotlinked) | [Unsplash License](https://unsplash.com/license): free for commercial use, attribution not required | **Demo content only.** The photos are not bundled in the download, and buyers are told to replace them with their own photography. Unsplash's licence does not allow reselling the photos as a stock collection, which is why they are hotlinked and not packaged. A credits list goes in Phase 6. |
| Cormorant Garamond, Manrope | Google Fonts | SIL Open Font License 1.1 | Free for commercial use, including embedding |
| Icons and monogram | Original inline SVG drawn for this template | Covered by the template licence | — |

All names, addresses, phone numbers (555 range) and email addresses (`.example` domain) are fictional. Testimonials will be clearly labelled as sample content.

---

## 9. Phase plan

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Architecture and design system (this document, tokens) | ✅ Done |
| 2 | Navbar, hero, working food wheel | ✅ Done |
| 3 | About, signature dishes, interactive menu, chef, experience, gallery, testimonials, reservation inquiry, contact and footer | ⏳ Next. Placeholder sections exist so the navigation anchors already work. |
| 4 | JavaScript hardening: menu filtering, gallery lightbox, reservation form with an endpoint guard, full accessibility audit | — |
| 5 | Testing across viewports and browsers, Lighthouse, optimisation | — |
| 6 | README, CUSTOMIZATION, LICENSE.txt, deployment guide, credits, packaging | — |

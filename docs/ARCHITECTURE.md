# Aurelia Dining — Architecture

This is the technical design of the template: plain HTML5, CSS3 and vanilla JavaScript, with no build step and no dependencies. It is written for developers maintaining or extending the template. Buyers should start with the README and CUSTOMIZATION.

---

## 1. Principles

| Principle | Consequence |
| --- | --- |
| **Content in one place** | `assets/js/content.js` is the single source. Pages render from it at runtime, and `tools/prerender.mjs` can bake the same output into the HTML. |
| **HTML is complete on its own** | Every page is full static HTML: content, navigation, titles and metadata. JavaScript enhances it. Failure modes are designed, not accidental (see §6). |
| **Works from `file://`** | Classic deferred IIFE scripts on a `window.Aurelia` namespace, not ES modules (browsers block modules from `file://`). |
| **Honest product** | The form never simulates success. Demo data, sample reviews and demo photos are labelled. |
| **Accessible by default** | WCAG 2.2 AA target, WAI-ARIA patterns for the carousel, tabs, disclosure and dialog, and reduced-motion support everywhere. |

## 2. Files

```
*.html                     8 pages; <body data-page="home|about|signature|menu|chef|gallery|reservations|contact">
assets/css/
  tokens.css               design tokens (palette, type, space, motion, reduced-motion overrides)
  base.css                 reset, typography, layout primitives, buttons, reveal utilities
  nav.css                  header, desktop nav, mobile menu, nav fallbacks
  hero.css                 home hero + .hero--page (inner pages)
  sections.css             shared sections: split, pillars, cards, testimonials, CTA band, footer
  wheel.css                signature wheel                    (index, signature)
  menu.css                 menu, filters, tasting             (index, menu)
  gallery.css              grid + lightbox                    (gallery)
  forms.css                reservation form, info cards, contact page (reservations, contact)
assets/js/
  content.js               ★ window.AURELIA_CONTENT
  core/utils.js            escaping, fill tokens, safeHref, prices/times, image URLs (Node-safe)
  core/render.js           renderer registry + generic renderers (nav, title-lines, paragraphs, hours…)
  core/bind.js             data-bind / -html / -href / -img
  core/seo.js              per-page meta, canonical, schema.org JSON-LD
  core/reveal.js           scroll reveals
  components/sections.js   renderers: signature cards, experience, pillars, testimonials, gallery strip…
  components/menu.js       menu renderers + filters
  components/gallery.js    gallery renderer + lightbox
  components/reservation.js  <option> renderers + inquiry form
  components/wheel.js      signature wheel
  components/nav.js        header behaviour, mobile menu, current page
  components/hero.js       parallax
  main.js                  boot order + error isolation
tools/prerender.mjs        bake content.js into the HTML (optional for buyers)
tests/                     static + browser suites (source repo only, not in the release)
```

Each page loads only the CSS and JS it needs. `main.js` skips modules that aren't present.

## 3. Content pipeline

```
content.js ──► render registry (pure functions: content, opts, ctx → HTML string)
          │        ├─ browser: main.js → render.all() fills every [data-render] region (ctx.runtime = true)
          │        └─ Node:   tools/prerender.mjs fills the same regions in the files (ctx.runtime = false)
          └──► bind.js resolve()  → data-bind / data-bind-html / data-bind-href / data-bind-img
               seo.js meta()/schema() → <title>, meta tags, canonical, JSON-LD
```

- **Region markup:** `<ul data-render="nav" data-variant="mobile"><!--r--> … <!--/r--></ul>`. The comment markers let the prerender tool replace a region's contents without an HTML parser.
- **Runtime-only output:** renderers return different markup where interactivity needs JavaScript. Menu filter buttons are emitted only at runtime. Gallery thumbnails are `<button>`s at runtime (when `<dialog>` is supported) and plain `<figure>`s in the static HTML. That way there are never dead controls.
- **Escaping:** every content string passes through `utils.text` (escape plus brand tokens) or `utils.inlineMarkup` (escape, then `*em*`). Links go through `safeHref`, which allows relative paths, `#`, `http(s)`, `mailto`, `tel` and `sms`. JSON-LD is serialised with `<` escaped.
- **Brand tokens:** `{name}`, `{descriptor}`, `{fullName}`, `{phone}`, `{email}` and `{established}` are filled in everywhere: text, titles, metadata and alt text.

## 4. Design system

Tokens are in `assets/css/tokens.css`. Components only use **semantic** tokens (`--color-bg`, `--color-accent`, …).

| Pair | Contrast |
| --- | --- |
| Cream `#f2ebdd` on page `#141312` | 15.6 : 1 |
| Muted `#b7ac98` on page | 8.3 : 1 |
| Subtle `#918876` on surface `#201e1c` | 4.7 : 1 (lowest text pair) |
| Gold `#c9a66b` on page | 8.1 : 1 |
| Charcoal on gold button | 8.5 : 1 |
| Form error `#f0a28c` on page | ≈ 8.6 : 1 |

- **Type:** Cormorant Garamond (display) and Manrope (body), on a fluid `clamp()` scale.
- **Breakpoints:** em-based: 30em (header CTA), 40em, 48em, 56em (split layouts), 60em (wheel two-column), 64em (desktop nav).
- **Gutter:** exactly 16px at 320px wide.

**Motion:**
- Transform and opacity only.
- `--ease-out` for entrances, `--ease-wheel` for rotation.
- Under `prefers-reduced-motion: reduce`:
  - Distances are zero and the wheel snaps.
  - The hero zoom, parallax, menu wipe and logo spin are all off.
  - Autoplay never starts by itself.
  - Short opacity fades remain.

## 5. Components

### Header (`nav.js`)
- Fixed, and always visible: it never hides while scrolling. It is transparent over the hero; once the page scrolls past `SOLID_AFTER = 24px` it switches to a blurred, solid background (`is-scrolled`).
- `scroll-padding-top: var(--nav-height)` keeps anchor targets and focused elements clear of the header.

**Mobile menu** (a disclosure pattern):
- `aria-expanded` and `aria-controls`.
- While it is open: `main`, `footer` and the skip link are made `inert`, Tab is trapped (a JavaScript fallback), Escape closes it with focus returned to the toggle, and page scroll is locked.
- The menu is `inert` the moment it closes. Any header link closes it.
- `html.has-nav` is set only after successful start-up; until then the CSS shows an inline link list in place of a dead toggle.
- **Current page:** the nav renderer adds `aria-current="page"`, using `content.nav[].page` and `body[data-page]`. `nav.js` does the same for the header CTA.

### Signature wheel (`wheel.js`, `wheel.css`)
- **Geometry:** the stage is a size container. `--cq` resolves to `1cqi`, with a fixed-size fallback under `@supports not`.
  - `--plate = ratio × 100cq` and `--radius = 50cq − 0.62 × plate`.
  - The track rotates by `--focal + --rot`.
  - Each item counter-rotates with the same duration and easing, so photos stay upright in every frame (verified by test).
  - `--focal` is 90° (bottom) on mobile and 180° (left) at 60em and above.
- **State:** `turn` (cumulative) and `index ≡ turn mod n`. `goTo` takes the shortest arc.
- **A11y:** WAI-ARIA tabbed carousel.
  - Tab order: play/pause → previous → next → tablist (roving `tabindex`) → active `tabpanel` (`tabindex=0`).
  - Inactive panels are `inert`. A polite live region announces changes from buttons, swipes and plate clicks, never from autoplay.
- **Pointer:** one primary pointer only. A press becomes a drag after 8px; vertical touch gestures go to the page (`touch-action: pan-y`). The drag ends on `pointerup`, `pointercancel`, the stage's own `lostpointercapture`, or window blur.
- **Autoplay:** `playing` (the user's intent) is kept separate from `suspended` (hover, hidden tab, off-screen, drag). It runs only when the stage is at least 35% visible (`intersectionRatio`), or fills 60% of a short viewport.
  - Any user navigation stops it. So do keyboard focus moving onto a control and focus inside a panel. The autoplay timer also refuses to rotate away from a focused panel.
  - Play is the explicit way to restart. The progress ring runs on the Web Animations API.
- **Images:** `sizes` is derived from the real stage width (gutters and desktop grid), with 240–640w candidates.
- **Fallback:** the wheel is shown only after `.dish-wheel.is-ready`. Otherwise it shows a message with a link to `menu.html`.

### Menu (`menu.js`)
Categories are `<section id="{category.id}">`. Filters are `aria-pressed` toggle buttons in a labelled group, announced through a live region. The URL hash is kept in sync (`replaceState`), and `#hash` deep links and `hashchange` apply the matching filter.

### Gallery and lightbox (`gallery.js`)
- A native modal `<dialog>`: the background is inert and focus is contained.
- Escape (native `cancel`) and the close button close it, and focus returns to the thumbnail that opened it.
- ←/→/Home/End, the previous/next buttons and horizontal swipes all navigate. Changes are announced.
- Page scroll is locked while it's open. Neighbouring photos are preloaded. If an image fails, an error message is shown.

### Reservation form (`reservation.js`)
- Validation runs on submit and live after the first attempt. The error summary is focused and lists each problem as a link to its field. Fields get `aria-invalid` and `aria-describedby` → error text.
- **Rules:** required fields, email format, a 7–15 digit phone number, date from tomorrow up to `bookingWindowDays` ahead, closed weekdays, party size up to `maxPartySize` (larger groups are told to phone), notes ≤ 500 characters.
- **Submission:**
  - The endpoint must pass `isSafeEndpoint` (https only; http only for localhost).
  - With no endpoint: an informational message, contact links and a pre-filled `mailto:` link. Nothing is sent.
  - With an endpoint: a `fetch` POST of FormData with a 15s timeout. Only a 2xx response shows the success panel ("not a confirmation"). Errors leave the form intact.
- A spam-trap field is stripped before sending.

### SEO (`seo.js`)
- **Per-page metadata:** `pages.<page>.title` and `description` populate the title, description, Open Graph and Twitter tags. The social image is a 1200×630 crop.
- **Canonical URL:** `<link rel="canonical">` and `og:url` are written only when `site.url` is an https URL.
- **Structured data:** a schema.org `Restaurant` JSON-LD block on Home and Contact. It holds the name, description, cuisine, price range, phone, email, address and opening hours (from `hours.schema`, validated). When the site URL is set it also includes the url, menu and `acceptsReservations`.

## 6. Failure modes (all tested)

| Failure | Result |
| --- | --- |
| JavaScript disabled | The static HTML has all the content. The hero is visible, the wheel shows a message, the menu shows every category, the gallery shows plain photos, the form is replaced by phone/email, and navigation is an inline list. |
| `content.js` syntax error or missing | `main.js` skips content-driven modules. The baked HTML stays; the wheel and form show their messages. |
| A component script missing or throwing | `main.js` isolates each module. Its fallback CSS takes over once `html.is-ready` is set (by `main.js`, or by the head failsafe after 3s). |
| Image fails | Wheel plates show the dish's initial letter; the lightbox shows "This photo could not be loaded." |
| Fonts fail | Georgia/Palatino and system sans-serif |

## 7. Performance notes

- Own code per page (HTML + CSS + JS, uncompressed) is 139–209 KB. The home page is the heaviest, because it carries the wheel and the menu preview. Typical gzip ratios for text bring that to roughly a quarter.
- No third-party JavaScript. One render-blocking font stylesheet (Google Fonts) and 6–7 small local stylesheets; HTTP/2 makes this cheap, and they could be concatenated if wanted.
- The hero image has `fetchpriority="high"` and a responsive `srcset`; everything else is `loading="lazy"` and `decoding="async"` with explicit dimensions.
- Scroll handlers are passive and throttled with `requestAnimationFrame`. Hero parallax detaches its scroll listener once the hero leaves the screen. The autoplay timer stops when off-screen or the tab is hidden.
- No performance scores (Lighthouse, LCP, CLS) have been measured. Measure on the deployed site.

# Browser support & testing

## Support policy

**Fully supported:** the current and previous major versions of Chrome, Edge, Firefox and Safari (macOS and iOS), plus Samsung Internet. In practice that means browsers released from about 2023 onwards.

**Older browsers** still get all the content, a working layout, working links and the forms' contact alternatives. Some enhancements degrade as described below.

| Feature used | Needed for | Fallback when missing |
| --- | --- | --- |
| Container query units (`cqi`) | Wheel geometry scaling with its stage | `@supports not (width: 1cqi)` gives the stage a fixed, viewport-based size |
| `inert` | Hiding the page behind the mobile menu; inactive wheel panels | The mobile menu also traps Tab in JavaScript; inactive panels are additionally `visibility: hidden` |
| `<dialog>` + `showModal()` | Gallery lightbox | Thumbnails render as plain, non-interactive photos (no dead buttons) |
| Pointer Events | Wheel drag/swipe, lightbox swipe | Buttons, tabs and keyboard still work |
| IntersectionObserver | Scroll reveals, pausing autoplay off-screen, parallax idling | Everything is shown at once; autoplay runs without the visibility pause |
| Web Animations API | Autoplay progress ring | No ring animation; autoplay itself still works |
| `Intl.NumberFormat` / `DateTimeFormat` | Prices and times | Plain numbers (never throws) |
| JavaScript disabled or failing | — | Every page is complete static HTML. The wheel and form show a message with phone/email; the menu shows every category; the gallery shows plain photos; navigation shows as an inline link list. |

## What was tested, and how

The test suites ship in `tests/` with the source (they are **not** part of the buyer download). They need Node.js 22+ and Chrome or Edge, and no npm packages.

```
node tests/static-checks.mjs     # 173 checks, no browser
node tests/browser.mjs           # 152 behaviour checks in headless Chrome/Edge
CHROME_PATH="…/msedge.exe" node tests/browser.mjs    # same suite in Edge
```

**Browsers actually run for v1.0.0:**

| Browser | Version | Result |
| --- | --- | --- |
| Chrome (headless, Windows 11) | 156 | 152 / 152 passed |
| Microsoft Edge (headless, Windows 11) | 157 | 152 / 152 passed |

**Not tested** (these browsers were unavailable in the test environment):
- Firefox, desktop and Android
- Safari on macOS and iOS
- Samsung Internet
- Real touch devices and real screen readers (NVDA, JAWS, VoiceOver, TalkBack)

These should be checked by hand before the template goes on sale (see the checklist below).

**Covered by the automated suites:**
- **Static:**
  - JavaScript syntax, CSS brace balance and undefined CSS variables.
  - Every local asset and internal link, including `#anchors`.
  - Duplicate IDs, ARIA and `for=` references, dead `#` links.
  - One `h1`, a unique title and a description per page; `alt` on every image.
  - Edge cases for the price, URL and endpoint helpers, including XSS escaping and the JSON-LD `</script>` breakout.
  - Renaming the brand leaves no trace of the old name; the HTML is in sync with `content.js`.
- **Navigation:** `aria-current` on every page, real clicks on every navigation link, the logo, hero call-to-action targets and contact links.
- **Header:** stays fixed and visible through long scrolls in both directions on every page, turns solid once scrolled, and `#anchor` targets land below it.
- **Mobile menu:** inert background, focus trap, Escape, focus return, header links closing the overlay.
- **Wheel:**
  - Content shown in the panel, previous/next and wraparound, shortest-path rotation, tabs, and Arrow/Home/End/Enter/Space.
  - Tab order to the panel, and photos staying upright during rotation.
  - Ten rapid clicks, a plate click, multi-pointer and cancelled drags.
  - A focused panel is never rotated away; autoplay respects the 35% visibility threshold.
  - Malformed price settings; reduced motion at load and when it changes.
  - Swipe left versus a vertical drag; 1, 2, 3, 5 and 12 dishes.
- **Menu:** filter toggling, keyboard operation, `#hash` deep links, price formatting.
- **Lightbox:** opening, focus, alt text and captions, keyboard and button navigation, wraparound, announcements, focus trapping, Escape and focus return, fit at 375px.
- **Form:**
  - The not-configured notice and error summary, plus closed-day, same-day, large-party and format errors.
  - No network request without an endpoint; honest server-error and 2xx success states (intercepted); non-https endpoints refused.
- **Fallbacks:** broken `content.js`, missing `wheel.js`, `nav.js` or `gallery.js`, JavaScript disabled, a failed photo.
- **Responsive:**
  - All 8 pages at 320, 375, 768, 1024 and 1440 px, plus 812×375 landscape: no horizontal overflow, and header items fit without overlapping.
  - 200% text at 640 px and 150% text at 375 px.
- **Accessibility basics:** accessible names, nothing focusable inside `aria-hidden`, heading order, landmarks, target sizes, visible focus ring.

**Limitations of the automated tests:**
- Real touch page-scrolling over the wheel cannot be simulated in headless Chrome. The tests confirm instead that a vertical drag never rotates the wheel and that the stage declares `touch-action: pan-y`.
- Screen-reader output is not tested. The tests verify the ARIA wiring the output depends on.
- No Lighthouse or Core Web Vitals scores were measured. No performance figures are claimed.

## Manual checklist before selling

- [ ] Safari on iOS: swipe the wheel; scroll the page over the wheel; open the menu and lightbox; use the date picker.
- [ ] Firefox: wheel rotation stays smooth and photos stay upright; the lightbox works.
- [ ] VoiceOver or NVDA: wheel tabs and panels, menu filters, lightbox, form errors.
- [ ] Windows High Contrast (forced colours): focus and selected states remain visible.
- [ ] Run Lighthouse on the deployed site and fix anything it reports.

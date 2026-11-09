# Aurelia Dining — Restaurant Website Template

**Version 1.0.0** · by TokaMD · plain HTML5, CSS3 and vanilla JavaScript

Aurelia Dining is a premium, editorial restaurant website: charcoal backgrounds, cream type and muted gold accents. Its signature feature is a rotating food wheel. It needs no framework, no build step and no npm install. Open `index.html` and it works, both from your computer and on any static host.

> **Demo content.** Every name, address, phone number, price, review and person on the site is fictional. The photos are Unsplash demo images loaded from Unsplash's servers. They are **not included** in the download, and you should replace them with your own photography. See [CREDITS.md](CREDITS.md).

---

## What's included

| Page | What's on it |
| --- | --- |
| `index.html` | Hero, the signature food wheel, and previews of the story, the dining experience, the menu, the chef and the gallery. Also sample reviews and a reservation call-to-action. |
| `about.html` | The restaurant's story, three values, the room and its key facts, dining experiences and sample reviews |
| `signature.html` | The food wheel plus detailed signature-dish cards |
| `menu.html` | The full menu with **category filters** (deep links such as `menu.html#desserts`), a dietary key and the tasting menu |
| `chef.html` | The chef's profile, a quote, kitchen principles and a kitchen photo |
| `gallery.html` | A photo grid with an **accessible lightbox**: keyboard controls, swipe, focus return |
| `reservations.html` | A reservation **inquiry** form with full validation. It sends only when you configure an endpoint. |
| `contact.html` | Address and directions link, phone, email, opening hours, getting here, and a map card |

**Every page also has:**
- **A fixed header.** It stays at the top of the screen the whole time you scroll, turning into a solid bar once you leave the hero.
- **An accessible mobile menu.**
- **A matching footer.**
- **Scroll reveals.**
- **Reduced-motion support.**

### The signature wheel
- **5–7 dishes recommended** (1–12 supported). Each shows its name, description, price, tags and a pairing.
- **Controls:** previous/next buttons, numbered tabs, clicking a plate, drag on desktop, swipe on phones, and the keyboard (←/→, Home, End, Enter, Space, Tab).
- **Gentle autoplay.** It pauses on hover, while the wheel is off-screen and while the browser tab is hidden. It stops for good when a visitor interacts or moves keyboard focus into the wheel, and it never starts on its own for people who prefer reduced motion.
- **Accessible.** It follows the WAI-ARIA *tabbed carousel* pattern and announces dish changes to screen readers.

---

## Quick start

1. Unzip and open **`index.html`** in a browser.
2. Edit **`assets/js/content.js`**: name, contact details, hours, dishes, menu, gallery, chef and reviews. Save and reload.
3. *(Recommended)* Run `node tools/prerender.mjs` to copy that content into the HTML files. Social-media previews and search engines read the HTML directly, so this keeps them up to date. It needs [Node.js](https://nodejs.org) 18 or later, and nothing else.
4. Replace the demo photos (see **CUSTOMIZATION.md → Images**).
5. Turn on the reservation form, or leave it off (see **CUSTOMIZATION.md → Reservation form**).
6. Deploy (see **DEPLOYMENT.md**).

Full guide: **[CUSTOMIZATION.md](CUSTOMIZATION.md)**.

---

## Folder structure

```
index.html … contact.html      8 pages (static HTML, complete without JavaScript)
assets/
  css/   tokens.css            ← colours, fonts, spacing, motion (edit to rebrand)
         base.css nav.css hero.css sections.css wheel.css menu.css gallery.css forms.css
  js/    content.js            ← ALL editable content
         core/      utils, render, bind, seo, reveal
         components/ nav, hero, wheel, sections, menu, gallery, reservation
         main.js               boot order + error isolation
  img/   favicon.svg
tools/prerender.mjs            optional: bake content.js into the HTML
docs/ARCHITECTURE.md           how it all fits together
```

---

## Honest by design

- **The form never fakes success.** With no endpoint configured, it validates the details and then explains that online sending is off. It offers the phone number, the email address and a pre-filled email. With an endpoint, only a real 2xx response counts as sent, and even then the message says *inquiry*, not *booking*.
- **Reviews are labelled.** Sample testimonials carry a visible "Sample reviews" label and a disclaimer.
- **Demo data is flagged.** A note in the footer says that all names, contact details, prices, reviews and people are placeholders. Remove it in `content.js → footer.note` once your real content is in.

---

## Quality

- **Accessibility (WCAG 2.2 AA target):**
  - Semantic landmarks, one `h1` per page and a skip link.
  - Visible focus rings and labelled controls.
  - Focus is managed in the menu and the lightbox, and the form has an error summary.
  - Reduced motion is supported, and large text works without horizontal scrolling.
- **Resilience.** If JavaScript is off, `content.js` has a typo, or a script fails to load, every page still shows its content. The wheel and form show a plain message with alternatives instead of dead buttons.
- **Performance.**
  - Responsive images, with `srcset` widths computed from the real layout.
  - Lazy loading below the fold, and a high-priority hero image.
  - No third-party scripts.
- **Security.** All content is HTML-escaped. Links with unsafe schemes are refused. The form endpoint must use https. There are no keys or secrets anywhere.

Tested in Chrome and Edge. See **[BROWSER-SUPPORT.md](BROWSER-SUPPORT.md)** for exactly what was tested and what wasn't.

---

## Documents

| File | For |
| --- | --- |
| [CUSTOMIZATION.md](CUSTOMIZATION.md) | Changing content, branding, images, colours, fonts and the form |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Hosting, your domain, canonical URLs, forms, fonts, security headers |
| [BROWSER-SUPPORT.md](BROWSER-SUPPORT.md) | Supported browsers, fallbacks, test coverage |
| [CREDITS.md](CREDITS.md) | Photo and font sources and licences |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [LICENSE.txt](LICENSE.txt) | Template licence |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical design |

## Support

[SELLER: insert your support channel, response time and the version range covered. See LICENSE.txt section 7.]

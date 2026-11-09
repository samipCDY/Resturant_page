# Customization guide

Almost everything you will change lives in **`assets/js/content.js`**. Edit it, save, and reload the page.

> **The one-command extra step.** Browsers always read `content.js`. Social networks (Facebook, LinkedIn, WhatsApp, Slack) and some search crawlers read the raw HTML instead, without running JavaScript. After editing `content.js`, run:
>
> ```
> node tools/prerender.mjs
> ```
>
> This writes your content into all 8 HTML files: titles, descriptions, social tags, navigation, text, menu, gallery and the footer. It needs Node.js 18+ and changes nothing else. `node tools/prerender.mjs --check` tells you whether the HTML is out of date.
>
> **No Node.js?** The site still works and shows your content to visitors. Only link previews, and visitors with JavaScript turned off, will see the old text until you edit the HTML by hand. See the list at the end of this guide.

---

## 1. Rules for `content.js`

- It is a JavaScript object, so keep the quotes, commas and brackets. A missing comma breaks the file. The site then falls back to the text baked into the HTML, and the browser console says `content.js did not load`.
- **Plain text only.** HTML you type is shown as text, never run.
- **Emphasis:** in fields marked `(*em*)`, wrap words in asterisks (`"Seven plates, *one table*."`) to show them in gold italics.
- **Brand tokens** work in any text: `{name}`, `{descriptor}`, `{fullName}`, `{phone}`, `{email}` and `{established}`. Change `brand.name` once and every sentence using `{name}` follows.
- **Links** can be relative pages (`menu.html`), anchors (`#top`), or `https:`, `mailto:` and `tel:` links. Other schemes, such as `javascript:` and `data:`, are refused.
- **Prices:** numbers (`48`, `16.5`) are formatted with your currency. Text (`"Market price"`, `"From $14"`) is shown as written.

## 2. Field reference

| Section | What it controls |
| --- | --- |
| `settings` | `locale` (number, date and time format), `currency` (an ISO code such as `USD`, `EUR` or `GBP`), and `priceDecimals` (0–4). Invalid values fall back safely and print a warning in the console. |
| `site.url` | Your live address, for example `https://www.example.com/`. It turns on canonical URLs, `og:url` and absolute URLs in structured data. **Leave it empty until you know the URL.** |
| `site.structuredData` | `true` adds schema.org *Restaurant* data (name, address, hours, cuisine, price range) to Home and Contact. It is built only from the values you enter. |
| `site.socialImage` | The image used when a page is shared (1200×630 crop). |
| `brand` | Name, descriptor ("Dining"), tagline, year established, cuisine list, price range |
| `contact` | Phone (both the display text and `phoneHref`), email (display and `emailHref`), a structured `address`, an optional `mapUrl`, and `directions` |
| `hours` | `summary` (header, menu and CTA), `days` (the tables), `note`, and `schema` (24-hour times for search engines; keep these in step with `days`) |
| `nav`, `navCta` | Menu labels and links. `page` must match the `<body data-page="…">` value of the target page so the current page is highlighted. `mobileOnly: true` hides an item from the desktop bar. |
| `pages.<page>` | Each page's `title` and `description` (browser tab, search results, shares), plus the hero `eyebrow`, `heading` (lines, `*em*`) and `lead` |
| `hero` | Home hero: eyebrow, headline lines, lead, two buttons, info strip |
| `wheel` | The signature wheel: heading, intro, `autoplay`, `interval` (ms, minimum 3500) and `dishes` (5–7 recommended, 1–12 supported) |
| `about` | Story text, image, values, and the room (text, image, facts) |
| `experience` | The three experience cards (Home and About) |
| `signatureCards` | Heading for the dish cards on the Signature page |
| `menu` | `categories` (each with an `id` used for filters and `#links`, a `label` and `items`), `legend`, `allergyNote` and `tasting`. Items marked `featured: true` appear on the homepage. |
| `chef` | Name, role, portrait, bio, quote, principles, kitchen photo |
| `gallery.items` | Gallery photos: `src`, `alt` (a description), `caption`, and optionally `wide` or `tall` for layout |
| `testimonials` | Reviews plus the **label and disclaimer**. Only publish real reviews you have permission to use, then update the label and disclaimer. |
| `ctaBand` | The reservation band near the bottom of most pages |
| `reservation` | The form: see section 5 |
| `footer` | `note` (the demo-content notice; set it to `""` once your content is real) and `credit` |

## 3. Images

Each image is `{ src, alt }`. Write `alt` as a short description of what the photo shows ("Seared beef fillet with charred broccolini"). Purely decorative images are handled in the HTML.

**Using your own photos:**
1. Put the files in, for example, `assets/img/dishes/` (JPEG or WebP, roughly 1600 px on the long side for heroes and 800 px for dishes).
2. Point to them: `image: { src: "assets/img/dishes/fillet.jpg", alt: "…" }`.
3. Optionally add sizes: `srcset: "assets/img/dishes/fillet-480.jpg 480w, assets/img/dishes/fillet-960.jpg 960w"`.

Unsplash URLs get responsive sizes automatically. Local files are used as given, so export sensibly sized images.

**Recommended shapes:**

| Image | Shape |
| --- | --- |
| Wheel dishes | **Square, top-down** plated food |
| About and Chef portraits | 4:5 |
| Experience cards | 4:3 |
| Gallery | Any shape; mark wide shots `wide: true` and tall ones `tall: true` |

**Hero images** (the large photo at the top of each page) are written directly in each HTML file, inside `<section class="hero …">` in the `<img class="hero__img" …>` tag. This is deliberate: the browser can then start downloading the most important image immediately. Change `src` and the `srcset` URLs there.

## 4. Colours, fonts and spacing

Open **`assets/css/tokens.css`**:
- **Palette.** Change the `--c-*` values, or point the semantic tokens (`--color-accent`, `--color-bg` and so on) at new colours. Keep text contrast at 4.5:1 or above. The defaults are documented in `docs/ARCHITECTURE.md`.
- **Fonts.** Change `--font-display` and `--font-body`, then update the Google Fonts `<link>` in the `<head>` of every page, or self-host the fonts (see DEPLOYMENT.md).
- **Type scale, spacing and motion.** `--fs-*`, `--space-*` and `--dur-*`. Reduced-motion overrides are at the bottom of the file.

## 5. Reservation form

By default `reservation.endpoint` is `""`, which means **online sending is off**. The form still validates everything, then tells the guest it can't send and offers your phone number, your email and an "Email these details" button. Nothing is ever shown as booked.

**To switch it on:**
1. Create a form endpoint that accepts a `POST` of form data and returns a 2xx status code. Options include a hosted form service (for example Formspree, Basin or Getform) or your own server.
2. Paste its **https** URL into `reservation.endpoint`. Plain `http` is refused, except `localhost` for testing.
3. Send a test inquiry and check that it arrives.

**Fields sent:** `date`, `time`, `guests`, `occasion`, `name`, `email`, `phone`, `notes`. A hidden spam-trap field (`company`) is removed before sending.

**Your responsibilities on the server side** (no front-end form can do these for you):
- **Validate everything again on the server.** Browser checks can be bypassed.
- **Spam protection.** Use rate limiting or a CAPTCHA if you get spam. The built-in trap is basic.
- **Privacy.** Guests' names, emails and phone numbers are personal data. Add a privacy notice, and store and delete the data in line with your local law (for example GDPR or CCPA).
- **Reply to every inquiry.** The page promises a reply: see `reservation.responseTime` and the `messages`.
- **Never put API keys or secrets in `content.js`.** Everything in that file is public.

**Other settings:** `maxPartySize`, `bookingWindowDays`, `closedWeekdays` (0 = Sunday), `times`, `occasions`, `policy` and all `messages`. Same-day requests are directed to the phone on purpose.

## 6. Common tasks

| Task | How |
| --- | --- |
| Rename the restaurant | `brand.name` and `brand.descriptor`, then run `node tools/prerender.mjs`. Also update the email and domain in `contact`. |
| Change the hours | Update `hours.days` and `hours.schema` together (plus `hours.summary`) |
| Add a menu category | Add `{ id: "brunch", label: "Brunch", items: [ … ] }` to `menu.categories`. Its filter button and `menu.html#brunch` link appear automatically. |
| Turn off wheel autoplay | `wheel.autoplay: false` (the Play button disappears) |
| Use 5 wheel dishes | Delete entries from `wheel.dishes`. Plate sizes adapt automatically. |
| Hide the demo notice | `footer.note: ""` |
| Turn off structured data | `site.structuredData: false` |

## 7. Things that live in the HTML (not `content.js`)

`tools/prerender.mjs` updates all content-driven parts. These items are fixed HTML that you edit by hand when needed:

- **Hero photos** on each page (`<img class="hero__img">`).
- **Section labels** that aren't content: "Opening hours", "Getting here", "Prefer to talk?", "Good to know", "Your visit", "Your details", form field labels, "Reservation inquiry", "Find us", "Explore / Visit / Contact / Hours" in the footer, and button labels such as "View the full menu", "Read our story", "Meet the chef", "View the gallery" and "All signature dishes".
- The Contact page's card notes ("For tables tonight…").
- The `theme-color` meta tag and the favicon (`assets/img/favicon.svg`).
- **Without running prerender:** every text inside `data-bind` and `data-render` elements, plus `<title>` and the meta tags, keeps the old text in the raw HTML. Visitors still see the new content via JavaScript.

## 8. Adding a page

1. Copy an inner page, for example `chef.html`, and rename it.
2. Change `<body data-page="…">` to a new key, such as `events`.
3. Add `pages.events` (title, description, eyebrow, heading, lead) to `content.js`, and a `nav` entry with `page: "events"`.
4. Replace the content inside `<main>`, keeping the page hero.
5. Run `node tools/prerender.mjs`.
6. Add the page to the `PAGE_FILES` list at the top of `assets/js/core/seo.js` so canonical URLs work.

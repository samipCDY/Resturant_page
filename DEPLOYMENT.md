# Deployment

The site is static: HTML, CSS, JS and images. There is no server code, no build step and no database. Upload the folder to any static host.

## Before you go live — checklist

- [ ] All demo content is replaced in `assets/js/content.js`. This includes the testimonials, chef persona, prices, address and phone number.
- [ ] Every Unsplash demo photo is replaced with your own. You must not resell or redistribute the demo photos (see CREDITS.md).
- [ ] `footer.note` is set to `""` (it removes the demo notice).
- [ ] `site.url` is set to your real address, for example `"https://www.yourrestaurant.com/"`.
- [ ] The reservation form is either connected to an https endpoint and tested, or deliberately left off (see CUSTOMIZATION.md §5).
- [ ] You have run `node tools/prerender.mjs`, so titles, social previews, canonical URLs and structured data are written into the HTML.
- [ ] Every page has been opened on a phone and a desktop.

## Hosting options

Any of these works. Upload the **contents** of the folder, so that `index.html` sits at the site root.

| Host | Steps |
| --- | --- |
| **Netlify** | Drag the folder onto app.netlify.com → *Sites* → "Deploy manually". |
| **Cloudflare Pages** | *Workers & Pages* → *Create* → *Pages* → upload assets. |
| **Vercel** | `vercel deploy` in the folder, or import a Git repository. Framework preset: *Other*. No build command. |
| **GitHub Pages** | Push to a repository → *Settings* → *Pages* → deploy from branch, folder `/` (root). |
| **cPanel / FTP** | Upload everything into `public_html/` (or your domain's web root). |

Every link and asset path is **relative**, so the site also works in a subfolder (for example `example.com/restaurant/`) and when opened straight from disk.

## Domain, HTTPS and canonical URLs

- Use HTTPS. All the hosts above provide it free.
- Set `site.url` in `content.js`, then run `node tools/prerender.mjs`. Each page then gets `<link rel="canonical">` and `og:url` pointing at its own address (`/`, `/about.html`, …), and the structured data gets absolute `url`, `menu` and `acceptsReservations` links.
- **If your host serves "clean URLs"** (`/about` without `.html`), canonical URLs still point at `about.html`, which serves the same page. To prefer the clean form, edit `PAGE_FILES` in `assets/js/core/seo.js` (for example `about: "about"`) and run prerender again.
- Pick one host name (with or without `www`) and redirect the other one to it in your host's settings.

## Reservation form endpoint

See CUSTOMIZATION.md §5. The endpoint must use https and accept a cross-origin `POST` of `multipart/form-data` with `Accept: application/json`. If you run your own server, return `Access-Control-Allow-Origin` for your domain. Treat a 2xx status as success.

## Fonts: Google Fonts or self-hosted

The pages load Cormorant Garamond and Manrope from Google Fonts. Both use the SIL Open Font License. This sends visitors' IP addresses to Google, which some EU data-protection authorities consider to need consent. To self-host instead:

1. Download the font files, for example as WOFF2 via a font helper tool or the fonts' official repositories.
2. Put them in `assets/fonts/` together with each font's `OFL.txt` licence file. The OFL requires the licence to accompany redistributed font files.
3. Add `@font-face` rules at the top of `assets/css/tokens.css`.
4. Remove the two `fonts.g…` preconnect lines and the Google Fonts `<link>` from every page's `<head>`.

If the fonts fail to load, the site falls back to Georgia/Palatino and system sans-serif, and the layout still holds.

## Images

- The demo photos are hotlinked from `images.unsplash.com` and are for demonstration only. **Replace them before launch.**
- For your own photos, export JPEG or WebP at sensible sizes: about 1600–2200 px wide for heroes, about 800 px for dish and gallery photos, and compress them. The templates request images in the sizes they need through `srcset`.
- Once your images are local, you can delete the `<link rel="preconnect" href="https://images.unsplash.com">` line from each page.

## Caching

- Cache `assets/` for a long time, for example `Cache-Control: public, max-age=31536000`. If you do, rename files or add a query string (`main.js?v=2`) when you change them.
- Keep HTML short-lived, for example `max-age=300` or `no-cache`.
- If you edit `content.js` often, give it a short cache too.

## Security headers (optional, recommended)

There is one small inline script, in each page's `<head>`. It switches `no-js` to `js`, and every page carries the identical script. A starting Content Security Policy:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'sha256-WFUFkv1Uya4KMUSYDRRoLOqsrHldTL8W57YtouuAtjk=';
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src https://fonts.gstatic.com;
  img-src 'self' https://images.unsplash.com data:;
  connect-src 'self' https://YOUR-FORM-ENDPOINT;
  base-uri 'self'; form-action 'self'; frame-ancestors 'self'
```

- **`'unsafe-inline'` for styles** is needed because some elements use small inline `style="--i:…"` custom properties.
- **The hash changes if you edit the inline script.** Recompute it with any CSP hash tool.
- **Adjust the policy** for self-hosted fonts and local images, and remove sources you no longer use.

Other useful headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

## After launch

- Check a link preview with your social platforms' debugging tools, for example the Facebook Sharing Debugger or LinkedIn Post Inspector.
- Check the structured data with Google's Rich Results Test. Confirm that the hours and address match your real details.
- Add your site to Google Search Console and Bing Webmaster Tools.

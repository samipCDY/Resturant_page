/*!
 * Aurelia Dining — content.js
 * ---------------------------------------------------------------------------
 * ★ The single source of editable content. ★
 * Change text, prices, dishes, images and contact details here; the page
 * updates automatically. index.html contains the same defaults only as a
 * fallback for search engines and visitors without JavaScript.
 *
 * Rules
 *  - Plain text everywhere. In fields marked "(*em*)" you may wrap words in
 *    *asterisks* to render them in gold italics. No other HTML is allowed.
 *  - Prices are numbers (48, 16.5). Use a string ("Market price") to show it
 *    verbatim. Currency/locale come from `settings`.
 *  - Images: { src, alt }. Unsplash URLs get responsive sizes automatically.
 *    For your own photos use e.g. { src: "assets/img/dishes/fillet.jpg", alt: "…" }
 *    and optionally srcset: "assets/img/dishes/fillet-480.jpg 480w, …".
 *  - All names, numbers and addresses below are FICTIONAL sample content.
 * ---------------------------------------------------------------------------
 */
window.AURELIA_CONTENT = {
  settings: {
    locale: "en-US",
    currency: "USD",
    priceDecimals: 0
  },

  brand: {
    name: "Aurelia",
    descriptor: "Dining",
    tagline: "Modern European kitchen",
    established: "2014"
  },

  contact: {
    phone: "+1 (555) 014-2290",
    phoneHref: "tel:+15550142290",
    email: "reservations@aurelia.example",
    emailHref: "mailto:reservations@aurelia.example",
    address: {
      line1: "218 Linden Row",
      line2: "Riverside District, Portland, OR 97204"
    },
    mapUrl: "https://www.openstreetmap.org/"
  },

  hours: {
    summary: "Tue – Sun · 5:30 – 11 pm"
  },

  /* Primary navigation (desktop bar + mobile menu) */
  nav: [
    { label: "About", href: "#about" },
    { label: "Signature", href: "#signature" },
    { label: "Menu", href: "#menu" },
    { label: "Chef", href: "#chef" },
    { label: "Gallery", href: "#gallery" },
    { label: "Contact", href: "#contact" }
  ],

  navCta: { label: "Reserve", href: "#reservations" },

  hero: {
    eyebrow: "Modern European · Est. 2014",
    /* One string per line (*em*) */
    titleLines: ["Where every", "*plate* tells", "a quiet story."],
    lead: "Seasonal tasting menus, open-fire cooking and a candlelit room on the river. An evening at Aurelia moves at the pace of good conversation.",
    primaryCta: { label: "Reserve a table", href: "#reservations" },
    secondaryCta: { label: "Explore the menu", href: "#menu" },
    meta: [
      { label: "Dinner", value: "Tue – Sun · 5:30 – 11 pm" },
      { label: "Kitchen", value: "Seasonal tasting & à la carte" },
      { label: "Find us", value: "218 Linden Row, Portland" }
    ]
  },

  /* ★ Signature wheel — 5 to 7 dishes recommended (supports 3–12) */
  wheel: {
    eyebrow: "The Signature Wheel",
    title: "Seven plates, *one table*.",   /* (*em*) */
    intro: "Turn the wheel through the dishes our guests return for. Each is built around a single peak-season ingredient and finished at the pass by our head chef.",
    autoplay: true,        /* gentle rotation; never starts for reduced-motion users */
    interval: 6000,        /* ms between dishes (minimum 3500) */
    dishes: [
      {
        id: "ember-fillet",
        name: "Ember-Seared Beef Fillet",
        description: "Thirty-day dry-aged fillet seared over oak embers, with charred broccolini and a smoked bone-marrow jus.",
        price: 58,
        tags: ["Signature", "Gluten-free"],
        pairing: "Syrah, Northern Rhône",
        image: {
          src: "https://images.unsplash.com/photo-1432139509613-5c4255815697",
          alt: "Seared beef fillet with charred broccolini and a glossy jus on a white plate"
        }
      },
      {
        id: "cedar-salmon",
        name: "Cedar-Cured Salmon",
        description: "Slow-roasted salmon cured with cedar and citrus, served on fennel slaw with lime beurre blanc.",
        price: 42,
        tags: ["Pescatarian", "Gluten-free"],
        pairing: "Chablis Premier Cru",
        image: {
          src: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2",
          alt: "Roasted salmon fillet with greens and lime on a dark plate"
        }
      },
      {
        id: "langoustine-linguine",
        name: "Langoustine Linguine",
        description: "Hand-cut linguine tossed with langoustine, blistered cherry tomatoes, Calabrian chilli and parsley butter.",
        price: 39,
        tags: ["House pasta"],
        pairing: "Vermentino di Gallura",
        image: {
          src: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8",
          alt: "Linguine with prawns and cherry tomatoes in a black pan"
        }
      },
      {
        id: "beef-tataki",
        name: "Charred Beef Tataki",
        description: "Flash-seared sirloin with pickled red onion, watercress, roasted cashews and a yuzu ponzu dressing.",
        price: 28,
        tags: ["To share"],
        pairing: "Junmai Ginjo sake",
        image: {
          src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836",
          alt: "Sliced seared beef with red onion and fresh herbs in a bowl"
        }
      },
      {
        id: "prawn-etouffee",
        name: "Saffron Prawn Étouffée",
        description: "Gulf prawns in a slow-cooked saffron and tomato roux, served with steamed jasmine rice and coriander.",
        price: 36,
        tags: ["Spiced", "Dairy-free"],
        pairing: "Alsace Gewürztraminer",
        image: {
          src: "https://images.unsplash.com/photo-1559847844-5315695dadae",
          alt: "Prawns in a rich saffron sauce beside jasmine rice in a white bowl"
        }
      },
      {
        id: "garden-greens",
        name: "Garden of Greens",
        description: "Market leaves, shaved fennel, red onion, toasted seeds and twelve-year aged balsamic.",
        price: 19,
        tags: ["Vegan", "Gluten-free"],
        pairing: "Grüner Veltliner",
        image: {
          src: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe",
          alt: "Leafy green salad with red onion and seeds on a dark plate"
        }
      },
      {
        id: "raspberry-layer",
        name: "Raspberry & Elderflower Layer",
        description: "Vanilla genoise layered with elderflower cream and fresh raspberries, finished with a raspberry glaze.",
        price: 16,
        tags: ["Vegetarian", "Dessert"],
        pairing: "Brachetto d'Acqui",
        image: {
          src: "https://images.unsplash.com/photo-1565958011703-44f9829ba187",
          alt: "Slice of layered sponge cake topped with fresh raspberries"
        }
      }
    ]
  }

  /* Phase 3 adds: about, signatures, menu, chef, experience, gallery,
     testimonials, reservation (endpoint), footer */
};

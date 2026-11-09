/*!
 * Aurelia Dining — content.js
 * ---------------------------------------------------------------------------
 * ★ The single source of editable content for every page. ★
 * See CUSTOMIZATION.md for a field-by-field guide.
 *
 * Rules
 *  - Plain text everywhere. In fields marked (*em*) wrap words in *asterisks*
 *    to show them in gold italics. No other HTML is allowed (it is escaped).
 *  - Brand tokens work in any text: {name} {descriptor} {fullName} {phone}
 *    {email} {established}. Rename the restaurant in `brand` and every
 *    sentence that uses a token follows.
 *  - Prices are numbers (48, 16.5). Use a string ("Market price") to show
 *    text verbatim. Currency/locale come from `settings`.
 *  - Images: { src, alt }. Unsplash URLs get responsive sizes automatically.
 *    Your own photos: { src: "assets/img/dishes/fillet.jpg", alt: "…" } plus an
 *    optional srcset: "assets/img/dishes/fillet-480.jpg 480w, …".
 *  - Links: relative pages ("menu.html"), #anchors, https:, mailto:, tel:.
 *    Other schemes (javascript:, data:) are refused.
 *
 * ⚠ DEMO CONTENT: every name, address, phone number, email address, price,
 *   review and person below is FICTIONAL. Photos are hotlinked Unsplash demo
 *   images (see CREDITS.md). Replace all of it before going live.
 * ---------------------------------------------------------------------------
 */
window.AURELIA_CONTENT = {
  settings: {
    locale: "en-US",          // number/date/time formatting
    currency: "USD",          // ISO 4217 code
    priceDecimals: 0          // 0–4; anything else falls back to the currency default
  },

  /* Used for canonical URLs, og:url and structured data. Leave "" until you
     know the live address, e.g. "https://www.aurelia-dining.com/". */
  site: {
    url: "",
    structuredData: true,     // add schema.org Restaurant data on Home & Contact
    socialImage: {
      src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0",
      alt: "A plated dish being served at a candlelit table"
    }
  },

  brand: {
    name: "Aurelia",
    descriptor: "Dining",
    tagline: "Modern European kitchen",
    established: "2014",
    cuisine: ["Modern European", "Seasonal"],
    priceRange: "$$$"
  },

  contact: {
    phone: "+1 (503) 555-0142",        // 555-0100…0199 is reserved for fictional use
    phoneHref: "tel:+15035550142",
    email: "reservations@aurelia.example",
    emailHref: "mailto:reservations@aurelia.example",
    address: {
      street: "218 Linden Row",
      district: "Riverside District",
      locality: "Portland",
      region: "OR",
      postalCode: "97204",
      country: "US"
    },
    mapUrl: "",               // optional: your Google/Apple/OSM maps link. Empty = OpenStreetMap search for the address
    directions: [
      { label: "By transit", text: "Riverside streetcar to Linden Row, then a two-minute walk along the water." },
      { label: "Parking", text: "Evening parking at the Linden Street garage, 150 m north. Valet is not available." },
      { label: "Access", text: "Step-free entrance and an accessible restroom on the dining-room level." }
    ]
  },

  hours: {
    summary: "Tue – Sun · from 5 pm",
    days: [
      { label: "Monday", value: "Closed" },
      { label: "Tuesday – Thursday", value: "5:30 – 10:30 pm" },
      { label: "Friday & Saturday", value: "5:30 – 11:30 pm" },
      { label: "Sunday", value: "5 – 10 pm" }
    ],
    note: "The kitchen takes final orders 45 minutes before closing.",
    /* Machine-readable copy of the hours above, for structured data (24 h clock). */
    schema: [
      { days: ["Tuesday", "Wednesday", "Thursday"], opens: "17:30", closes: "22:30" },
      { days: ["Friday", "Saturday"], opens: "17:30", closes: "23:30" },
      { days: ["Sunday"], opens: "17:00", closes: "22:00" }
    ]
  },

  /* Navigation: header, mobile menu and footer.
     `page` must match <body data-page="…"> so the current page is marked.
     mobileOnly items are hidden from the desktop bar (the logo already links home). */
  nav: [
    { label: "Home", href: "index.html", page: "home", mobileOnly: true },
    { label: "About", href: "about.html", page: "about" },
    { label: "Signature", href: "signature.html", page: "signature" },
    { label: "Menu", href: "menu.html", page: "menu" },
    { label: "Chef", href: "chef.html", page: "chef" },
    { label: "Gallery", href: "gallery.html", page: "gallery" },
    { label: "Contact", href: "contact.html", page: "contact" }
  ],

  navCta: { label: "Reserve", href: "reservations.html", page: "reservations" },

  /* Per-page <title>, meta description and page-hero headline (*em*). */
  pages: {
    home: {
      title: "{fullName} — Modern European Restaurant",
      description: "{fullName} is a modern European restaurant serving seasonal tasting menus, open-fire signature plates and an intimate candlelit dining room."
    },
    about: {
      label: "About",
      title: "Our Story — {fullName}",
      description: "How {name} began, what we cook and why: seasonal sourcing, open-fire cooking and an unhurried, candlelit room.",
      eyebrow: "Our Story",
      heading: ["A small room", "with a *long table*."],
      lead: "{name} opened in {established} with eight tables, one wood-fired hearth and a simple promise: cook what the season gives us, and give every guest the whole evening."
    },
    signature: {
      label: "Signature Dishes",
      title: "Signature Dishes — {fullName}",
      description: "Turn the signature wheel through the plates guests return for, from ember-seared beef fillet to raspberry and elderflower layer cake.",
      eyebrow: "Signature Dishes",
      heading: ["The plates", "we're *known for*."],
      lead: "Seven dishes that never leave the menu, each built around one peak-season ingredient and finished at the pass."
    },
    menu: {
      label: "Menu",
      title: "Menu — {fullName}",
      description: "The full {fullName} menu: starters, mains, desserts and drinks, plus our seven-course tasting menu with optional wine pairing.",
      eyebrow: "The Menu",
      heading: ["Tonight's", "*menu*."],
      lead: "Our menu follows the market, so a few dishes change every week. Ask your server about today's additions."
    },
    chef: {
      label: "Chef",
      title: "Our Chef — {fullName}",
      description: "Meet the chef behind {fullName}: an open-fire kitchen, close relationships with growers and a menu that changes with the season.",
      eyebrow: "The Chef",
      heading: ["Cooking with", "*fire & patience*."],
      lead: "A kitchen built around one wood-fired hearth, and the people who tend it every night."
    },
    gallery: {
      label: "Gallery",
      title: "Gallery — {fullName}",
      description: "Inside {fullName}: the dining room, the bar, the open kitchen and the plates that leave it.",
      eyebrow: "Gallery",
      heading: ["Moments at", "*{name}*."],
      lead: "The room, the kitchen, the bar and the plates. Select any photo to see it full size."
    },
    reservations: {
      label: "Reservations",
      title: "Reservations — {fullName}",
      description: "Send a reservation inquiry to {fullName}. We reply to confirm availability; call us for same-day tables and larger parties.",
      eyebrow: "Reservations",
      heading: ["Reserve", "your *table*."],
      lead: "Send us an inquiry and we will reply to confirm. For tonight, or for parties larger than eight, please call."
    },
    contact: {
      label: "Contact",
      title: "Contact & Hours — {fullName}",
      description: "Address, opening hours, phone, email and directions for {fullName}.",
      eyebrow: "Contact",
      heading: ["Find", "*your way* here."],
      lead: "On the river in the Riverside District. Here is everything you need to reach us."
    }
  },

  /* ---- Home --------------------------------------------------------------- */
  hero: {
    eyebrow: "Modern European · Est. {established}",
    titleLines: ["Where every", "*plate* tells", "a quiet story."],     /* (*em*) */
    lead: "Seasonal tasting menus, open-fire cooking and a candlelit room on the river. An evening at {name} moves at the pace of good conversation.",
    primaryCta: { label: "Reserve a table", href: "reservations.html" },
    secondaryCta: { label: "Explore the menu", href: "menu.html" },
    meta: [
      { label: "Dinner", value: "Tue – Sun · from 5 pm" },
      { label: "Kitchen", value: "Seasonal tasting & à la carte" },
      { label: "Find us", value: "218 Linden Row, Portland" }
    ]
  },

  /* ★ Signature wheel — 5 to 7 dishes recommended (supports 1–12) */
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
  },

  /* ---- About / story ------------------------------------------------------ */
  about: {
    eyebrow: "Our Story",
    title: "A small room with a *long table*.",
    storyTitle: "Eight tables and *one hearth*.",
    summary: "{name} began in {established} as eight tables around a wood-fired hearth. The room has grown a little since; the idea has not. We cook what the season gives us and let every guest keep their table for the whole evening.",
    story: [
      "{name} began in {established} as eight tables around a single wood-fired hearth on Linden Row. We wanted a dining room where nobody watches the clock: one seating per table, every night.",
      "The menu is written each week with a small circle of growers, fishers and cheesemakers within a few hours of the kitchen. When something is at its best, it goes on the menu. When it is gone, so is the dish.",
      "Everything that can be cooked over fire is: vegetables blistered on the grill, fish finished over embers, bread baked in the dying heat after service."
    ],
    image: {
      src: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d",
      alt: "The dining room in the evening, with warm pendant lights above the tables"
    },
    valuesEyebrow: "Philosophy",
    valuesTitle: "Three things we *never compromise on*.",
    values: [
      { title: "Seasonal, always", text: "We write the menu with our growers each week and cook only what is at its peak." },
      { title: "Fire at the centre", text: "One oak-fired hearth shapes the kitchen: slow embers for fish, high flame for meat and vegetables." },
      { title: "Unhurried service", text: "One seating per table. Your table is yours for the evening, from the first glass to the last coffee." }
    ],
    room: {
      eyebrow: "The Room",
      title: "Candlelight, river views and *forty-eight seats*.",
      text: [
        "The dining room looks out over the river through tall warehouse windows. Tables are set well apart so conversation stays at the table.",
        "Our bar seats eight and pours a short list of classic cocktails, low-intervention wines and non-alcoholic pairings."
      ],
      image: {
        src: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34",
        alt: "The bar lit by warm hanging bulbs, with shelves of bottles behind it"
      },
      facts: [
        { label: "Dining room", value: "48 seats" },
        { label: "Bar", value: "8 seats, walk-ins welcome" },
        { label: "Private room", value: "Up to 12 guests" },
        { label: "Dress code", value: "Smart casual" }
      ]
    }
  },

  /* ---- Signature page: detailed cards under the wheel ----------------------- */
  signatureCards: {
    eyebrow: "In Detail",
    title: "Every signature plate, *up close*.",
    intro: "The same seven dishes as the wheel, with tasting notes and suggested pairings. All are available à la carte and most appear on the tasting menu."
  },

  /* ---- Reservation call-to-action band (bottom of most pages) ---------------- */
  ctaBand: {
    eyebrow: "Reservations",
    title: "Your table is *waiting*.",
    text: "Send an inquiry for dinner, or call us for tables tonight and for groups larger than eight.",
    primary: { label: "Reserve a table", href: "reservations.html" }
  },

  /* ---- Dining experience (home + about) ------------------------------------ */
  experience: {
    eyebrow: "The Experience",
    title: "Three ways to spend *the evening*.",
    intro: "However you dine with us, the table is yours for the night.",
    items: [
      {
        title: "Tasting Menu",
        text: "Seven courses that follow the week's harvest, with an optional wine or non-alcoholic pairing.",
        detail: "From $125 per guest",
        image: {
          src: "https://images.unsplash.com/photo-1581349485608-9469926a8e5e",
          alt: "A chef plating a row of dishes at the kitchen pass"
        }
      },
      {
        title: "À la Carte",
        text: "Choose from the full menu, including every dish on the signature wheel.",
        detail: "Mains from $28",
        image: {
          src: "https://images.unsplash.com/photo-1432139509613-5c4255815697",
          alt: "Seared beef fillet with broccolini on a white plate"
        }
      },
      {
        title: "Bar & Counter",
        text: "Classic cocktails, small plates and a seat facing the fire. No reservation needed.",
        detail: "Walk-ins welcome",
        image: {
          src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187",
          alt: "A cocktail being poured over a large ice cube"
        }
      }
    ]
  },

  /* ---- Menu ----------------------------------------------------------------- */
  menu: {
    eyebrow: "The Menu",
    title: "A short menu that *changes with the market*.",
    intro: "Every dish can be ordered à la carte. Ask your server about this week's additions.",
    legend: { V: "Vegetarian", VG: "Vegan", GF: "Gluten-free", DF: "Dairy-free" },
    allergyNote: "Please tell your server about any allergies or dietary needs. Our kitchen handles nuts, gluten, dairy and shellfish, so we cannot guarantee that any dish is allergen-free.",
    categories: [
      {
        id: "starters",
        label: "Starters",
        items: [
          { name: "Charred Beef Tataki", description: "Seared sirloin, pickled red onion, watercress, cashew, yuzu ponzu.", price: 28, tags: ["DF"], featured: true },
          { name: "Hearth-Baked Sourdough", description: "Cultured butter, smoked sea salt, olive oil from Liguria.", price: 9, tags: ["V"] },
          { name: "Burrata & Heirloom Tomato", description: "Basil oil, aged balsamic, toasted seeds.", price: 18, tags: ["V", "GF"] },
          { name: "Oysters, Six Ways", description: "Half a dozen with mignonette, lemon and fermented chilli.", price: 24, tags: ["GF", "DF"] },
          { name: "Garden of Greens", description: "Market leaves, shaved fennel, red onion, twelve-year balsamic.", price: 19, tags: ["VG", "GF"] }
        ]
      },
      {
        id: "mains",
        label: "Mains",
        items: [
          { name: "Ember-Seared Beef Fillet", description: "Dry-aged fillet, charred broccolini, smoked bone-marrow jus.", price: 58, tags: ["GF"], featured: true },
          { name: "Cedar-Cured Salmon", description: "Fennel and citrus slaw, lime beurre blanc.", price: 42, tags: ["GF"], featured: true },
          { name: "Langoustine Linguine", description: "Hand-cut pasta, blistered tomatoes, Calabrian chilli, parsley butter.", price: 39, tags: [] },
          { name: "Saffron Prawn Étouffée", description: "Saffron and tomato roux, jasmine rice, coriander.", price: 36, tags: ["DF"] },
          { name: "Fire-Roasted Celeriac", description: "Whole celeriac, hazelnut, brown butter, crispy sage.", price: 27, tags: ["V", "GF"] },
          { name: "Market Fish", description: "Today's catch, cooked over embers, with seasonal garnish.", price: "Market price", tags: ["GF"] }
        ]
      },
      {
        id: "desserts",
        label: "Desserts",
        items: [
          { name: "Raspberry & Elderflower Layer", description: "Vanilla genoise, elderflower cream, raspberry glaze.", price: 16, tags: ["V"], featured: true },
          { name: "Dark Chocolate Délice", description: "70% chocolate, salted caramel, crème fraîche.", price: 15, tags: ["V", "GF"] },
          { name: "Ember-Roasted Stone Fruit", description: "Honey, thyme, oat crumble, vanilla ice cream.", price: 14, tags: ["V"] },
          { name: "Cheese from the Cellar", description: "Three regional cheeses, quince, seeded crackers.", price: 19, tags: ["V"] }
        ]
      },
      {
        id: "drinks",
        label: "Drinks",
        items: [
          { name: "Smoked Old Fashioned", description: "Rye, demerara, orange bitters, oak smoke.", price: 17, tags: [] },
          { name: "Linden Spritz", description: "Elderflower, white vermouth, sparkling wine, cucumber.", price: 15, tags: [] },
          { name: "Garden Tonic (alcohol-free)", description: "Verjus, rosemary, tonic, citrus peel.", price: 9, tags: [] },
          { name: "Wine by the Glass", description: "A rotating list of six whites, reds and skin-contact wines.", price: "From $14", tags: [] },
          { name: "Coffee & Tea", description: "Single-origin espresso, loose-leaf teas and herbal infusions.", price: "From $4", tags: [] }
        ]
      }
    ],
    tasting: {
      title: "The Tasting Menu",
      text: "Seven courses that follow the week's harvest. Served to the whole table, Tuesday to Saturday, last seating 8:30 pm.",
      price: 125,
      priceLabel: "per guest",
      pairing: "Wine pairing $85 · Non-alcoholic pairing $55",
      courses: ["Hearth bread & cultured butter", "Oyster, fermented chilli", "Garden of Greens", "Cedar-cured salmon", "Ember-seared beef fillet", "Cheese from the cellar", "Raspberry & elderflower"]
    }
  },

  /* ---- Chef ----------------------------------------------------------------- */
  chef: {
    eyebrow: "The Chef",
    name: "Marcus Vale",              // FICTIONAL demo persona
    role: "Head Chef & Co-founder",
    portrait: {
      src: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c",
      alt: "A chef in an apron plating a dish beneath copper kitchen lamps"
    },
    summary: "Marcus built {name} around a single wood-fired hearth and a small circle of growers. His food is direct, seasonal and finished with restraint.",
    bio: [
      "Marcus trained in classical kitchens before spending several years cooking over open fire in small coastal restaurants. He opened {name} in {established} with the idea that a restaurant should feel like the best dinner party you have ever been to.",
      "He still writes the menu every week, usually after a morning at the market, and he works the pass himself most nights."
    ],
    principlesEyebrow: "In the Kitchen",
    principlesTitle: "How the kitchen *works*.",
    quote: "The fire decides more than I do. My job is to bring it the best ingredients I can find, then get out of the way.",
    principles: [
      { title: "Start with the grower", text: "Every dish begins with a conversation with the people who grow, catch or make it." },
      { title: "Cook with the fire", text: "Embers, smoke and flame do the seasoning; sauces stay light and clear." },
      { title: "Finish at the pass", text: "Each plate is checked and finished by a chef before it reaches the dining room." }
    ],
    kitchenImage: {
      src: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf",
      alt: "A cook tossing a pan over a tall flame in a busy kitchen"
    }
  },

  /* ---- Gallery ----------------------------------------------------------------- */
  gallery: {
    eyebrow: "Gallery",
    title: "Moments at *{name}*.",
    items: [
      { src: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0", alt: "A plated dish being served at a candlelit table", caption: "Service in the dining room", wide: true },
      { src: "https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf", alt: "A cook tossing a pan over a tall flame", caption: "The open kitchen" },
      { src: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8", alt: "Linguine with prawns and cherry tomatoes in a black pan", caption: "Langoustine linguine" },
      { src: "https://images.unsplash.com/photo-1572116469696-31de0f17cc34", alt: "The bar lit by warm hanging bulbs", caption: "The bar after dark", tall: true },
      { src: "https://images.unsplash.com/photo-1470337458703-46ad1756a187", alt: "A cocktail being poured over a large ice cube", caption: "Smoked Old Fashioned" },
      { src: "https://images.unsplash.com/photo-1581349485608-9469926a8e5e", alt: "A chef plating a row of dishes at the pass", caption: "Plating at the pass" },
      { src: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d", alt: "The dining room with warm pendant lights", caption: "The dining room", wide: true },
      { src: "https://images.unsplash.com/photo-1432139509613-5c4255815697", alt: "Seared beef fillet with broccolini and jus", caption: "Ember-seared beef fillet" },
      { src: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2", alt: "Roasted salmon with greens and lime on a dark plate", caption: "Cedar-cured salmon" },
      { src: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4", alt: "An empty dining room with dark wood and set tables", caption: "Before service" },
      { src: "https://images.unsplash.com/photo-1504674900247-0877df9cc836", alt: "Sliced seared beef with herbs and chilli on a wooden table", caption: "Plates to share" },
      { src: "https://images.unsplash.com/photo-1488900128323-21503983a07e", alt: "Berry ice desserts stacked on a dark surface", caption: "Something sweet" }
    ]
  },

  /* ---- Testimonials (SAMPLE — replace with real reviews you may publish) --- */
  testimonials: {
    eyebrow: "Kind Words",
    title: "From our *guests*.",
    label: "Sample reviews",
    disclaimer: "These are placeholder reviews for demonstration only. Replace them with genuine guest feedback you have permission to publish.",
    items: [
      { quote: "We came for an anniversary and stayed until the candles burned down. Nobody rushed us once.", name: "Sample guest", context: "Dinner for two" },
      { quote: "The beef fillet is worth the trip on its own, but the bread made me want to move in.", name: "Sample guest", context: "Tasting menu" },
      { quote: "Warm, quiet and genuinely kind service. They remembered my allergy without me repeating it.", name: "Sample guest", context: "Family dinner" }
    ]
  },

  /* ---- Reservation inquiry form ---------------------------------------------
     endpoint: "" means online inquiries are OFF. The form still validates, then
     explains that online submission is unavailable and offers phone/email.
     To enable, paste an https endpoint that accepts a POST of form data,
     e.g. a Formspree/Basin/Getform form URL or your own server. See
     CUSTOMIZATION.md → "Reservation form". Never put API keys here.          */
  reservation: {
    endpoint: "",
    maxPartySize: 8,
    largePartyNote: "For parties of more than {maxParty}, or for the private room, please call {phone}.",
    bookingWindowDays: 60,               // how far ahead guests may ask
    closedWeekdays: [1],                 // 0 = Sunday … 6 = Saturday (Monday closed)
    times: ["17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"],
    occasions: ["Birthday", "Anniversary", "Business dinner", "Date night", "Other"],
    responseTime: "We reply to every inquiry within one business day.",
    policy: [
      "This form sends an inquiry, not a booking. Your table is confirmed only when we reply.",
      "Same-day tables: please call us.",
      "We hold tables for 15 minutes after the reserved time."
    ],
    messages: {
      notConfigured: "Online inquiries aren't switched on for this website yet, so this form can't send your request. Please call {phone} or email {email}. You can also use the button below to open an email with your details already filled in.",
      sending: "Sending your inquiry…",
      success: "Thank you. Your inquiry has been sent. This is not a confirmation yet: we will reply by email or phone to confirm your table.",
      error: "Sorry, your inquiry could not be sent. Nothing was booked. Please try again, call {phone} or email {email}."
    }
  },

  footer: {
    note: "Demo content: all names, contact details, prices, reviews and people shown are fictional placeholders.",
    credit: "Website template by TokaMD."
  }
};

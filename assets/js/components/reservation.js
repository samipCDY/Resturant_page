/*!
 * Aurelia Dining — components/reservation.js
 * Reservation INQUIRY form: accessible validation and honest submission.
 *
 *  - Never simulates success. Without a configured https endpoint
 *    (content.reservation.endpoint) the form validates, then explains that
 *    online sending is unavailable and offers phone, email and a pre-filled
 *    email link.
 *  - With an endpoint it POSTs FormData (Accept: application/json). Only a 2xx
 *    response counts as sent, and even then the copy says "inquiry", not
 *    "booking".
 *  - Errors: inline per field (aria-invalid + aria-describedby) plus a focused
 *    error summary with links to each field.
 */
(function (A) {
  "use strict";

  var utils = A.utils;
  var register = A.render.register;
  var T = function (v, c) { return utils.text(v, c); };
  var TIMEOUT_MS = 15000;
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function cfg(content) {
    return (content && content.reservation) || {};
  }

  function maxParty(content) {
    var n = parseInt(cfg(content).maxPartySize, 10);
    return n > 0 && n <= 50 ? n : 8;
  }

  function fillRes(text, content) {
    return utils.fill(String(text || "").replace(/\{maxParty\}/g, String(maxParty(content))), content);
  }

  /* ------------------------------------------------------------- <option> renderers */
  register("reservation-times", function (content) {
    var times = (cfg(content).times || []).filter(function (t) { return /^\d{1,2}:\d{2}$/.test(t); });
    if (!times.length) return null;
    return '<option value="">Select a time</option>' + times.map(function (t) {
      return '<option value="' + utils.escapeHtml(t) + '">' + T(utils.formatTime(t, content.settings), content) + "</option>";
    }).join("");
  });

  register("reservation-guests", function (content) {
    var max = maxParty(content);
    var out = '<option value="">Select party size</option>';
    for (var i = 1; i <= max; i++) out += '<option value="' + i + '">' + i + (i === 1 ? " guest" : " guests") + "</option>";
    return out + '<option value="more">More than ' + max + "</option>";
  });

  register("reservation-occasions", function (content) {
    var list = (cfg(content).occasions || []).filter(Boolean);
    return '<option value="">No special occasion</option>' + list.map(function (o) {
      return '<option value="' + utils.escapeHtml(o) + '">' + T(o, content) + "</option>";
    }).join("");
  });

  register("reservation-policy", function (content) {
    var list = (cfg(content).policy || []).filter(Boolean);
    if (!list.length) return null;
    return list.map(function (p) { return "<li>" + T(p, content) + "</li>"; }).join("");
  });

  register("large-party-note", function (content) {
    var note = cfg(content).largePartyNote;
    return note ? T(fillRes(note, content), content) : null;
  });

  /* ------------------------------------------------------------- dates */
  function isoDate(d) {
    return d.getFullYear() + "-" + utils.pad(d.getMonth() + 1) + "-" + utils.pad(d.getDate());
  }

  function parseIso(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return d.getMonth() === Number(m[2]) - 1 ? d : null;
  }

  function addDays(d, n) {
    var out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    out.setDate(out.getDate() + n);
    return out;
  }

  function weekdayName(index, locale) {
    var d = new Date(2024, 0, 7 + index); // 7 Jan 2024 was a Sunday
    try { return new Intl.DateTimeFormat(locale || "en-US", { weekday: "long" }).format(d); }
    catch (err) { return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(d); }
  }

  /* ------------------------------------------------------------- init */
  function init(content) {
    var root = utils.qs("[data-reservation]");
    if (!root) return;
    var form = utils.qs("[data-reservation-form]", root);
    if (!form) return;

    var c = cfg(content);
    var settings = content.settings || {};
    var endpoint = utils.isSafeEndpoint(c.endpoint) ? c.endpoint.trim() : "";
    if (c.endpoint && !endpoint) console.warn("[Aurelia] reservation.endpoint must be an https:// URL; online sending stays off.");

    var status = utils.qs("[data-form-status]", root);
    var summary = utils.qs("[data-form-errors]", root);
    var submit = utils.qs("[type=submit]", form);
    var notice = utils.qs("[data-reservation-notice]", root);
    var today = new Date();
    var earliest = addDays(today, 1);                         // same-day: please call
    var windowDays = Math.max(1, parseInt(c.bookingWindowDays, 10) || 60);
    var latest = addDays(today, windowDays);
    var closed = Array.isArray(c.closedWeekdays) ? c.closedWeekdays.filter(function (n) { return n >= 0 && n <= 6; }) : [];
    var attempted = false;

    form.noValidate = true; // we show our own accessible messages
    var dateInput = form.elements.date;
    if (dateInput) {
      dateInput.min = isoDate(earliest);
      dateInput.max = isoDate(latest);
    }
    if (notice) notice.hidden = !!endpoint;

    /* ---- rules: return an error message or "" */
    var rules = {
      name: function (v) {
        v = v.trim();
        if (!v) return "Enter your full name.";
        if (v.length < 2) return "Your name must be at least 2 characters.";
        return "";
      },
      email: function (v) {
        v = v.trim();
        if (!v) return "Enter your email address so we can reply.";
        if (!EMAIL.test(v)) return "Enter an email address in the format name@example.com.";
        return "";
      },
      phone: function (v) {
        var digits = v.replace(/\D/g, "");
        if (!v.trim()) return "Enter a phone number we can call if anything changes.";
        if (digits.length < 7 || digits.length > 15) return "Enter a phone number of 7 to 15 digits, including the area code.";
        return "";
      },
      date: function (v) {
        if (!v) return "Choose the date you would like to visit.";
        var d = parseIso(v);
        if (!d) return "Enter a valid date.";
        if (d < addDays(today, 0) || isoDate(d) === isoDate(today)) {
          return isoDate(d) === isoDate(today)
            ? fillRes("For a table today, please call {phone}. Online inquiries start from tomorrow.", content)
            : "Choose a date in the future.";
        }
        if (d > latest) return "We take inquiries up to " + windowDays + " days ahead. For later dates, please call or email us.";
        if (closed.indexOf(d.getDay()) !== -1) return "We're closed on " + weekdayName(d.getDay(), settings.locale) + "s. Please choose another day.";
        return "";
      },
      time: function (v) {
        return v ? "" : "Choose a time.";
      },
      guests: function (v) {
        if (!v) return "Choose how many guests are coming.";
        if (v === "more") return fillRes(c.largePartyNote || "For larger parties, please call {phone}.", content);
        return "";
      },
      notes: function (v) {
        return v.length > 500 ? "Please keep notes under 500 characters (currently " + v.length + ")." : "";
      }
    };

    function field(name) {
      return form.elements[name];
    }

    function setError(name, message) {
      var input = field(name);
      if (!input) return;
      var wrapper = input.closest(".field");
      var error = wrapper && utils.qs("[data-error]", wrapper);
      input.setAttribute("aria-invalid", message ? "true" : "false");
      if (!message) input.removeAttribute("aria-invalid");
      if (wrapper) wrapper.classList.toggle("has-error", !!message);
      if (error) error.textContent = message;
    }

    function validateField(name) {
      var input = field(name);
      if (!input || !rules[name]) return "";
      var message = rules[name](input.value || "");
      setError(name, message);
      return message;
    }

    function validateAll() {
      var errors = [];
      Object.keys(rules).forEach(function (name) {
        var message = validateField(name);
        if (message) errors.push({ name: name, message: message, id: field(name).id });
      });
      return errors;
    }

    function showSummary(errors) {
      if (!summary) return;
      if (!errors.length) {
        summary.hidden = true;
        return;
      }
      var list = utils.qs("ul", summary);
      var heading = utils.qs("[data-form-errors-title]", summary);
      if (heading) heading.textContent = errors.length === 1 ? "There is 1 problem with your inquiry" : "There are " + errors.length + " problems with your inquiry";
      list.innerHTML = errors.map(function (e) {
        return '<li><a href="#' + utils.escapeHtml(e.id) + '">' + utils.escapeHtml(e.message) + "</a></li>";
      }).join("");
      summary.hidden = false;
      summary.focus();
    }

    function setStatus(kind, html) {
      if (!status) return;
      status.className = "form-status" + (kind ? " form-status--" + kind : "");
      status.innerHTML = html;
    }

    function details() {
      var get = function (n) { return field(n) ? String(field(n).value || "").trim() : ""; };
      var timeLabel = get("time") ? utils.formatTime(get("time"), settings) : "";
      return {
        name: get("name"), email: get("email"), phone: get("phone"),
        date: get("date"), time: timeLabel, guests: get("guests"),
        occasion: get("occasion"), notes: get("notes")
      };
    }

    function mailtoLink(d) {
      var to = (content.contact && content.contact.email) || "";
      if (!to) return "";
      var subject = "Reservation inquiry: " + d.date + " " + d.time + ", " + d.guests + " guests";
      var body = [
        "Name: " + d.name, "Email: " + d.email, "Phone: " + d.phone,
        "Date: " + d.date, "Time: " + d.time, "Guests: " + d.guests,
        d.occasion ? "Occasion: " + d.occasion : "", d.notes ? "Notes: " + d.notes : "",
        "", "I understand this is an inquiry, not a confirmed booking."
      ].filter(function (l, i, arr) { return l || (i > 0 && arr[i - 1]); }).join("\n");
      return "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }

    function contactLinks() {
      var ct = content.contact || {};
      var links = [];
      var tel = utils.safeHref(ct.phoneHref);
      var mail = utils.safeHref(ct.emailHref);
      if (tel && ct.phone) links.push('<a href="' + utils.escapeHtml(tel) + '">Call ' + utils.escapeHtml(ct.phone) + "</a>");
      if (mail && ct.email) links.push('<a href="' + utils.escapeHtml(mail) + '">Email ' + utils.escapeHtml(ct.email) + "</a>");
      return links.join(" · ");
    }

    /* live re-validation once the guest has tried to submit */
    form.addEventListener("input", function (event) {
      if (attempted && event.target.name && rules[event.target.name]) validateField(event.target.name);
    });
    form.addEventListener("change", function (event) {
      if (event.target.name && rules[event.target.name] && (attempted || event.target.tagName === "SELECT")) validateField(event.target.name);
    });
    form.addEventListener("focusout", function (event) {
      var input = event.target;
      if (input.name && rules[input.name] && input.value) validateField(input.name);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      attempted = true;
      var errors = validateAll();
      if (errors.length) {
        setStatus("", "");
        showSummary(errors);
        return;
      }
      showSummary([]);

      // Spam trap: real visitors never see or fill this field.
      if (field("company") && field("company").value) {
        setStatus("error", T(fillRes(c.messages && c.messages.error, content), content));
        return;
      }

      var d = details();

      if (!endpoint) {
        var mail = mailtoLink(d);
        setStatus("info",
          "<p>" + T(fillRes(c.messages && c.messages.notConfigured, content), content) + "</p>" +
          '<p class="form-status__actions">' +
            (mail ? '<a class="btn btn--primary btn--sm" href="' + utils.escapeHtml(mail) + '">Email these details</a> ' : "") +
            '<span class="form-status__links">' + contactLinks() + "</span>" +
          "</p>");
        return;
      }

      // Configured: send for real.
      var data = new FormData(form);
      data.delete("company");
      submit.disabled = true;
      form.setAttribute("aria-busy", "true");
      setStatus("pending", T(fillRes(c.messages && c.messages.sending, content), content));

      var controller = typeof AbortController === "function" ? new AbortController() : null;
      var timer = controller ? window.setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : 0;

      fetch(endpoint, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
        signal: controller ? controller.signal : undefined
      }).then(function (response) {
        if (!response.ok) throw new Error("HTTP " + response.status);
        form.hidden = true;
        if (notice) notice.hidden = true;
        var done = utils.qs("[data-reservation-success]", root);
        if (done) {
          utils.qs("[data-success-message]", done).textContent = fillRes(c.messages && c.messages.success, content);
          utils.qs("[data-success-summary]", done).textContent =
            d.name + " · " + d.date + " · " + d.time + " · " + (d.guests === "1" ? "1 guest" : d.guests + " guests");
          done.hidden = false;
          done.focus();
        }
        setStatus("", "");
      }).catch(function () {
        setStatus("error",
          "<p>" + T(fillRes(c.messages && c.messages.error, content), content) + "</p>" +
          '<p class="form-status__links">' + contactLinks() + "</p>");
      }).then(function () {
        window.clearTimeout(timer);
        submit.disabled = false;
        form.removeAttribute("aria-busy");
      });
    });

    root.classList.add("is-ready");
  }

  A.reservation = { init: init, _rules: { parseIso: parseIso, isoDate: isoDate } };
})(typeof window !== "undefined" ? (window.Aurelia = window.Aurelia || {}) : (globalThis.Aurelia = globalThis.Aurelia || {}));

/* Crypto Cards Database: finder, card pages and compare. No dependencies.
   Views are routed on the URL hash: "" (finder), "#card-<id>", "#compare". */
(function () {
  "use strict";
  var DATA = window.CC_DATA, CARDS = DATA.cards, BY_ID = {};
  CARDS.forEach(function (c, i) { c.order = i; BY_ID[c.id] = c; });

  var FACETS = [
    ["Region", ["Global", "EU/EEA", "UK", "US", "CIS", "LatAm", "MENA", "APAC"]],
    ["Network", ["Visa", "Mastercard"]],
    ["Format", ["Physical+Virtual", "Virtual only"]],
    ["Verification", ["No-KYC", "Light KYC", "KYC"]],
    ["Custody", ["Non-Custodial", "Custodial"]],
    ["Banking", ["IBAN", "SEPA", "SWIFT"]],
    ["Costs and rewards", ["No monthly fee", "Free issue", "0% FX", "Cashback 3%+", "Points system", "Yield"]],
    ["More", ["Apple+Google Pay", "Telegram Mini App", "Multicurrency", "Waitlist"]]
  ];
  var HOME_FAQ = [
    ["What is Crypto Cards Database?", "A comparison site for crypto cards that focuses on what a card is like to use: fees, cashback, KYC model, supported regions, network and app support. The aim is to help you pick a card that suits your country, how you spend and how much risk you accept."],
    ["How do you rank cards?", "Rankings weigh several things together: card fees, cashback quality, ATM and spending limits, KYC requirements, availability by region and how stable the product has been over time. No single metric decides the order."],
    ["What is the difference between virtual and physical crypto cards?", "A virtual card works for online payments and activates straight away. A physical card is better for in-store payments and ATM withdrawals. Many providers offer both, but fees, shipping, limits and card controls can differ by plan."],
    ["How do crypto debit cards work at checkout?", "Most cards settle in fiat at the moment you pay. You fund the card with supported assets and the provider converts them under its own wallet model and pricing. Conversion cost, spread, FX policy and settlement speed decide how good a card is in practice."],
    ["Can I use crypto cards for ATM withdrawals?", "Many physical cards support ATM withdrawals, each with its own limits, fixed fees and possible FX charges. Virtual-only cards usually do not. Compare the ATM policy before choosing a card for travel or cash."],
    ["Which fees matter most?", "Plan cost, issuance cost, ATM fee, FX fee and top-up fee. A card with no monthly fee can still be expensive if conversion or withdrawal costs are high. The best card is usually the one with the lowest total cost for the way you spend."],
    ["Why do cashback rates differ so much?", "Cashback often depends on plan tier, volume thresholds, token requirements and promotional windows. A headline rate can drop after a monthly cap, so your effective rate may be lower than advertised. Compare both the maximum rate and a realistic one."],
    ["What does No-KYC mean for a crypto card?", "Reduced onboarding checks and faster setup, not unlimited anonymity. These cards often have lower limits, fewer payment rails and fewer premium features. For larger balances and higher limits, full-KYC cards are usually more practical."],
    ["Are No-KYC cards fully anonymous?", "No. No-KYC is a lighter compliance model. Providers still apply risk controls and blockchain transfers remain traceable. If privacy is your priority, compare limits, custody model and transaction policies in detail."],
    ["How does KYC level affect limits?", "Higher KYC levels usually unlock higher spending limits, larger ATM allowances and more funding options. Light KYC can be enough for casual use; full KYC is often required for high-volume spending."]
  ];
  var KYC_LABEL = { none: "No KYC", light: "Light KYC", full: "Full KYC" };
  var AVAIL_LABEL = { yes: "Available", partial: "Partly", no: "Not available", "": "Not confirmed" };
  var SCHEDULE = [
    ["Costs", [["Plan fee / requirements", "fee"], ["FX fee on card spend", "fx"], ["ATM fee", "atmFee"], ["Virtual card issue", "virtualIssue"], ["Physical card issue", "physicalIssue"], ["Physical shipping", "shipping"], ["Extra virtual cards", "extraVirtual"], ["Extra physical cards", "extraPhysical"]]],
    ["Rewards", [["Rewards", "rewards"], ["Yield", "yieldNote"]]],
    ["Limits", [["Spend limits", "spendLimits"], ["ATM limits", "atmLimits"], ["Maximum cards", "maxCards"]]],
    ["Funding", [["Top up with crypto", "topupCrypto"], ["Top up by bank transfer", "topupBank"], ["Bank rails", "bankRails"], ["SEPA", "sepa"], ["SWIFT", "swift"], ["IBAN", "iban"]]],
    ["Card and account", [["Network", "network"], ["Card type", "cardType"], ["Verification", "_kyc"], ["Custody", "_custody"], ["Base currency", "baseCurrency"], ["Account currencies", "currencies"], ["Apple Pay", "applePay"], ["Google Pay", "googlePay"], ["Availability", "availability"]]]
  ];

  var state = { q: "", tags: {}, country: "", priority: "", sort: "featured", layout: "list", compare: [], plans: {}, diff: false };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("cc:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("cc:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  state.compare = store.get("compare", []).filter(function (id) { return BY_ID[id]; }).slice(0, 4);
  state.layout = store.get("layout", "list");

  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pct(n) { return (Math.round(n * 100) / 100) + "%"; }
  function title(s) {
    s = String(s || "");
    return /^[A-Z][A-Z ]{1,}$/.test(s) && !/^(USD|EUR|GBP|UAE|UK|US)$/.test(s) ? s.charAt(0) + s.slice(1).toLowerCase() : s;
  }
  function rewardText(p) { return /^no$/i.test(p.rewards || "") ? "" : p.rewards || ""; }
  function art(c, cls) { return '<div class="' + (cls || "art") + '"><img src="images/cards/' + esc(c.img) + '.webp" alt="' + esc(c.name) + ' card" loading="lazy" width="320" height="202"></div>'; }
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : "#"; }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }

  /* ---------- derived display values ---------- */
  function rewardHead(p) {
    if (p.cashback == null) return '<b class="none">None listed</b>';
    return "<b><small>up to</small>" + pct(p.cashback) + "</b>";
  }
  function fxHead(p) {
    if (p.fxWorst == null) return '<b class="none">Not stated</b>';
    if (p.fxWorst === 0) return '<b class="is-good">0%</b>';
    return "<b><small>up to</small>" + pct(p.fxWorst) + "</b>";
  }
  function feeHead(p) {
    if (p.free) return '<b class="is-good">Free</b>';
    return '<b class="none">Paid</b>';
  }
  function planValue(p, key) {
    if (key === "_kyc") return KYC_LABEL[p.kyc];
    if (key === "_custody") return p.custody === "non-custodial" ? "Non-custodial (you hold the keys)" : "Custodial";
    return title(p[key] || "");
  }

  /* ---------- filtering and ranking ---------- */
  function tagsActive() { return Object.keys(state.tags).filter(function (t) { return state.tags[t]; }); }
  function matches(c, skipGroup) {
    var p = c.plans[0];
    if (state.q) {
      var hay = (c.name + " " + c.product + " " + c.tags.join(" ") + " " + (p.network || "") + " " + (p.rewards || "")).toLowerCase();
      if (!state.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) > -1; })) return false;
    }
    for (var i = 0; i < FACETS.length; i++) {
      if (FACETS[i][0] === skipGroup) continue;
      var on = FACETS[i][1].filter(function (t) { return state.tags[t]; });
      if (on.length && !on.some(function (t) { return c.tags.indexOf(t) > -1; })) return false;
    }
    if (state.country && c.countries[state.country] === "no") return false;
    if (state.priority === "free" && !p.free) return false;
    if (state.priority === "self" && p.custody !== "non-custodial") return false;
    if (state.priority === "kyc" && p.kyc === "full") return false;
    return true;
  }
  function ranked() {
    var list = CARDS.filter(function (c) { return matches(c); });
    var key = state.sort, rankAvail = { yes: 0, partial: 1, "": 2 };
    list.sort(function (a, b) {
      var pa = a.plans[0], pb = b.plans[0], d = 0;
      if (state.country) d = rankAvail[a.countries[state.country]] - rankAvail[b.countries[state.country]];
      if (d) return d;
      if (key === "cashback") d = (pb.cashback == null ? -1 : pb.cashback) - (pa.cashback == null ? -1 : pa.cashback);
      else if (key === "fx") d = (pa.fxWorst == null ? 99 : pa.fxWorst) - (pb.fxWorst == null ? 99 : pb.fxWorst);
      else if (key === "free") d = (pb.free ? 1 : 0) - (pa.free ? 1 : 0);
      else if (key === "name") d = a.name.localeCompare(b.name);
      return d || a.order - b.order;
    });
    return list;
  }

  /* ---------- finder rendering ---------- */
  function renderFacets() {
    $("facets").innerHTML = FACETS.map(function (f) {
      var pool = CARDS.filter(function (c) { return matches(c, f[0]); });
      return '<div class="facet"><h3>' + esc(f[0]) + '</h3><div class="facet__opts">' + f[1].map(function (t) {
        var n = pool.filter(function (c) { return c.tags.indexOf(t) > -1; }).length, on = !!state.tags[t];
        return '<button type="button" class="opt" data-tag="' + esc(t) + '" aria-pressed="' + on + '"' + (!n && !on ? " disabled" : "") + ">" + esc(t) + "<i>" + n + "</i></button>";
      }).join("") + "</div></div>";
    }).join("");
  }
  function rowHtml(c) {
    var p = c.plans[0], inCmp = state.compare.indexOf(c.id) > -1, av = "";
    if (state.country) {
      var s = c.countries[state.country];
      av = '<span class="pill pill--' + (s || "unknown") + '">' + esc(AVAIL_LABEL[s] + " in " + state.country) + "</span>";
    }
    var more = c.plans.length > 1 ? " · " + c.plans.length + " plans" : "";
    return '<article class="row">' + art(c) +
      '<div class="row__name"><a href="#card-' + c.id + '">' + esc(c.name) + "</a><p>" + esc(title(p.network || "")) + esc(more) + "</p></div>" +
      '<div class="cell cell--a"><div class="cell__label">Rewards</div>' + rewardHead(p) + "<span>" + esc(rewardText(p)) + "</span></div>" +
      '<div class="cell cell--b"><div class="cell__label">FX fee</div>' + fxHead(p) + "<span>" + esc(p.fx || "") + "</span></div>" +
      '<div class="cell cell--c"><div class="cell__label">Plan fee</div>' + feeHead(p) + "<span>" + esc(title(p.fee || "")) + "</span></div>" +
      '<div class="access"><span class="pill pill--' + p.kyc + '">' + KYC_LABEL[p.kyc] + "</span>" + (p.custody === "non-custodial" ? "<span>Self-custody</span>" : "<span>Custodial</span>") + av + "</div>" +
      '<button type="button" class="add" data-cmp="' + c.id + '" aria-pressed="' + inCmp + '" aria-label="' + (inCmp ? "Remove " : "Add ") + esc(c.name) + (inCmp ? " from" : " to") + ' compare" title="Compare">' + (inCmp ? "✓" : "+") + "</button></article>";
  }
  function sortBtn(label, key, dir) {
    return '<button type="button" data-sort="' + key + '"' + (state.sort === key ? ' aria-sort="' + dir + '"' : "") + ">" + label + "</button>";
  }
  function renderFinder() {
    var list = ranked(), active = tagsActive();
    renderFacets();
    $("count").textContent = list.length + " of " + CARDS.length + " cards";
    var chips = active.map(function (t) { return '<button type="button" class="chip" data-tag="' + esc(t) + '" aria-label="Remove filter ' + esc(t) + '">' + esc(t) + "</button>"; });
    if (state.country) chips.unshift('<button type="button" class="chip" data-clear="country" aria-label="Remove country">' + esc(state.country) + "</button>");
    $("active").innerHTML = chips.join("");
    var n = active.length;
    $("filter-count").textContent = n ? "(" + n + ")" : "";
    $("clear-filters").hidden = !(n || state.q || state.country || state.priority);
    var head = '<div class="cols"><span></span>' + sortBtn("Card", "name", "ascending") + sortBtn("Rewards", "cashback", "descending") + sortBtn("FX fee", "fx", "ascending") + sortBtn("Plan fee", "free", "ascending") + "<span>Access</span><span></span></div>";
    var body = list.length ? list.map(rowHtml).join("") :
      '<div class="empty"><strong>No card matches all of that.</strong><p>Try removing a filter. Region tags and the country question both narrow the list.</p><button type="button" class="btn btn--ghost" data-clear="all">Clear every filter</button></div>';
    var el = $("ledger");
    el.className = "ledger" + (state.layout === "grid" && list.length ? " is-grid" : "");
    el.innerHTML = head + body;
    $("sort").value = state.sort;
    $("view-list").setAttribute("aria-pressed", state.layout === "list");
    $("view-grid").setAttribute("aria-pressed", state.layout === "grid");
  }
  function clearAll() {
    state.q = ""; state.tags = {}; state.country = ""; state.priority = ""; state.sort = "featured";
    $("q").value = ""; $("q-country").value = ""; $("q-priority").value = "";
    renderFinder();
  }

  /* ---------- compare ---------- */
  function toggleCompare(id) {
    var i = state.compare.indexOf(id);
    if (i > -1) state.compare.splice(i, 1);
    else { if (state.compare.length >= 4) state.compare.shift(); state.compare.push(id); }
    store.set("compare", state.compare);
    renderTray();
  }
  function renderTray() {
    var n = state.compare.length, onCompare = location.hash === "#compare";
    $("tray").hidden = !n || onCompare;
    document.body.classList.toggle("has-tray", n > 0 && !onCompare);
    $("nav-count").hidden = !n; $("nav-count").textContent = n;
    $("tray-cards").innerHTML = state.compare.map(function (id) {
      var c = BY_ID[id];
      return '<button type="button" data-cmp="' + id + '" aria-label="Remove ' + esc(c.name) + '"><img src="images/cards/' + esc(c.img) + '.webp" alt="">' + esc(c.name) + "</button>";
    }).join("");
    $("tray-go").textContent = n < 2 ? "Add another to compare" : "Compare " + n + " cards";
  }
  function planOf(c) { return c.plans[state.plans[c.id] || 0] || c.plans[0]; }
  function renderCompare() {
    var cards = state.compare.map(function (id) { return BY_ID[id]; });
    var rest = CARDS.filter(function (c) { return state.compare.indexOf(c.id) < 0; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var html = '<div class="cmp-head"><p class="eyebrow">Side by side</p><h1>Compare card plans</h1><div class="cmp-tools">';
    if (cards.length < 4) html += '<select id="cmp-add" aria-label="Add a card to compare"><option value="">Add a card…</option>' + rest.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("") + "</select>";
    if (cards.length > 1) html += '<label class="check"><input type="checkbox" id="cmp-diff"' + (state.diff ? " checked" : "") + "> Only show rows that differ</label>";
    html += "</div></div>";
    if (!cards.length) {
      html += '<div class="ledger"><div class="empty"><strong>Nothing to compare yet.</strong><p>Pick up to four cards here, or press + on any card in the database.</p><a class="btn btn--ghost" href="#">Open the database</a></div></div><div style="height:64px"></div>';
      $("compare-page").innerHTML = html; return;
    }
    var plans = cards.map(planOf);
    var bestCb = Math.max.apply(null, plans.map(function (p) { return p.cashback == null ? -1 : p.cashback; }));
    var bestFx = Math.min.apply(null, plans.map(function (p) { return p.fxWorst == null ? 99 : p.fxWorst; }));
    html += '<div class="cmp-scroll"><table class="cmp"><thead><tr><th scope="row"></th>' + cards.map(function (c) {
      var sel = c.plans.length > 1 ? '<select data-plan="' + c.id + '" aria-label="Plan for ' + esc(c.name) + '">' + c.plans.map(function (p, i) { return '<option value="' + i + '"' + ((state.plans[c.id] || 0) === i ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select>" : "";
      return "<th>" + art(c) + '<a href="#card-' + c.id + '">' + esc(c.name) + "</a>" + sel + '<button type="button" class="link-btn" data-cmp="' + c.id + '">Remove</button></th>';
    }).join("") + "</tr></thead><tbody>";
    SCHEDULE.forEach(function (g) {
      var rows = "";
      g[1].forEach(function (f) {
        var vals = plans.map(function (p) { return planValue(p, f[1]); });
        if (state.diff && cards.length > 1 && vals.every(function (v) { return v === vals[0]; })) return;
        rows += '<tr><th scope="row">' + esc(f[0]) + "</th>" + vals.map(function (v, i) {
          var p = plans[i], best = cards.length > 1 && ((f[1] === "rewards" && p.cashback != null && p.cashback === bestCb && bestCb > 0) || (f[1] === "fx" && p.fxWorst != null && p.fxWorst === bestFx));
          return '<td class="' + (v ? (best ? "best" : "") : "unknown") + '">' + (v ? esc(v) : "Not published") + "</td>";
        }).join("") + "</tr>";
      });
      if (rows) html += '<tr class="group"><th colspan="' + (cards.length + 1) + '">' + esc(g[0]) + "</th></tr>" + rows;
    });
    html += '<tr class="group"><th colspan="' + (cards.length + 1) + '">Apply</th></tr><tr><th scope="row"></th>' + cards.map(function (c) {
      return "<td>" + (c.link ? '<a class="btn btn--accent" href="' + esc(safeUrl(c.link)) + '" target="_blank" rel="noopener sponsored">Issue card ↗</a>' : "") + "</td>";
    }).join("") + "</tr></tbody></table></div>";
    $("compare-page").innerHTML = html;
  }

  /* ---------- card page ---------- */
  var cardPlan = 0;
  function renderCard(c) {
    var p = c.plans[cardPlan] || c.plans[0], inCmp = state.compare.indexOf(c.id) > -1;
    var html = '<p class="crumb"><a href="#">← All cards</a></p><div class="cp-head">' + art(c, "cp-art") + '<div class="cp-info">' +
      '<p class="eyebrow">' + esc(title(p.network || "Card")) + " · " + esc(title(p.cardType || "")) + "</p><h1>" + esc(c.name) + "</h1>" +
      (c.updated ? '<p class="cp-meta">Review updated ' + esc(c.updated) + "</p>" : "") +
      '<div class="tags">' + c.tags.map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<div class="cta">' + (c.link ? '<a class="btn btn--accent" href="' + esc(safeUrl(c.link)) + '" target="_blank" rel="noopener sponsored">Issue card ↗</a>' : "") +
      '<button type="button" class="btn btn--ghost" data-cmp="' + c.id + '" aria-pressed="' + inCmp + '">' + (inCmp ? "✓ In compare" : "+ Add to compare") + "</button></div>" +
      (c.promo ? '<div class="promo"><span>' + esc(c.promo) + "</span>" + (c.promoCode ? '<code id="promo-code">' + esc(c.promoCode) + '</code><button type="button" class="link-btn" id="copy-code">Copy code</button>' : "") + "</div>" : "") +
      "</div></div>";
    if (c.plans.length > 1) html += '<div class="plans" role="tablist" aria-label="Plans">' + c.plans.map(function (pl, i) { return '<button type="button" role="tab" data-tab="' + i + '" aria-selected="' + (i === cardPlan) + '">' + esc(pl.name) + "</button>"; }).join("") + "</div>";
    html += '<dl class="stats">' +
      '<div class="stat"><dt>Rewards</dt><dd>' + rewardHead(p) + "<span>" + esc(rewardText(p)) + "</span></dd></div>" +
      '<div class="stat"><dt>FX fee</dt><dd>' + fxHead(p) + "<span>" + esc(p.fx || "") + "</span></dd></div>" +
      '<div class="stat"><dt>Plan fee</dt><dd>' + feeHead(p) + "<span>" + esc(title(p.fee || "")) + "</span></dd></div>" +
      '<div class="stat"><dt>Access</dt><dd><b>' + KYC_LABEL[p.kyc] + "</b><span>" + (p.custody === "non-custodial" ? "Non-custodial wallet" : "Custodial wallet") + "</span></dd></div></dl>";
    html += '<div class="cp-body"><div class="cp-main">';
    SCHEDULE.forEach(function (g) {
      html += '<section class="sched"><h2>' + esc(g[0]) + "</h2><dl>" + g[1].map(function (f) {
        var v = planValue(p, f[1]);
        return '<div class="line"><dt>' + esc(f[0]) + "</dt><dd" + (v ? "" : ' class="unknown"') + ">" + (v ? esc(v) : "Not published") + "</dd></div>";
      }).join("") + "</dl></section>";
    });
    if (c.faq.length) html += "<section><h2>Questions about " + esc(c.name) + '</h2><div class="faq__list">' + c.faq.map(function (f) {
      var src = f.src.length ? '<p class="src">Source: ' + f.src.map(function (u) { return '<a href="' + esc(safeUrl(u)) + '" target="_blank" rel="noopener">' + esc(host(u)) + "</a>"; }).join(", ") + "</p>" : "";
      return '<details class="qa"><summary>' + esc(f.q) + "</summary><p>" + esc(f.a) + "</p>" + src + "</details>";
    }).join("") + "</div></section>";
    html += '<p class="note">Card terms change, including pricing, limits, rewards and eligibility. FX is not always limited to the provider fee shown here: card networks and acquiring banks can add their own conversion layer, often around 1% depending on route and merchant currency. Check the provider\'s in-app and legal pricing pages before you issue or use a card.</p></div>';
    html += '<aside class="cp-side"><section><h2>Where you can get it</h2>' + (p.availability ? '<p class="cp-meta" style="margin-bottom:10px">' + esc(p.availability) + "</p>" : "") + '<ul class="countries">' + DATA.countries.map(function (k) {
      var s = c.countries[k];
      return "<li><span>" + esc(k) + '</span><span class="pill pill--' + (s || "unknown") + '">' + AVAIL_LABEL[s] + "</span></li>";
    }).join("") + "</ul></section>";
    if (c.sources.length) html += '<section><h2>Sources</h2><ul class="srcs">' + c.sources.map(function (s) { return '<li><a href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener">' + esc(s.label) + " ↗</a></li>"; }).join("") + "</ul></section>";
    html += "</aside></div>";
    $("card-page").innerHTML = html;
  }

  /* ---------- routing ---------- */
  var finderScroll = 0, current = "finder";
  function route() {
    var h = location.hash.replace(/^#/, ""), view = "finder", card = null;
    if (h === "compare") view = "compare";
    else if (h.indexOf("card-") === 0 && BY_ID[h.slice(5)]) { view = "card"; card = BY_ID[h.slice(5)]; }
    if (current === "finder" && view !== "finder") finderScroll = window.scrollY;
    ["finder", "card", "compare"].forEach(function (v) { $("view-" + v).hidden = v !== view; });
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (view === "card") { cardPlan = 0; renderCard(card); document.title = card.name + " · Crypto Cards Database"; }
    else if (view === "compare") { renderCompare(); document.title = "Compare · Crypto Cards Database"; }
    else { renderFinder(); document.title = "Crypto Cards Database"; }
    renderTray();
    window.scrollTo(0, view === "finder" && current !== "finder" ? finderScroll : 0);
    current = view;
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tag],[data-cmp],[data-sort],[data-clear],[data-tab]");
    if (!t) return;
    if (t.hasAttribute("data-tag")) { var tag = t.getAttribute("data-tag"); state.tags[tag] = !state.tags[tag]; renderFinder(); }
    else if (t.hasAttribute("data-cmp")) {
      toggleCompare(t.getAttribute("data-cmp"));
      if (current === "compare") renderCompare(); else if (current === "card") renderCard(BY_ID[location.hash.slice(6)]); else renderFinder();
    }
    else if (t.hasAttribute("data-sort")) { state.sort = t.getAttribute("data-sort"); renderFinder(); }
    else if (t.hasAttribute("data-clear")) {
      if (t.getAttribute("data-clear") === "country") { state.country = ""; $("q-country").value = ""; renderFinder(); } else clearAll();
    }
    else if (t.hasAttribute("data-tab")) { cardPlan = +t.getAttribute("data-tab"); renderCard(BY_ID[location.hash.slice(6)]); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "cmp-add" && t.value) { toggleCompare(t.value); renderCompare(); }
    else if (t.id === "cmp-diff") { state.diff = t.checked; renderCompare(); }
    else if (t.hasAttribute("data-plan")) { state.plans[t.getAttribute("data-plan")] = +t.value; renderCompare(); }
  });
  document.addEventListener("click", function (e) {
    if (e.target.id !== "copy-code") return;
    var code = $("promo-code"), btn = e.target;
    var done = function () { btn.textContent = "Copied"; };
    var fallback = function () { var r = document.createRange(); r.selectNodeContents(code); var s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = "Selected, press copy"; };
    try { navigator.clipboard.writeText(code.textContent).then(done, fallback); } catch (err) { fallback(); }
  });
  $("q").addEventListener("input", function () { state.q = this.value.trim(); renderFinder(); });
  $("sort").addEventListener("change", function () { state.sort = this.value; renderFinder(); });
  $("q-country").addEventListener("change", function () { state.country = this.value; renderFinder(); });
  $("q-priority").addEventListener("change", function () {
    state.priority = this.value;
    state.sort = { cashback: "cashback", fx: "fx" }[this.value] || "featured";
    renderFinder();
  });
  $("clear-filters").addEventListener("click", clearAll);
  $("view-list").addEventListener("click", function () { state.layout = "list"; store.set("layout", "list"); renderFinder(); });
  $("view-grid").addEventListener("click", function () { state.layout = "grid"; store.set("layout", "grid"); renderFinder(); });
  $("rail-toggle").addEventListener("click", function () {
    var open = $("rail").classList.toggle("is-open");
    this.setAttribute("aria-expanded", open);
  });
  $("tray-clear").addEventListener("click", function () { state.compare = []; store.set("compare", []); renderTray(); if (current === "finder") renderFinder(); });
  $("theme-btn").addEventListener("click", function () {
    var root = document.documentElement, dark = root.getAttribute("data-theme") ? root.getAttribute("data-theme") === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    root.setAttribute("data-theme", dark ? "light" : "dark");
    store.set("theme", dark ? "light" : "dark");
  });
  window.addEventListener("hashchange", route);

  /* ---------- boot ---------- */
  var savedTheme = store.get("theme", null);
  if (savedTheme && !document.documentElement.getAttribute("data-theme")) document.documentElement.setAttribute("data-theme", savedTheme);
  $("q-country").innerHTML = '<option value="">any country</option>' + DATA.countries.map(function (c) { return '<option value="' + esc(c) + '">' + (c === "UAE" ? "the UAE" : c.indexOf("United") === 0 ? "the " + esc(c) : esc(c)) + "</option>"; }).join("");
  var planCount = CARDS.reduce(function (n, c) { return n + c.plans.length; }, 0);
  $("hero-meta").textContent = CARDS.length + " cards · " + planCount + " plans · sourced from provider docs";
  $("hero-fan").innerHTML = ["ether-fi", "kolo", "kast"].map(function (id) { var c = BY_ID[id]; return c ? '<img src="images/cards/' + esc(c.img) + '.webp" alt="" width="320" height="202">' : ""; }).join("");
  $("faq").innerHTML = HOME_FAQ.map(function (f) { return '<details class="qa"><summary>' + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>"; }).join("");
  route();
})();

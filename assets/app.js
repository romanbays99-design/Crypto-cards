/* Crypto Cards Database: finder, card pages, compare and guides. No dependencies.
   Views are routed on the URL hash: "" (finder), "#card-<id>", "#guides",
   "#compare", and "#compare--<id>[-p<plan>]--<id>..." for a shareable comparison. */
(function () {
  "use strict";
  var DATA = window.CC_DATA, CARDS = DATA.cards, BY_ID = {};
  CARDS.forEach(function (c, i) { c.order = i; BY_ID[c.id] = c; });

  var FACETS = [
    ["Region", ["Global", "EU/EEA", "UK", "US", "CIS", "LatAm", "MENA", "APAC"]],
    ["Minimum cashback", null],
    ["Verification", ["No-KYC", "Light KYC", "KYC"]],
    ["Custody", ["Non-Custodial", "Custodial"]],
    ["Network", ["Visa", "Mastercard"]],
    ["Format", ["Physical+Virtual", "Virtual only"]],
    ["Banking", ["IBAN", "SEPA", "SWIFT"]],
    ["Costs and rewards", ["No monthly fee", "Free issue", "0% FX", "Points system", "Yield"]],
    ["More", ["Apple+Google Pay", "Telegram Mini App", "Multicurrency", "Waitlist"]]
  ];
  var CB_STEPS = [0, 1, 2, 3, 5];
  var KYC_HELP = {
    "No-KYC": "No ID document is needed to get the card. Limits are usually lower and fees higher, and the provider can still ask for checks later.",
    "Light KYC": "Basic personal details, sometimes with a quick ID scan, before the card is issued. Limits sit between no-KYC and full KYC.",
    "KYC": "Full identity verification: a government ID, usually a selfie, sometimes proof of address. Unlocks the highest limits and most features."
  };
  var KYC_TAG = { none: "No-KYC", light: "Light KYC", full: "KYC" };
  var KYC_LABEL = { none: "No KYC", light: "Light KYC", full: "Full KYC" };
  var AVAIL_LABEL = { yes: "Available", partial: "Partly", no: "Not available", "": "Not confirmed" };
  var PRIORITY_LABEL = { cashback: "Most cashback", fx: "Low FX fees", free: "No plan fee", self: "Own keys", kyc: "Little or no KYC" };
  /* Tags already shown as metrics on a tile; the tile's tag row skips them. */
  var METRIC_TAGS = ["KYC", "No-KYC", "Light KYC", "Custodial", "Non-Custodial", "Live", "Visa", "Mastercard", "Cashback 1%", "Cashback 2%", "Cashback 3%", "Cashback 3%+", "No monthly fee", "FX fee", "0% FX"];

  /* Satoshi's own picks, most used first. */
  var WALLET = [
    ["karta", "My AI subscriptions", "I use Karta for Claude, OpenAI, Grok Bot and Gemini subscriptions."],
    ["kast", "For the interface", "I like the user interface. That's what keeps it near the top of my wallet."],
    ["ether-fi", "Interest and wallet", "I like the interest payments and having the wallet alongside my card."],
    ["kolo", "For the cashback", "The cashback is what keeps me using Kolo."],
    ["bybit", "Straight from my balance", "I like how it takes payments from my Bybit balance. It's a provider I personally trust."],
    ["wirex", "My OG card", "My first crypto card, back when there weren't many to choose from. The OG in my wallet."]
  ];
  var IN_WALLET = {};
  WALLET.forEach(function (w) { IN_WALLET[w[0]] = w; });

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
  var GUIDES = [
    { id: "cashback", title: "Reading a cashback rate", lead: "The number on a card's homepage is the best case. What you earn depends on the conditions around it.",
      body: [
        "Most rates in this database are headline maximums, written as \"up to\". The top tier often needs a paid plan or tokens locked with the provider. Wirex's 8% Cryptoback, for example, sits on its top plan and needs 7.5 million WXT locked.",
        "Many cards also step the rate down as you spend. Ether.fi's Core plan pays 3% on the first $2,000 a month, then 1%, then 0.5%. Spend $5,000 a month and your blended rate is well below 3%.",
        "Check what the reward is paid in. A reward paid in the provider's own token or in points moves with that token's price, and points may only be worth something inside the provider's app."
      ],
      action: ["Show cards with 3% or more", function () { clearAll(true); state.minCb = 3; }] },
    { id: "kyc", title: "KYC levels explained", lead: "How much identity checking a card needs decides how fast you get it and how much you can spend.",
      body: [
        "No-KYC: " + KYC_HELP["No-KYC"],
        "Light KYC: " + KYC_HELP["Light KYC"],
        "KYC: " + KYC_HELP.KYC,
        "No-KYC is a lighter compliance model, not anonymity. Card payments are still recorded and blockchain transfers stay traceable."
      ],
      action: ["Show No-KYC and Light KYC cards", function () { clearAll(true); state.tags["No-KYC"] = true; state.tags["Light KYC"] = true; }] },
    { id: "fx", title: "What FX really costs", lead: "Paying in a currency your card does not hold usually costs more than the FX fee in the table.",
      body: [
        "The FX fee in this database is the provider's own markup. On top of it, the card network and the merchant's bank can add a conversion layer, often around 1% depending on route and currency.",
        "Some cards charge more on weekends, when currency markets are closed. Several plans here add 1% on Saturday and Sunday or above a monthly allowance.",
        "When a card terminal or website abroad offers to charge you in your home currency, decline and pay in the local currency. That offer, called dynamic currency conversion, uses the merchant's rate, which is rarely good."
      ],
      action: ["Sort by lowest FX fee", function () { clearAll(true); state.sort = "fx"; }] },
    { id: "custody", title: "Custodial or non-custodial", lead: "This decides who holds the money behind your card.",
      body: [
        "With a custodial card, the provider holds your balance, much like a bank or an exchange account. Recovery is easy if you lose your phone, but your funds depend on that company.",
        "With a non-custodial card, you spend from a wallet you control, usually a smart-contract wallet such as the one behind Gnosis Pay or Ether.fi. The provider can't move your funds, but losing your keys can mean losing the balance.",
        "Non-custodial cards still need a regulated issuer, so most require KYC."
      ],
      action: ["Show non-custodial cards", function () { clearAll(true); state.tags["Non-Custodial"] = true; }] }
  ];
  var SCHEDULE = [
    ["Costs", [["Plan fee / requirements", "fee"], ["FX fee on card spend", "fx"], ["ATM fee", "atmFee"], ["Virtual card issue", "virtualIssue"], ["Physical card issue", "physicalIssue"], ["Physical shipping", "shipping"], ["Extra virtual cards", "extraVirtual"], ["Extra physical cards", "extraPhysical"]]],
    ["Rewards", [["Rewards", "rewards"], ["Yield", "yieldNote"]]],
    ["Limits", [["Spend limits", "spendLimits"], ["ATM limits", "atmLimits"], ["Maximum cards", "maxCards"]]],
    ["Funding", [["Top up with crypto", "topupCrypto"], ["Top up by bank transfer", "topupBank"], ["Bank rails", "bankRails"], ["SEPA", "sepa"], ["SWIFT", "swift"], ["IBAN", "iban"]]],
    ["Card and account", [["Network", "network"], ["Card type", "cardType"], ["Verification", "_kyc"], ["Custody", "_custody"], ["Base currency", "baseCurrency"], ["Account currencies", "currencies"], ["Apple Pay", "applePay"], ["Google Pay", "googlePay"], ["Availability", "availability"]]]
  ];

  var state = { q: "", tags: {}, minCb: 0, country: "", priority: "", sort: "featured", layout: "list", compare: [], plans: {}, diff: false, kycHelp: false };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("cc:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("cc:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  state.compare = store.get("compare", []).filter(function (id) { return BY_ID[id]; }).slice(0, 4);
  state.plans = store.get("plans", {}) || {};
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
  function kycPill(p) { return '<span class="pill pill--' + p.kyc + '" title="' + esc(KYC_HELP[KYC_TAG[p.kyc]]) + '">' + KYC_LABEL[p.kyc] + "</span>"; }
  function mine(c) { return IN_WALLET[c.id] ? '<img class="mine" src="images/brand/eye-mark.webp" alt="In my wallet" title="In my wallet" width="16" height="16">' : ""; }

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
  function feeHead(p) { return p.free ? '<b class="is-good">Free</b>' : '<b class="none">Paid</b>'; }
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
      if (FACETS[i][0] === skipGroup || !FACETS[i][1]) continue;
      var on = FACETS[i][1].filter(function (t) { return state.tags[t]; });
      if (on.length && !on.some(function (t) { return c.tags.indexOf(t) > -1; })) return false;
    }
    if (skipGroup !== "Minimum cashback" && state.minCb && !(p.cashback >= state.minCb)) return false;
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
      var pool = CARDS.filter(function (c) { return matches(c, f[0]); }), opts, head = esc(f[0]), extra = "";
      if (!f[1]) {
        opts = CB_STEPS.map(function (v) {
          var n = pool.filter(function (c) { return !v || c.plans[0].cashback >= v; }).length, on = state.minCb === v;
          return '<button type="button" class="opt" data-cb="' + v + '" aria-pressed="' + on + '"' + (!n && !on ? " disabled" : "") + ">" + (v ? "≥ " + v + "%" : "Any") + "<i>" + n + "</i></button>";
        }).join("");
        extra = '<p class="facet__note">Headline "up to" rate on the default plan.</p>';
      } else {
        opts = f[1].map(function (t) {
          var n = pool.filter(function (c) { return c.tags.indexOf(t) > -1; }).length, on = !!state.tags[t];
          return '<button type="button" class="opt" data-tag="' + esc(t) + '" aria-pressed="' + on + '"' + (KYC_HELP[t] ? ' title="' + esc(KYC_HELP[t]) + '"' : "") + (!n && !on ? " disabled" : "") + ">" + esc(t) + "<i>" + n + "</i></button>";
        }).join("");
      }
      if (f[0] === "Verification") {
        head += ' <button type="button" class="tip-btn" data-tip aria-expanded="' + state.kycHelp + '" aria-controls="kyc-help" aria-label="What the KYC levels mean">?</button>';
        extra = '<dl class="tip" id="kyc-help"' + (state.kycHelp ? "" : " hidden") + ">" + Object.keys(KYC_HELP).map(function (k) { return "<dt>" + esc(k) + "</dt><dd>" + esc(KYC_HELP[k]) + "</dd>"; }).join("") + "</dl>";
      }
      return '<div class="facet"><h3>' + head + "</h3>" + (f[0] === "Verification" ? extra : "") + '<div class="facet__opts">' + opts + "</div>" + (f[0] === "Verification" ? "" : extra) + "</div>";
    }).join("");
  }
  function rowHtml(c) {
    var p = c.plans[0], inCmp = state.compare.indexOf(c.id) > -1, av = "";
    if (state.country) {
      var s = c.countries[state.country];
      av = '<span class="pill pill--' + (s || "unknown") + '">' + esc(AVAIL_LABEL[s] + " in " + state.country) + "</span>";
    }
    var more = c.plans.length > 1 ? " · " + c.plans.length + " plans" : "";
    var extraTags = c.tags.filter(function (t) { return METRIC_TAGS.indexOf(t) < 0; });
    var custody = p.custody === "non-custodial" ? "Self-custody" : "Custodial";
    return '<article class="row">' + art(c) +
      '<div class="row__name"><a href="#card-' + c.id + '">' + esc(c.name) + "</a><p>" + mine(c) + esc(title(p.network || "")) + esc(more) + "</p></div>" +
      '<div class="cell cell--a"><div class="cell__label">Rewards</div>' + rewardHead(p) + "<span>" + esc(rewardText(p)) + "</span></div>" +
      '<div class="cell cell--b"><div class="cell__label">FX fee</div>' + fxHead(p) + "<span>" + esc(p.fx || "") + "</span></div>" +
      '<div class="cell cell--c"><div class="cell__label">Plan fee</div>' + feeHead(p) + "<span>" + esc(title(p.fee || "")) + "</span></div>" +
      '<div class="cell cell--d"><div class="cell__label">KYC · Custody</div><b class="cell__kyc">' + KYC_LABEL[p.kyc] + "</b><span>" + custody + "</span></div>" +
      '<div class="access">' + kycPill(p) + "<span>" + custody + "</span>" + av + "</div>" +
      '<div class="row__tags">' + extraTags.slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") +
      (extraTags.length > 3 ? '<span class="tag tag--more" title="' + esc(extraTags.slice(3).join(", ")) + '">+' + (extraTags.length - 3) + " more</span>" : "") + av + "</div>" +
      '<button type="button" class="add" data-cmp="' + c.id + '" aria-pressed="' + inCmp + '" aria-label="' + (inCmp ? "Remove " : "Add ") + esc(c.name) + (inCmp ? " from" : " to") + ' compare" title="Compare">' + (inCmp ? "✓" : "+") + "</button></article>";
  }
  function sortBtn(label, key, dir) {
    return '<button type="button" data-sort="' + key + '"' + (state.sort === key ? ' aria-sort="' + dir + '"' : "") + ">" + label + "</button>";
  }
  function renderActive() {
    var chips = [];
    if (state.q) chips.push(['data-clear="q"', "Search: " + state.q]);
    if (state.country) chips.push(['data-clear="country"', state.country]);
    if (state.priority) chips.push(['data-clear="priority"', PRIORITY_LABEL[state.priority]]);
    if (state.minCb) chips.push(['data-clear="cb"', "Cashback ≥ " + state.minCb + "%"]);
    tagsActive().forEach(function (t) { chips.push(['data-tag="' + esc(t) + '"', t]); });
    $("activebar").hidden = !chips.length;
    $("active").innerHTML = chips.map(function (c) { return '<button type="button" class="chip" ' + c[0] + ' aria-label="Remove filter ' + esc(c[1]) + '">' + esc(c[1]) + "</button>"; }).join("");
    $("filter-count").textContent = chips.length ? "(" + chips.length + ")" : "";
    $("clear-filters").hidden = !chips.length;
  }
  function renderFinder() {
    var list = ranked();
    renderFacets();
    renderActive();
    $("count").textContent = list.length + " of " + CARDS.length + " cards";
    var head = '<div class="cols"><span></span>' + sortBtn("Card", "name", "ascending") + sortBtn("Rewards", "cashback", "descending") + sortBtn("FX fee", "fx", "ascending") + sortBtn("Plan fee", "free", "ascending") + "<span>Access</span><span></span></div>";
    var body = list.length ? list.map(rowHtml).join("") :
      '<div class="empty"><strong>No card matches all of that.</strong><p>Try removing a filter. Region tags and the country question both narrow the list.</p><button type="button" class="btn btn--ghost" data-clear="all">Clear all filters</button></div>';
    var el = $("ledger");
    el.className = "ledger" + (state.layout === "grid" && list.length ? " is-grid" : "");
    el.innerHTML = head + body;
    $("sort").value = state.sort;
    $("view-list").setAttribute("aria-pressed", state.layout === "list");
    $("view-grid").setAttribute("aria-pressed", state.layout === "grid");
    renderWallet();
  }
  function renderWallet() {
    $("wallet").innerHTML = WALLET.map(function (w, i) {
      var c = BY_ID[w[0]];
      if (!c) return "";
      var inCmp = state.compare.indexOf(c.id) > -1;
      return '<li class="pickcard"><span class="pickcard__rank num">' + (i + 1) + "</span>" + art(c) +
        '<div class="pickcard__body"><p class="pickcard__why">' + esc(w[1]) + '</p><h3><a href="#card-' + c.id + '">' + esc(c.name) + "</a></h3><p>" + esc(w[2]) + "</p></div>" +
        '<button type="button" class="btn btn--ghost btn--sm" data-cmp="' + c.id + '" aria-pressed="' + inCmp + '">' + (inCmp ? "✓ In compare" : "+ Compare") + "</button></li>";
    }).join("");
  }
  function clearAll(silent) {
    state.q = ""; state.tags = {}; state.minCb = 0; state.country = ""; state.priority = ""; state.sort = "featured";
    $("q").value = ""; $("q-country").value = ""; $("q-priority").value = "";
    if (!silent) renderFinder();
  }

  /* ---------- compare ---------- */
  function encodeCompare() {
    return "compare" + state.compare.map(function (id) { var p = state.plans[id] || 0; return "--" + id + (p ? "-p" + p : ""); }).join("");
  }
  function decodeCompare(h) {
    var ids = [], plans = {};
    h.split("--").slice(1).forEach(function (seg) {
      var m = seg.match(/^(.+)-p(\d+)$/), id = seg, plan = 0;
      if (m && BY_ID[m[1]]) { id = m[1]; plan = +m[2]; }
      if (BY_ID[id] && ids.indexOf(id) < 0 && ids.length < 4) { ids.push(id); if (plan < BY_ID[id].plans.length) plans[id] = plan; }
    });
    return { ids: ids, plans: plans };
  }
  function saveCompare() { store.set("compare", state.compare); store.set("plans", state.plans); }
  function toggleCompare(id) {
    var i = state.compare.indexOf(id);
    if (i > -1) state.compare.splice(i, 1);
    else { if (state.compare.length >= 4) state.compare.shift(); state.compare.push(id); }
    saveCompare();
    renderTray();
  }
  function renderTray() {
    var n = state.compare.length, onCompare = current === "compare";
    $("tray").hidden = !n || onCompare;
    document.body.classList.toggle("has-tray", n > 0 && !onCompare);
    $("nav-count").hidden = !n; $("nav-count").textContent = n;
    var slots = state.compare.map(function (id) {
      var c = BY_ID[id];
      return '<button type="button" data-cmp="' + id + '" aria-label="Remove ' + esc(c.name) + ' from compare"><img src="images/cards/' + esc(c.img) + '.webp" alt="">' + esc(c.name) + "</button>";
    });
    for (var i = n; i < 4; i++) slots.push('<span class="slot" aria-hidden="true"></span>');
    $("tray-cards").innerHTML = slots.join("");
    $("tray-go").textContent = "Compare now (" + n + "/4)";
  }
  function planOf(c) { return c.plans[state.plans[c.id] || 0] || c.plans[0]; }
  function syncCompareHash() {
    var want = "#" + encodeCompare();
    if (location.hash !== want) { skipNextRoute = true; location.replace(want); }
  }
  function renderCompare() {
    syncCompareHash();
    var cards = state.compare.map(function (id) { return BY_ID[id]; });
    var rest = CARDS.filter(function (c) { return state.compare.indexOf(c.id) < 0; }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var html = '<div class="cmp-head"><p class="eyebrow">Side by side</p><h1>Compare card plans</h1><div class="cmp-tools">';
    if (cards.length < 4) html += '<select id="cmp-add" aria-label="Add a card to compare"><option value="">Add a card (' + cards.length + '/4)…</option>' + rest.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("") + "</select>";
    if (cards.length > 1) html += '<label class="switch"><input type="checkbox" id="cmp-diff"' + (state.diff ? " checked" : "") + '><span class="switch__ui" aria-hidden="true"></span>Show differences only</label>';
    if (cards.length) html += '<button type="button" class="btn btn--ghost" id="cmp-copy">Copy comparison link</button><span class="cmp-msg" id="cmp-msg" role="status"></span>';
    html += "</div>";
    if (cards.length > 1) html += '<p class="legend"><span class="legend__swatch"></span>Green marks the best value where the figures can be compared directly: lowest FX fee, highest headline cashback and free plans.</p>';
    html += "</div>";
    if (!cards.length) {
      html += '<div class="ledger"><div class="empty"><strong>Nothing to compare yet.</strong><p>Pick up to four cards here, or press + on any card in the database.</p><a class="btn btn--ghost" href="#">Open the database</a></div></div><div style="height:64px"></div>';
      $("compare-page").innerHTML = html; return;
    }
    var plans = cards.map(planOf);
    var cbs = plans.map(function (p) { return p.cashback == null ? -1 : p.cashback; });
    var fxs = plans.map(function (p) { return p.fxWorst == null ? 99 : p.fxWorst; });
    var bestCb = Math.max.apply(null, cbs), bestFx = Math.min.apply(null, fxs);
    var allFree = plans.every(function (p) { return p.free; }), anyFree = plans.some(function (p) { return p.free; });
    var cbSpread = bestCb > 0 && cbs.some(function (v) { return v !== bestCb; });
    var fxSpread = bestFx < 99 && fxs.some(function (v) { return v !== bestFx; });
    function isBest(key, p) {
      if (cards.length < 2) return false;
      if (key === "rewards") return cbSpread && p.cashback === bestCb;
      if (key === "fx") return fxSpread && p.fxWorst === bestFx;
      if (key === "fee") return anyFree && !allFree && p.free;
      return false;
    }
    var shown = 0;
    html += '<div class="cmp-scroll"><table class="cmp"><thead><tr><th scope="row"><span class="sr">Field</span></th>' + cards.map(function (c) {
      var sel = c.plans.length > 1 ? '<select data-plan="' + c.id + '" aria-label="Plan for ' + esc(c.name) + '">' + c.plans.map(function (p, i) { return '<option value="' + i + '"' + ((state.plans[c.id] || 0) === i ? " selected" : "") + ">" + esc(p.name) + "</option>"; }).join("") + "</select>" : '<p class="cmp-plan">' + esc(c.plans[0].name) + "</p>";
      return "<th>" + art(c) + '<a href="#card-' + c.id + '">' + esc(c.name) + "</a>" + sel + '<button type="button" class="link-btn" data-cmp="' + c.id + '">Remove</button></th>';
    }).join("") + "</tr></thead><tbody>";
    SCHEDULE.forEach(function (g) {
      var rows = "";
      g[1].forEach(function (f) {
        var vals = plans.map(function (p) { return planValue(p, f[1]); });
        if (state.diff && cards.length > 1 && vals.every(function (v) { return v === vals[0]; })) return;
        shown++;
        rows += '<tr><th scope="row">' + esc(f[0]) + "</th>" + vals.map(function (v, i) {
          var cls = !v ? "unknown" : isBest(f[1], plans[i]) ? "best" : "";
          return "<td" + (cls ? ' class="' + cls + '"' : "") + ">" + (v ? esc(v) : "Not published") + (cls === "best" ? '<span class="sr"> (best value)</span>' : "") + "</td>";
        }).join("") + "</tr>";
      });
      if (rows) html += '<tr class="group"><th colspan="' + (cards.length + 1) + '">' + esc(g[0]) + "</th></tr>" + rows;
    });
    if (!shown) html += '<tr><td colspan="' + (cards.length + 1) + '" class="unknown">These plans match on every field. Turn off "Show differences only" to see them.</td></tr>';
    html += '<tr class="group"><th colspan="' + (cards.length + 1) + '">Apply</th></tr><tr><th scope="row"></th>' + cards.map(function (c) {
      return "<td>" + (c.link ? '<a class="btn btn--accent" href="' + esc(safeUrl(c.link)) + '" target="_blank" rel="noopener sponsored">Issue card ↗</a>' : "") + "</td>";
    }).join("") + "</tr></tbody></table></div>";
    $("compare-page").innerHTML = html;
  }
  function copyLink() {
    var url = location.href.split("#")[0] + "#" + encodeCompare(), msg = $("cmp-msg");
    var fallback = function () {
      msg.innerHTML = '<input class="cmp-url" id="cmp-url" readonly aria-label="Comparison link" value="' + esc(url) + '">';
      var inp = $("cmp-url"); inp.focus(); inp.select();
    };
    try { navigator.clipboard.writeText(url).then(function () { msg.textContent = "Link copied"; }, fallback); } catch (err) { fallback(); }
  }

  /* ---------- card page ---------- */
  var cardPlan = 0;
  function renderCard(c) {
    var p = c.plans[cardPlan] || c.plans[0], inCmp = state.compare.indexOf(c.id) > -1, w = IN_WALLET[c.id];
    var html = '<p class="crumb"><a href="#">← All cards</a></p><div class="cp-head">' + art(c, "cp-art") + '<div class="cp-info">' +
      '<p class="eyebrow">' + esc(title(p.network || "Card")) + " · " + esc(title(p.cardType || "")) + "</p><h1>" + esc(c.name) + "</h1>" +
      (c.updated ? '<p class="cp-meta">Review updated ' + esc(c.updated) + "</p>" : "") +
      (w ? '<blockquote class="mynote"><img src="images/brand/eye-mark.webp" alt="" width="28" height="28"><p><span>In my wallet · ' + esc(w[1]) + "</span>" + esc(w[2]) + "</p></blockquote>" : "") +
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
      '<div class="stat"><dt>Access</dt><dd><b>' + KYC_LABEL[p.kyc] + "</b><span>" + (p.custody === "non-custodial" ? "Non-custodial wallet" : "Custodial wallet") + "</span><span>" + esc(KYC_HELP[KYC_TAG[p.kyc]]) + "</span></dd></div></dl>";
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

  /* ---------- guides ---------- */
  function renderGuides() {
    var html = '<div class="gd-head"><p class="eyebrow">Guides</p><h1>Before you pick a card</h1><p>Four short reads on the terms that decide what a card really costs. Each one ends with a filter that applies it to the database.</p>' +
      '<ol class="gd-toc">' + GUIDES.map(function (g) { return '<li><button type="button" class="link-btn" data-goto="gd-' + g.id + '">' + esc(g.title) + "</button></li>"; }).join("") + "</ol></div>";
    html += GUIDES.map(function (g, i) {
      return '<article class="guide" id="gd-' + g.id + '"><h2>' + esc(g.title) + '</h2><p class="guide__lead">' + esc(g.lead) + "</p>" +
        g.body.map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") +
        '<button type="button" class="btn btn--ghost" data-guide="' + i + '">' + esc(g.action[0]) + " →</button></article>";
    }).join("");
    $("guides-page").innerHTML = html;
  }

  /* ---------- routing ---------- */
  var finderScroll = 0, current = "", skipNextRoute = false, scrollToFinder = false;
  function route() {
    if (skipNextRoute) { skipNextRoute = false; return; }
    var h = location.hash.replace(/^#/, ""), view = "finder", card = null, prev = current;
    if (h === "compare" || h.indexOf("compare--") === 0) {
      view = "compare";
      if (h !== "compare") { var d = decodeCompare(h); state.compare = d.ids; state.plans = Object.assign({}, state.plans, d.plans); saveCompare(); }
    }
    else if (h === "guides") view = "guides";
    else if (h.indexOf("card-") === 0 && BY_ID[h.slice(5)]) { view = "card"; card = BY_ID[h.slice(5)]; }
    if (prev === "finder" && view !== "finder") finderScroll = window.scrollY;
    current = view;
    ["finder", "card", "compare", "guides"].forEach(function (v) { $("view-" + v).hidden = v !== view; });
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    if (view === "card") { cardPlan = 0; renderCard(card); document.title = card.name + " · Crypto Cards Database"; }
    else if (view === "compare") { renderCompare(); document.title = "Compare · Crypto Cards Database"; }
    else if (view === "guides") { renderGuides(); document.title = "Guides · Crypto Cards Database"; }
    else { renderFinder(); document.title = "Crypto Cards Database"; }
    renderTray();
    if (scrollToFinder && view === "finder") { scrollToFinder = false; $("finder-top").scrollIntoView(); }
    else if (prev !== view || view === "card") window.scrollTo(0, view === "finder" && prev ? finderScroll : 0);
  }
  function rerender() {
    if (current === "compare") renderCompare();
    else if (current === "card") renderCard(BY_ID[location.hash.slice(6)]);
    else if (current === "finder") renderFinder();
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tag],[data-cb],[data-cmp],[data-sort],[data-clear],[data-tab],[data-tip],[data-guide],[data-goto]");
    if (!t) return;
    if (t.hasAttribute("data-tag")) { var tag = t.getAttribute("data-tag"); state.tags[tag] = !state.tags[tag]; renderFinder(); }
    else if (t.hasAttribute("data-cb")) { var v = +t.getAttribute("data-cb"); state.minCb = state.minCb === v ? 0 : v; renderFinder(); }
    else if (t.hasAttribute("data-cmp")) { toggleCompare(t.getAttribute("data-cmp")); rerender(); }
    else if (t.hasAttribute("data-sort")) { state.sort = t.getAttribute("data-sort"); renderFinder(); }
    else if (t.hasAttribute("data-tip")) { state.kycHelp = !state.kycHelp; renderFacets(); }
    else if (t.hasAttribute("data-clear")) {
      var k = t.getAttribute("data-clear");
      if (k === "country") { state.country = ""; $("q-country").value = ""; }
      else if (k === "priority") { state.priority = ""; $("q-priority").value = ""; state.sort = "featured"; }
      else if (k === "q") { state.q = ""; $("q").value = ""; }
      else if (k === "cb") state.minCb = 0;
      else { clearAll(); return; }
      renderFinder();
    }
    else if (t.hasAttribute("data-tab")) { cardPlan = +t.getAttribute("data-tab"); renderCard(BY_ID[location.hash.slice(6)]); }
    else if (t.hasAttribute("data-guide")) {
      GUIDES[+t.getAttribute("data-guide")].action[1]();
      scrollToFinder = true;
      if (location.hash) location.hash = ""; else route();
    }
    else if (t.hasAttribute("data-goto")) { var el = $(t.getAttribute("data-goto")); if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  });
  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "cmp-add" && t.value) { toggleCompare(t.value); renderCompare(); }
    else if (t.id === "cmp-diff") { state.diff = t.checked; renderCompare(); }
    else if (t.hasAttribute("data-plan")) { state.plans[t.getAttribute("data-plan")] = +t.value; saveCompare(); renderCompare(); }
  });
  document.addEventListener("click", function (e) {
    if (e.target.id === "cmp-copy") { copyLink(); return; }
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
  $("clear-filters").addEventListener("click", function () { clearAll(); });
  $("view-list").addEventListener("click", function () { state.layout = "list"; store.set("layout", "list"); renderFinder(); });
  $("view-grid").addEventListener("click", function () { state.layout = "grid"; store.set("layout", "grid"); renderFinder(); });
  $("rail-toggle").addEventListener("click", function () {
    var open = $("rail").classList.toggle("is-open");
    this.setAttribute("aria-expanded", open);
  });
  $("tray-clear").addEventListener("click", function () { state.compare = []; saveCompare(); renderTray(); rerender(); });
  function scrollWallet(dir) { var tr = $("wallet"); tr.scrollBy({ left: dir * tr.clientWidth * 0.8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  $("wallet-prev").addEventListener("click", function () { scrollWallet(-1); });
  $("wallet-next").addEventListener("click", function () { scrollWallet(1); });
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
  $("hero-meta").textContent = CARDS.length + " cards · " + planCount + " plans";
  $("faq").innerHTML = HOME_FAQ.map(function (f) { return '<details class="qa"><summary>' + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>"; }).join("");
  route();
})();

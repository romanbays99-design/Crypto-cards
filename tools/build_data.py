#!/usr/bin/env python3
"""Turn data/cards.csv (the site's Google Sheet export) and data/profiles.json
(per-card Q&A) into assets/data.js, the single data file the pages read.

Usage: python3 tools/build_data.py
"""
import csv, json, re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
COUNTRIES = ["United States", "United Kingdom", "Germany", "France", "Canada", "Australia",
             "Brazil", "India", "Japan", "Singapore", "UAE", "Nigeria"]
IMG = {"ether.fi": "etherfi", "metamaskcard": "metamask", "coinbasecard": "coinbase",
       "1inchcard": "1inch", "redotpay": "redotap", "solcard": "solcardcc"}
SOURCES = [("SRC_PRICING_FEES_LIMITS", "Pricing, fees and limits"), ("SRC_KYC_LEVELS", "KYC levels"),
           ("SRC_TOKENS_NETWORKS", "Tokens and networks"), ("SRC_MOBILEPAY", "Apple Pay / Google Pay"),
           ("SRC_AVAILABILITY_RESIDENCY", "Country availability"),
           ("SRC_PHYSICAL_SHIPPING_COUNTRIES", "Physical card shipping"),
           ("SRC_USD_BANK_TRANSFER", "Bank transfer"), ("SRC_SEPA_HELP", "SEPA"), ("SRC_SWIFT_HELP", "SWIFT"),
           ("SRC_CUSTODY_TERMS", "Custody terms"), ("YIELD_source", "Yield")]
PLAN_FIELDS = {  # output key -> sheet column
    "fee": "Plan fee/Requirements", "rewards": "Rewards", "network": "Network", "cardType": "Card type",
    "fx": "FX fee (card spend)", "atmFee": "ATM fee", "atmLimits": "ATM limits", "spendLimits": "Spend limits",
    "virtualIssue": "Virtual card issue", "physicalIssue": "Physical card issue", "shipping": "Physical shipping",
    "extraVirtual": "Extra virtual cards", "extraPhysical": "Extra physical cards", "maxCards": "Max cards",
    "topupCrypto": "Top up: stablecoins / crypto", "topupBank": "Top up: bank transfer",
    "bankRails": "Bank rails (bank transfer)", "sepa": "SEPA", "swift": "SWIFT", "iban": "IBAN",
    "applePay": "Apple Pay", "googlePay": "Google Pay", "baseCurrency": "Base currency",
    "currencies": "Account currencies", "currenciesNote": "Account currencies note",
    "availability": "Availability (residency)", "yieldNote": "YIELD (short)",
}


def clean(v):
    v = re.sub(r"[ \t]+", " ", (v or "").strip())
    return "" if v.upper() in ("NO INFO", "N/A", "-") else v


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def pcts(text):
    return [float(x) for x in re.findall(r"(\d+(?:\.\d+)?)\s*%", text)]


def cashback_max(text):
    """Highest headline reward rate in the text, or None when there is no cashback."""
    t = text.lower()
    if not t or re.match(r"no\b", t) or "no personal cashback" in t:
        return None
    p = pcts(text)
    return max(p) if p else None


def fx_worst(text):
    p = pcts(text)
    return max(p) if p else None


def is_free(text):
    t = text.lower().strip()
    return bool(re.match(r"(free|[$£€]\s?0(?![\d.,])|eur 0)", t)) and "/" not in t.replace("$0/mo", "")


def tri(v):
    v = clean(v).lower()
    if v.startswith("yes"): return "yes"
    if v.startswith("no"): return "no"
    if v: return "partial"
    return ""


def main():
    rows = list(csv.DictReader(open(ROOT / "data/cards.csv", encoding="utf-8")))
    profiles = json.load(open(ROOT / "data/profiles.json", encoding="utf-8"))
    cards, order = {}, []
    for r in rows:
        name = r["Provider"].strip()
        if name not in cards:
            key = name.lower().replace(" ", "")
            img = "kazepay" if "kaze" in key else IMG.get(key, key)
            prof = profiles.get(name) or {}
            cards[name] = {
                "id": slug(name), "name": name, "product": clean(r["Product"]) or name, "img": img,
                "tags": [t.strip() for t in r["Tags"].split(",") if t.strip()],
                "link": clean(r["LINK"]), "promo": clean(r["POPUP_TEXT"]), "promoCode": clean(r["PROMO_CODE"]),
                "benefit": clean(r["Benefit"]), "ios": clean(r["IOS_LINK"]), "android": clean(r["ANDROID_LINK"]),
                "updated": prof.get("updatedAt", ""),
                "faq": [{"q": q["question"], "a": q["answer"],
                         "src": [u.strip() for u in (q.get("sourceUrl") or "").split("|") if u.strip()]}
                        for q in prof.get("questions", [])],
                "sources": [{"label": lab, "url": u.strip()} for col, lab in SOURCES
                            for u in clean(r.get(col, "")).split(";") if u.strip().startswith("http")],
                "countries": {c: tri(r[c]) for c in COUNTRIES}, "global": tri(r["Other/Global"]),
                "plans": [],
            }
            order.append(name)
        plan = {k: clean(r[col]) for k, col in PLAN_FIELDS.items()}
        kyc = clean(r["KYC required"]).lower()
        plan.update({
            "name": clean(r["Plan"]) or "Standard", "default": r["Default plan"].strip().upper() == "YES",
            "kyc": "light" if "light" in kyc else "none" if kyc.startswith("no") else "full",
            "custody": "non-custodial" if "non" in r["Wallet type"].lower() else "custodial",
            "cashback": cashback_max(clean(r["Rewards"])), "fxWorst": fx_worst(clean(r["FX fee (card spend)"])),
            "free": is_free(clean(r["Plan fee/Requirements"])),
        })
        cards[name]["plans"].append({k: v for k, v in plan.items() if v not in ("", None)})
    out = [cards[n] for n in order]
    for c in out:
        c["plans"].sort(key=lambda p: not p.get("default"))
    js = "window.CC_DATA=" + json.dumps({"countries": COUNTRIES, "cards": out}, ensure_ascii=False,
                                        separators=(",", ":")) + ";\n"
    (ROOT / "assets/data.js").write_text(js, encoding="utf-8")
    print(f"{len(out)} cards, {sum(len(c['plans']) for c in out)} plans -> assets/data.js ({len(js)//1024} KB)")


if __name__ == "__main__":
    main()

# Things to verify or fill in before the final

Open `index.html?verify` or `pitch.html?verify` to see every spot outlined on the page.

## Contacts (`CONTACTS` in index.html). Only `verified:true` channels appear on the site.
Verified on the departments' own websites on 24 Oct 2026. Re-check before the final:
- [ ] GBA phone **1533**: seen on bbmp.gov.in ("GBA - Greater Bengaluru Authority") via search index; the site refused direct connections
- [ ] BWSSB phone **1916** and online complaint form `bwssb.karnataka.gov.in/258/lodge-complaint/kn`
- [ ] BESCOM phone **1912**, WhatsApp **9449844640**, email **helpline@bescom.co.in** (Contact Us page shows no "last updated" date)
- [ ] Traffic Police WhatsApp **9480801800**, X **@blrcitytraffic**, online complaint form `btp.karnataka.gov.in/complaint/kn`

Not verified, so hidden. Fill in from an official source to switch on one-tap sending:
- [ ] **GBA:** complaint WhatsApp, complaint email, X handle, Sahaaya 2.0 web link. Without one of these, GBA complaints fall back to "copy and call 1533"
- [ ] **BWSSB:** WhatsApp (8762228888 appears in Deccan Herald notices, not on BWSSB's site), email, X
- [ ] **BESCOM:** X @NammaBESCOM (not linked from BESCOM's site), online complaint form URL
- [ ] **Traffic Police:** a non-emergency helpline, email
- [ ] **City corporation emails** for CC (`CORP_CONTACTS`): all five
- [ ] Officer titles used in letters (`escTitle`, `escHint`, `pioOffice`) for each department
- [ ] RTI fee (**Rs 10**) and accepted payment modes in Karnataka

## Concierge filing
- [ ] `CONFIG.conciergeFiling` is **off**. Switch it on only when someone can file requests from `LEAD`'s inbox within 24 hours

## City corporations
- [ ] Official names of the five corporations (`CORPS`)
- [ ] Every locality in `CORP_LOOKUP`. It's a best-guess list, shown to users as "likely"
- [ ] `ZONE_MAP_URL`: the official GBA zone map. The link stays hidden until it's set

## Pitch page claims
- [ ] Date of the BBMP → GBA and five-corporation transition (2025)
- [ ] Corporation elections "due by December 2026"
- [ ] GBA's announced single-window complaint system

## Placeholders (real numbers only; each section hides itself while empty)
- [ ] `PROOF.complaints`, `PROOF.fixed`, `PROOF.societies` in **both** index.html and pitch.html
- [ ] `PROOF.caseStudy` in index.html: title, place, dates, before/after photo URLs, quote
- [ ] Pricing (₹999/month) and running-cost estimates are hypotheses. Keep the "may change" wording until validated

## Community board
- [ ] Create the Firebase project and paste its config into `const FIREBASE` (see FIREBASE-SETUP.md)
- [ ] Publish `firestore.rules` and add `inesh1681.github.io` to Firebase authorized domains
- [ ] Decide who moderates posts, and check the Firestore console regularly

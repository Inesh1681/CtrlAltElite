# Things to verify or fill in before the final

Open `index.html?verify` or `pitch.html?verify` to see every spot outlined on the page.

## Contacts (`CONTACTS` in index.html; all `verified:false`)
- [ ] GBA helpline **1533** and the **Sahaaya 2.0** app still accept complaints after the 2025 restructuring
- [ ] BWSSB helpline **1916**
- [ ] BESCOM helpline **1912** and the **@NammaBESCOM** X handle
- [ ] Traffic Police: a real **non-emergency** helpline (none is shown now; 112 is used only as the emergency number). Confirm **@blrcitytraffic**
- [ ] Any **WhatsApp** numbers. The "Send on WhatsApp" button appears only for a contact with `whatsapp` set **and** `verified:true`
- [ ] Officer titles used in letters: `escTitle`, `escHint`, `pioOffice` for each department
- [ ] RTI fee (**Rs 10**) and accepted payment modes in Karnataka

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

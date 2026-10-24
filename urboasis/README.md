# UrbOasis Bengaluru

A civic complaint desk for Bengaluru residents. It routes a street-level problem to the agency that
fixes it (GBA, BWSSB, BESCOM or Traffic Police), writes the complaint, and then tells the resident
when to follow up, when to escalate and when to file an RTI, with each document ready to copy or print.

## What it does

- **Report in four steps:** category (English + Kannada), pin on the map (tap, GPS, place search, or
  the GPS tag inside a photo), landmark and photo, then a generated complaint with a strength score.
- **Sends it for you, in one tap:** "Send it for me" opens the department's official WhatsApp, email,
  X or complaint form with the complaint filled in. Only channels verified on the department's own
  website are used (see `CONTACTS`). Follow-ups and escalations go the same way. An optional
  "Let the UrbOasis team file it" mode is behind `CONFIG.conciergeFiling`.
- **Tracks every complaint against a fix window** per category, and moves it through
  *Not filed → Waiting → Follow up → Escalate → RTI → Fixed*.
- **Writes the documents:** follow-up, escalation letter addressed to the right officer, X post, and
  an RTI application under Section 6(1) with the five questions that get a written answer.
- **Community board:** a public list of issues ranked by resident votes (one vote per Google account,
  enforced by Firestore rules), with a map, filters by department and city corporation, and a printable
  top-issues list for the ward office. Letters quote the vote count. Needs a Firebase project, see
  [FIREBASE-SETUP.md](FIREBASE-SETUP.md). Until then it shows a labelled preview.
- **Neighbour co-signing:** a share link (WhatsApp, native share with photo, or copy) opens the same
  complaint pre-filled so neighbours can file their own.
- **Private by design:** no account and no server. Data lives in `localStorage`, photos in IndexedDB,
  re-encoded so their location metadata is removed. JSON backup/restore and CSV export.

## Run locally

It's two static files: `index.html` (the app) and `pitch.html` (for judges and investors). From the repo folder, serve it with any static server, for example:

```bash
npx serve .
```

Deploy by uploading the folder to Vercel, Netlify, GitHub Pages or Cloudflare Pages. It needs
HTTPS for "Use my location".

Everything that still needs checking against official sources is listed in [TODO-VERIFY.md](TODO-VERIFY.md).

## Before going public

- Re-check every channel in `CONTACTS` (each has a `source` and `verified` flag) against the department's
  own site. The GBA restructuring in 2025 may change channels.
- Fix windows (`days` in `CATS`) are guidelines, not official service levels. The page says so.
- Address search and lookup use the public Nominatim API (OpenStreetMap). Its usage policy allows
  light use only, so put a geocoder you control behind it if traffic grows.
- Map tiles come from OpenFreeMap (free, no key).
